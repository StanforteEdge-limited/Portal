import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or } from 'drizzle-orm';
import { Decimal } from 'decimal.js';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { toBigInt } from '$common/utils/ids';
import { NotificationsService } from '$modules/notifications/notifications.service';
import { CreateAttendanceCorrectionDto } from '$modules/hr/hr/dto/create-attendance-correction.dto';
import { CreateAttendanceExceptionDto } from '$modules/hr/hr/dto/create-attendance-exception.dto';
import { ReviewAttendanceCorrectionDto } from '$modules/hr/hr/dto/review-attendance-correction.dto';
import { ReviewAttendanceExceptionDto } from '$modules/hr/hr/dto/review-attendance-exception.dto';
import { UpsertOfficeLocationDto } from '$modules/hr/hr/dto/upsert-office-location.dto';
import {
  attendanceCorrection,
  attendanceDaily,
  attendanceEntry,
  attendanceException,
  attendanceHoliday,
  employeeMeta,
  employeeProfile,
} from './model';
import { officeLocation, organization, organizationOfficeLocation, profileOrganization } from '$modules/directory/organizations/model';
import { profile } from '$modules/identity/users/model';
import { group, groupUser } from '$modules/communication/groups/model';
import { policy } from '$modules/requests/policies/model';
import { requestInstance, requestType } from '$modules/requests/requests/model';

type AttendanceMode = 'onsite' | 'remote' | 'field';
type GeofenceStatus = 'inside' | 'outside' | 'unknown' | 'not_applicable';
type DailyStatus = 'present' | 'late' | 'absent' | 'leave' | 'holiday' | 'off_day' | 'field' | 'remote' | 'exception_pending' | 'corrected';

type AttendancePolicy = {
  start_time: string;
  end_time: string;
  grace_minutes: number;
  max_future_minutes: number;
  max_past_days: number;
  allow_multiple_open_sessions: boolean;
  earliest_clock_in_minutes_before_start: number;
  latest_clock_out_minutes_after_end: number;
  onsite_weekdays: number[];
  remote_weekdays: number[];
  required_extra_onsite_day_count: number;
  enforce_expected_mode_clock_in: boolean;
  enforce_clock_out_match_clock_in_mode: boolean;
};

type ProfileContext = {
  id: bigint;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  primaryOrganizationId: bigint | null;
  primaryTeamId: bigint | null;
  workMode: string | null;
  organizationIds: bigint[];
  employeeMeta: Record<string, unknown>;
};

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly notifications: NotificationsService,
  ) {}

private tenantCond(column: any): SQL | undefined {
    const tid = this.tenantContext.currentTenantId();
    return tid ? eq(column, tid) : undefined;
  }

  async clockIn(
    userId: string,
    req: any,
    payload?: {
      source?: string;
      at?: string;
      attendance_mode?: string;
      office_location_id?: string;
      latitude?: number;
      longitude?: number;
    }
  ) {
    const actorId = toBigInt(userId);
    const tid = this.tenantContext.currentTenantId();
    const at = payload?.at ? new Date(payload.at) : new Date();
    if (Number.isNaN(at.getTime())) throw new BadRequestException('Invalid attendance time');
    const profile = await this.getProfileContext(actorId);
    const policy = await this.resolveAttendancePolicy(actorId, profile);
    this.assertTimestampAllowed(at, policy, payload?.source);

    const workDate = this.toWorkDate(at);
    const entries = await this.db.client
      .select()
      .from(attendanceEntry)
      .where(and(eq(attendanceEntry.userId, actorId), eq(attendanceEntry.workDate, workDate), this.tenantCond(attendanceEntry.tenantId)))
      .orderBy(asc(attendanceEntry.entryAt));
    const openClockIn = this.getOpenClockIn(entries);
    if (openClockIn && !policy.allow_multiple_open_sessions) {
      throw new BadRequestException('You are already clocked in for this day');
    }
    const earliestClockIn = new Date(
      this.atTime(workDate, policy.start_time).getTime() - policy.earliest_clock_in_minutes_before_start * 60000
    );
    if ((payload?.source ?? 'web') !== 'import' && at < earliestClockIn) {
      throw new BadRequestException('Clock in is too early for this schedule');
    }

    const expectedMode = this.resolveExpectedMode(profile, workDate, policy);
    const effectiveMode = this.resolveSubmittedMode(payload?.attendance_mode, profile, workDate, policy);
    if (policy.enforce_expected_mode_clock_in && effectiveMode !== expectedMode) {
      throw new BadRequestException(
        `Clock in mode must match expected mode (${expectedMode})`
      );
    }
    const officeLocation = await this.resolveOfficeLocationForAttendance({
      profile,
      requestedOfficeLocationId: payload?.office_location_id,
      attendanceMode: effectiveMode
    });
    const geofenceStatus = this.evaluateGeofence({
      attendanceMode: effectiveMode,
      officeLocation,
      latitude: payload?.latitude,
      longitude: payload?.longitude
    });

    await this.db.client.insert(attendanceEntry).values({
      userId: actorId,
      entryType: 'clock_in',
      entryAt: at,
      workDate,
      attendanceMode: effectiveMode,
      officeLocationId: officeLocation?.id ?? null,
      latitude: payload?.latitude != null ? String(payload.latitude) : null,
      longitude: payload?.longitude != null ? String(payload.longitude) : null,
      geofenceStatus,
      source: payload?.source ?? 'web',
      createdBy: actorId,
      metadata: {
        ip: this.getIp(req),
        user_agent: this.getUserAgent(req)
      },
      ...(tid ? { tenantId: tid } : {})
    });

    const daily = await this.recomputeDay(actorId, workDate, profile, policy);

    this.sendAttendanceNotification(actorId, 'clock-in', at, effectiveMode).catch((err) =>
      this.logger.warn(`Failed to send clock-in notification: ${err.message}`)
    );

    return { success: true, daily };
  }

  async clockOut(
    userId: string,
    req: any,
    payload?: {
      source?: string;
      at?: string;
      attendance_mode?: string;
      office_location_id?: string;
      latitude?: number;
      longitude?: number;
    }
  ) {
    const actorId = toBigInt(userId);
    const tid = this.tenantContext.currentTenantId();
    const at = payload?.at ? new Date(payload.at) : new Date();
    if (Number.isNaN(at.getTime())) throw new BadRequestException('Invalid attendance time');
    const profile = await this.getProfileContext(actorId);
    const policy = await this.resolveAttendancePolicy(actorId, profile);
    this.assertTimestampAllowed(at, policy, payload?.source);
    const workDate = this.toWorkDate(at);
    const lookbackStart = this.toWorkDate(
      new Date(Date.now() - policy.max_past_days * 24 * 60 * 60000)
    );

    const entries = await this.db.client
      .select()
      .from(attendanceEntry)
      .where(and(
        eq(attendanceEntry.userId, actorId),
        gte(attendanceEntry.workDate, lookbackStart),
        lte(attendanceEntry.workDate, workDate),
        this.tenantCond(attendanceEntry.tenantId)
      ))
      .orderBy(desc(attendanceEntry.workDate), asc(attendanceEntry.entryAt));

    const todayEntries = entries.filter(
      (e) => this.workDateKey(e.workDate) === this.workDateKey(workDate)
    );
    const openClockIn = this.getOpenClockIn(todayEntries)
      ?? (todayEntries.length === 0 ? this.getOpenClockIn(entries) : null);
    if (!openClockIn) {
      throw new BadRequestException('No open clock-in found for this day');
    }

    const effectiveMode = payload?.attendance_mode
      ? this.resolveSubmittedMode(payload.attendance_mode, profile, workDate, policy)
      : openClockIn.attendanceMode === 'onsite' ||
          openClockIn.attendanceMode === 'remote' ||
          openClockIn.attendanceMode === 'field'
        ? (openClockIn.attendanceMode as AttendanceMode)
        : this.resolveExpectedMode(profile, workDate, policy);

    let resolvedOfficeLocation: { id: bigint; latitude: Decimal | number | string; longitude: Decimal | number | string; radiusMeters: number } | null = null;
    if (payload?.office_location_id && effectiveMode === 'onsite') {
      resolvedOfficeLocation = await this.resolveOfficeLocationForAttendance({
        profile,
        requestedOfficeLocationId: payload.office_location_id,
        attendanceMode: effectiveMode
      });
    } else if (openClockIn.officeLocationId && effectiveMode === 'onsite') {
      const rows = await this.db.client
        .select()
        .from(officeLocation)
        .where(eq(officeLocation.id, openClockIn.officeLocationId))
        .limit(1);
      resolvedOfficeLocation = rows[0] ?? null;
    }
    const geofenceStatus = this.evaluateGeofence({
      attendanceMode: effectiveMode,
      officeLocation: resolvedOfficeLocation,
      latitude: payload?.latitude,
      longitude: payload?.longitude
    });

    await this.db.client.insert(attendanceEntry).values({
      userId: actorId,
      entryType: 'clock_out',
      entryAt: at,
      workDate: openClockIn.workDate ?? workDate,
      attendanceMode: effectiveMode,
      officeLocationId: resolvedOfficeLocation?.id ?? openClockIn.officeLocationId ?? null,
      latitude: payload?.latitude != null ? String(payload.latitude) : null,
      longitude: payload?.longitude != null ? String(payload.longitude) : null,
      geofenceStatus,
      source: payload?.source ?? 'web',
      createdBy: actorId,
      metadata: {
        ip: this.getIp(req),
        user_agent: this.getUserAgent(req)
      },
      ...(tid ? { tenantId: tid } : {})
    });

    const daily = await this.recomputeDay(actorId, openClockIn.workDate ?? workDate, profile, policy);

    this.sendAttendanceNotification(actorId, 'clock-out', at, effectiveMode).catch((err) =>
      this.logger.warn(`Failed to send clock-out notification: ${err.message}`)
    );

    return { success: true, daily };
  }

  async myAttendance(userId: string, query: Record<string, any>) {
    const actorId = toBigInt(userId);
    const profile = await this.getProfileContext(actorId);
    const from = query.from ? new Date(String(query.from)) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
    const to = query.to ? new Date(String(query.to)) : new Date();
    const fromDate = this.toWorkDate(from);
    const toDate = this.toWorkDate(to);

    const [entries, daily, policy, corrections, exceptions, officeLocations] = await Promise.all([
      this.db.client
        .select()
        .from(attendanceEntry)
        .where(and(
          eq(attendanceEntry.userId, actorId),
          gte(attendanceEntry.workDate, fromDate),
          lte(attendanceEntry.workDate, toDate),
          this.tenantCond(attendanceEntry.tenantId)
        ))
        .orderBy(desc(attendanceEntry.workDate), asc(attendanceEntry.entryAt)),
      this.db.client
        .select()
        .from(attendanceDaily)
        .where(and(
          eq(attendanceDaily.userId, actorId),
          gte(attendanceDaily.workDate, fromDate),
          lte(attendanceDaily.workDate, toDate),
          this.tenantCond(attendanceDaily.tenantId)
        ))
        .orderBy(desc(attendanceDaily.workDate)),
      this.resolveAttendancePolicy(actorId, profile),
      this.db.client
        .select()
        .from(attendanceCorrection)
        .where(and(
          eq(attendanceCorrection.userId, actorId),
          gte(attendanceCorrection.workDate, fromDate),
          lte(attendanceCorrection.workDate, toDate),
          this.tenantCond(attendanceCorrection.tenantId)
        ))
        .orderBy(desc(attendanceCorrection.requestedAt)),
      this.db.client
        .select()
        .from(attendanceException)
        .where(and(
          eq(attendanceException.userId, actorId),
          gte(attendanceException.workDate, fromDate),
          lte(attendanceException.workDate, toDate),
          this.tenantCond(attendanceException.tenantId)
        ))
        .orderBy(desc(attendanceException.createdAt)),
      this.listAllowedOfficeLocations(profile)
    ]);

    const correctionByDate = new Map<string, any[]>();
    for (const row of corrections) {
      const key = this.workDateKey(row.workDate);
      const list = correctionByDate.get(key) ?? [];
      list.push(this.serializeCorrection(row));
      correctionByDate.set(key, list);
    }
    const exceptionByDate = new Map<string, any[]>();
    for (const row of exceptions) {
      const key = this.workDateKey(row.workDate);
      const list = exceptionByDate.get(key) ?? [];
      list.push(this.serializeException(row));
      exceptionByDate.set(key, list);
    }

    const openClockIn = this.getOpenClockIn(entries);
    const action = this.resolveCurrentAction({ entries, policy, now: new Date() });
    const todayWorkDate = this.workDateKey(new Date());
    const todayDaily = daily.find((row) => this.workDateKey(row.workDate) === todayWorkDate);
    return {
      entries: entries.map((row) => this.serializeEntry(row)),
      daily: daily.map((row) => ({
        ...this.serializeDaily(row),
        corrections: correctionByDate.get(this.workDateKey(row.workDate)) ?? [],
        exceptions: exceptionByDate.get(this.workDateKey(row.workDate)) ?? []
      })),
      corrections: corrections.map((row) => this.serializeCorrection(row)),
      exceptions: exceptions.map((row) => this.serializeException(row)),
      office_locations: officeLocations,
      current_state: {
        is_clocked_in: Boolean(openClockIn),
        last_clock_in_at: openClockIn?.entryAt ?? null,
        last_clock_in_work_date: openClockIn?.workDate ? this.workDateKey(openClockIn.workDate) : null,
        can_clock_in: action.canClockIn,
        can_clock_out: action.canClockOut,
        reason: action.reason
      },
      today: todayDaily ? this.serializeDaily(todayDaily) : null,
      policy: {
        start_time: policy.start_time,
        end_time: policy.end_time,
        grace_minutes: policy.grace_minutes,
        onsite_weekdays: policy.onsite_weekdays,
        remote_weekdays: policy.remote_weekdays,
        required_extra_onsite_day_count: policy.required_extra_onsite_day_count
      }
    };
  }

  async summary(query: Record<string, any>) {
    const from = query.from ? new Date(String(query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(String(query.to)) : new Date();
    const fromDate = this.toWorkDate(from);
    const toDate = this.toWorkDate(to);

    const rows = await this.db.client
      .select({ status: attendanceDaily.status, value: count() })
      .from(attendanceDaily)
      .where(and(
        gte(attendanceDaily.workDate, fromDate),
        lte(attendanceDaily.workDate, toDate),
        this.tenantCond(attendanceDaily.tenantId)
      ))
      .groupBy(attendanceDaily.status);

    const summary: Record<string, number> = {};
    for (const row of rows) summary[row.status] = Number(row.value ?? 0);
    return {
      from: fromDate,
      to: toDate,
      by_status: summary
    };
  }

  async records(query: Record<string, any>) {
    const from = query.from ? new Date(String(query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(String(query.to)) : new Date();
    const fromDate = this.toWorkDate(from);
    const toDate = this.toWorkDate(to);
    const status = query.status ? String(query.status).trim().toLowerCase() : '';
    const userId = query.user_id ? toBigInt(String(query.user_id)) : null;
    const search = query.search ? String(query.search).trim().toLowerCase() : '';
    const page = query.page ? Math.max(1, parseInt(String(query.page), 10)) : 1;
    const limit = query.per_page ? Math.max(1, parseInt(String(query.per_page), 10)) : 25;
    const skip = (page - 1) * limit;

    const orgId = query.org_id ? toBigInt(String(query.org_id)) : null;
    const teamId = query.team_id ? toBigInt(String(query.team_id)) : null;

const conds: SQL[] = [
      gte(attendanceDaily.workDate, fromDate),
      lte(attendanceDaily.workDate, toDate),
      ...(status ? [eq(attendanceDaily.status, status)] : []),
      ...(userId ? [eq(attendanceDaily.userId, userId)] : []),
      this.tenantCond(attendanceDaily.tenantId)
    ];

    if (orgId) {
      const orgUsers = await this.db.client
        .select({ profileId: profileOrganization.profileId })
        .from(profileOrganization)
        .where(and(eq(profileOrganization.organizationId, orgId), this.tenantCond(profileOrganization.tenantId)));
      conds.push(inArray(attendanceDaily.userId, orgUsers.map((row) => row.profileId)));
    }
    if (teamId) {
      const teamUsers = await this.db.client
        .select({ userId: groupUser.userId })
        .from(groupUser)
        .innerJoin(group, eq(groupUser.groupId, group.id))
        .where(and(eq(groupUser.groupId, teamId), this.tenantCond(group.tenantId)));
      conds.push(inArray(attendanceDaily.userId, teamUsers.map((row) => row.userId)));
    }
    const where = and(...conds);

    const [total, dailyRows] = await Promise.all([
      this.db.client.select({ value: count() }).from(attendanceDaily).where(where),
      this.db.client
        .select()
        .from(attendanceDaily)
        .where(where)
        .orderBy(desc(attendanceDaily.workDate), asc(attendanceDaily.userId))
        .limit(limit)
        .offset(skip)
    ]);

    if (dailyRows.length === 0) {
      return paginatedResponse([], { page, per_page: limit, total: 0 });
    }

    const userIds = Array.from(new Set<string>(dailyRows.map((row) => row.userId.toString())));
    const profiles = await this.db.client
      .select({ id: profile.id, email: profile.email, username: profile.username, firstName: profile.firstName, lastName: profile.lastName })
      .from(profile)
      .where(userIds.length ? inArray(profile.id, userIds.map((id) => toBigInt(id))) : undefined);
    const profileMap = new Map(
      profiles.map((profileRow) => [
        profileRow.id.toString(),
        {
          id: profileRow.id.toString(),
          email: profileRow.email,
          username: profileRow.username,
          first_name: profileRow.firstName,
          last_name: profileRow.lastName
        }
      ])
    );

    const rows = dailyRows
      .map((row) => ({
        ...this.serializeDaily(row),
        profile: profileMap.get(row.userId.toString()) ?? null
      }))
      .filter((row) => {
        if (!search) return true;
        const name = `${row.profile?.first_name ?? ''} ${row.profile?.last_name ?? ''}`.trim().toLowerCase();
        return (
          name.includes(search) ||
          String(row.profile?.email ?? '').toLowerCase().includes(search) ||
          String(row.profile?.username ?? '').toLowerCase().includes(search)
        );
      });

    const filteredTotal = search
      ? rows.length
      : Number(total[0]?.value ?? 0);

    return paginatedResponse(rows, { page, per_page: limit, total: filteredTotal });
  }

  async getDailyRecord(userId: string, workDate: string) {
    const userIdBigInt = toBigInt(userId);
    const workDateValue = this.toWorkDate(new Date(workDate));

    const dailyRows = await this.db.client
      .select()
      .from(attendanceDaily)
      .where(and(
        eq(attendanceDaily.userId, userIdBigInt),
        eq(attendanceDaily.workDate, workDateValue),
        this.tenantCond(attendanceDaily.tenantId)
      ))
      .limit(1);
    const daily = dailyRows[0] ?? null;

    if (!daily) {
      return null;
    }

    const entries = await this.db.client
      .select()
      .from(attendanceEntry)
      .where(and(
        eq(attendanceEntry.userId, userIdBigInt),
        eq(attendanceEntry.workDate, workDateValue),
        this.tenantCond(attendanceEntry.tenantId)
      ))
      .orderBy(asc(attendanceEntry.entryAt));

    const profileRows = await this.db.client
      .select({ id: profile.id, email: profile.email, username: profile.username, firstName: profile.firstName, lastName: profile.lastName })
      .from(profile)
      .where(eq(profile.id, userIdBigInt))
      .limit(1);
    const profileRow = profileRows[0] ?? null;

    return {
      daily: this.serializeDaily(daily),
      profile: profileRow ? {
        id: profileRow.id.toString(),
        email: profileRow.email,
        username: profileRow.username,
        first_name: profileRow.firstName,
        last_name: profileRow.lastName
      } : null,
      entries: entries.map(e => ({
        id: e.id.toString(),
        user_id: e.userId.toString(),
        work_date: e.workDate,
        type: e.entryType,
        mode: e.attendanceMode,
        timestamp: e.entryAt,
        latitude: e.latitude ? Number(e.latitude) : null,
        longitude: e.longitude ? Number(e.longitude) : null,
        location: e.officeLocationId ? undefined : undefined,
        source: e.source,
        verified: e.geofenceStatus,
        office_location_id: e.officeLocationId ? e.officeLocationId.toString() : null
      }))
    };
  }

  async listOfficeLocations(query: Record<string, any>) {
    const organizationId = query.organization_id ? toBigInt(String(query.organization_id)) : null;
    const status = query.is_active === undefined ? null : String(query.is_active) === 'true';
    const search = query.search ? String(query.search).trim() : '';

    const conds: SQL[] = [];
    if (status !== null) conds.push(eq(officeLocation.isActive, status));
    if (search) {
      conds.push(or(
        ilike(officeLocation.name, `%${search}%`),
        ilike(officeLocation.address, `%${search}%`)
      ));
    }
    if (organizationId) {
      const linked = await this.orgLinkedLocationIds([organizationId]);
      conds.push(inArray(officeLocation.id, linked));
    }

    const rows = await this.db.client
      .select()
      .from(officeLocation)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(officeLocation.isActive), asc(officeLocation.name));

    const withOrganizations = await this.attachOfficeLocationOrganizations(rows);

    return {
      data: withOrganizations.map((row) => this.serializeOfficeLocation(row))
    };
  }

  async getAttendanceStatus(userId: string) {
    const actorId = toBigInt(userId);
    const profile = await this.getProfileContext(actorId);
    const policy = await this.resolveAttendancePolicy(actorId, profile);
    const today = this.toWorkDate(new Date());
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const entries = await this.db.client
      .select()
      .from(attendanceEntry)
      .where(and(
        eq(attendanceEntry.userId, actorId),
        eq(attendanceEntry.workDate, today),
        this.tenantCond(attendanceEntry.tenantId)
      ))
      .orderBy(desc(attendanceEntry.entryAt));

    const openClockIn = entries.find(e => e.entryType === 'clock_in' && !entries.some(out => out.entryType === 'clock_out' && out.entryAt > e.entryAt));
    const lastEntry = entries[0] ?? null;

    const now = new Date();
    const todayStartTime = this.atTime(today, policy.start_time);
    const todayEndTime = this.atTime(today, policy.end_time);
    const earliestClockIn = new Date(todayStartTime.getTime() - policy.earliest_clock_in_minutes_before_start * 60000);
    const latestClockOut = new Date(todayEndTime.getTime() + policy.latest_clock_out_minutes_after_end * 60000);

    const response = {
      current_state: {
        is_clocked_in: !!openClockIn,
        last_clock_in_at: openClockIn?.entryAt?.toISOString() ?? null,
        last_clock_in_work_date: openClockIn?.workDate?.toISOString().slice(0, 10) ?? null,
        can_clock_in: !openClockIn && now >= earliestClockIn && now <= latestClockOut,
        can_clock_out: !!openClockIn,
        reason: null as string | null,
      },
      policy: {
        start_time: policy.start_time,
        end_time: policy.end_time,
        onsite_weekdays: policy.onsite_weekdays,
        remote_weekdays: policy.remote_weekdays,
      },
    };

    return response;
  }

  async createOfficeLocation(userId: string, dto: UpsertOfficeLocationDto) {
    const actorId = toBigInt(userId);
    const tid = this.tenantContext.currentTenantId();
    const organizationIds = this.uniqueBigInts(dto.organization_ids ?? []);
    const primaryOrganizationId = dto.primary_organization_id ? toBigInt(dto.primary_organization_id) : null;
    if (primaryOrganizationId && !organizationIds.some((id) => id === primaryOrganizationId)) {
      organizationIds.unshift(primaryOrganizationId);
    }

    const [row] = await this.db.client.insert(officeLocation).values({
      name: dto.name.trim(),
      address: dto.address?.trim() || null,
      latitude: dto.latitude != null ? String(dto.latitude) : null,
      longitude: dto.longitude != null ? String(dto.longitude) : null,
      radiusMeters: dto.radius_meters ?? 150,
      isActive: dto.is_active ?? true,
      createdBy: actorId,
      updatedBy: actorId
    }).returning();

    if (organizationIds.length) {
      await this.db.client.insert(organizationOfficeLocation).values(
        organizationIds.map((organizationId) => ({
          organizationId,
          officeLocationId: row.id,
          isPrimary: primaryOrganizationId ? organizationId === primaryOrganizationId : false,
          ...(tid ? { tenantId: tid } : {})
        }))
      ).returning();
    }

    const [completed] = await this.attachOfficeLocationOrganizations([row]);

    return { success: true, data: this.serializeOfficeLocation(completed) };
  }

  async updateOfficeLocation(userId: string, id: string, dto: UpsertOfficeLocationDto) {
    const actorId = toBigInt(userId);
    const tid = this.tenantContext.currentTenantId();
    const officeLocationId = toBigInt(id);
    const existingRows = await this.db.client
      .select()
      .from(officeLocation)
      .where(eq(officeLocation.id, officeLocationId))
      .limit(1);
    const existing = existingRows[0] ?? null;
    if (!existing) throw new NotFoundException('Office location not found');

    const organizationIds = dto.organization_ids ? this.uniqueBigInts(dto.organization_ids) : null;
    const primaryOrganizationId = dto.primary_organization_id ? toBigInt(dto.primary_organization_id) : null;
    if (organizationIds && primaryOrganizationId && !organizationIds.some((orgId) => orgId === primaryOrganizationId)) {
      organizationIds.unshift(primaryOrganizationId);
    }

    const row = await this.db.client.transaction(async (tx) => {
      if (organizationIds) {
        await tx.delete(organizationOfficeLocation)
          .where(and(eq(organizationOfficeLocation.officeLocationId, officeLocationId), this.tenantCond(organizationOfficeLocation.tenantId)));
      }
      const [updated] = await tx.update(officeLocation)
        .set({
          name: dto.name?.trim() || existing.name,
          address: dto.address === undefined ? existing.address : dto.address?.trim() || null,
          latitude: dto.latitude != null ? String(dto.latitude) : existing.latitude,
          longitude: dto.longitude != null ? String(dto.longitude) : existing.longitude,
          radiusMeters: dto.radius_meters ?? existing.radiusMeters,
          isActive: dto.is_active ?? existing.isActive,
          updatedBy: actorId
        })
        .where(eq(officeLocation.id, officeLocationId))
        .returning();
      if (organizationIds) {
        await tx.insert(organizationOfficeLocation).values(
          organizationIds.map((organizationId) => ({
            organizationId,
            officeLocationId,
            isPrimary: primaryOrganizationId ? organizationId === primaryOrganizationId : false,
            ...(tid ? { tenantId: tid } : {})
          }))
        ).returning();
      }
      return updated;
    });

    const [completed] = await this.attachOfficeLocationOrganizations([row]);

    return { success: true, data: this.serializeOfficeLocation(completed) };
  }

  async listCorrections(userId: string, query: Record<string, any>) {
    const actorId = toBigInt(userId);
    const status = query.status ? String(query.status).trim().toLowerCase() : undefined;
    const targetUserId = query.user_id ? toBigInt(String(query.user_id)) : undefined;
    const fromDate = query.from ? this.toWorkDate(new Date(String(query.from))) : undefined;
    const toDate = query.to ? this.toWorkDate(new Date(String(query.to))) : undefined;

    const page = query.page ? Math.max(1, parseInt(String(query.page), 10)) : 1;
    const limit = query.per_page ? Math.max(1, parseInt(String(query.per_page), 10)) : 25;
    const skip = (page - 1) * limit;

const conds: SQL[] = [this.tenantCond(attendanceCorrection.tenantId)];
    if (status) conds.push(eq(attendanceCorrection.status, status));
    if (targetUserId) conds.push(eq(attendanceCorrection.userId, targetUserId));
    if (fromDate) conds.push(gte(attendanceCorrection.workDate, fromDate));
    if (toDate) conds.push(lte(attendanceCorrection.workDate, toDate));
    if (String(query.mine) === 'true') {
      conds.push(or(
        eq(attendanceCorrection.requestedBy, actorId),
        eq(attendanceCorrection.reviewedBy, actorId)
      ));
    }
    const where = and(...conds);

    const [total, rows] = await Promise.all([
      this.db.client.select({ value: count() }).from(attendanceCorrection).where(where),
      this.db.client
        .select()
        .from(attendanceCorrection)
        .where(where)
        .orderBy(asc(attendanceCorrection.status), desc(attendanceCorrection.requestedAt))
        .limit(limit)
        .offset(skip)
    ]);

    const withIncludes = await this.attachCorrectionIncludes(rows);

    return paginatedResponse(
      withIncludes.map((row) => this.serializeCorrection(row)),
      { page, per_page: limit, total: Number(total[0]?.value ?? 0) }
    );
  }

  async createCorrection(userId: string, dto: CreateAttendanceCorrectionDto) {
    const actorId = toBigInt(userId);
    const workDate = this.toWorkDate(new Date(dto.work_date));
    const existingDailyRows = await this.db.client
      .select()
      .from(attendanceDaily)
      .where(and(
        eq(attendanceDaily.userId, actorId),
        eq(attendanceDaily.workDate, workDate),
        this.tenantCond(attendanceDaily.tenantId)
      ))
      .limit(1);
    const existingDaily = existingDailyRows[0] ?? null;
    const relevantEntry = dto.request_type === 'clock_in'
      ? (await this.db.client
          .select()
          .from(attendanceEntry)
          .where(and(
            eq(attendanceEntry.userId, actorId),
            eq(attendanceEntry.workDate, workDate),
            eq(attendanceEntry.entryType, 'clock_in'),
            this.tenantCond(attendanceEntry.tenantId)
          ))
          .orderBy(asc(attendanceEntry.entryAt))
          .limit(1))[0] ?? null
      : dto.request_type === 'clock_out'
        ? (await this.db.client
            .select()
            .from(attendanceEntry)
            .where(and(
              eq(attendanceEntry.userId, actorId),
              eq(attendanceEntry.workDate, workDate),
              eq(attendanceEntry.entryType, 'clock_out'),
              this.tenantCond(attendanceEntry.tenantId)
            ))
            .orderBy(desc(attendanceEntry.entryAt))
            .limit(1))[0] ?? null
        : (await this.db.client
            .select()
            .from(attendanceEntry)
            .where(and(
              eq(attendanceEntry.userId, actorId),
              eq(attendanceEntry.workDate, workDate),
              this.tenantCond(attendanceEntry.tenantId)
            ))
            .orderBy(desc(attendanceEntry.entryAt))
            .limit(1))[0] ?? null;

const [correction] = await this.db.client.insert(attendanceCorrection).values({
      userId: actorId,
      tenantId: this.tenantContext.currentTenantId() ?? null,
      attendanceDailyId: existingDaily?.id ?? null,
      attendanceEntryId: relevantEntry?.id ?? null,
      officeLocationId: relevantEntry?.officeLocationId ?? existingDaily?.officeLocationId ?? null,
      requestType: dto.request_type,
      requestedBy: actorId,
      reason: dto.reason.trim(),
      workDate,
      proposedAt: dto.proposed_at ? new Date(dto.proposed_at) : null,
      proposedMode: dto.proposed_mode ?? null,
      proposedOfficeLocationId: dto.proposed_office_location_id ? toBigInt(dto.proposed_office_location_id) : null,
      proposedLatitude: dto.proposed_latitude != null ? String(dto.proposed_latitude) : null,
      proposedLongitude: dto.proposed_longitude != null ? String(dto.proposed_longitude) : null,
      snapshotJson: {
        daily: existingDaily ? this.serializeDaily(existingDaily) : null,
        entry: relevantEntry ? this.serializeEntry(relevantEntry) : null
      }
    }).returning();

    return { success: true, data: this.serializeCorrection(correction) };
  }

  async approveCorrection(userId: string, id: string, dto: ReviewAttendanceCorrectionDto) {
    const actorId = toBigInt(userId);
    const correctionRows = await this.db.client
      .select()
      .from(attendanceCorrection)
      .where(and(eq(attendanceCorrection.id, id), this.tenantCond(attendanceCorrection.tenantId)))
      .limit(1);
    const correction = correctionRows[0] ?? null;
    if (!correction) throw new NotFoundException('Attendance correction not found');
    if (correction.status !== 'pending') throw new BadRequestException('Attendance correction is no longer pending');

    const profile = await this.getProfileContext(correction.userId);
    const policy = await this.resolveAttendancePolicy(correction.userId, profile);

    await this.db.client.transaction(async (tx) => {
if (correction.requestType === 'clock_in' || correction.requestType === 'clock_out') {
        if (!correction.proposedAt) throw new BadRequestException('Correction is missing the proposed time');
        const officeLocationRow = correction.proposedOfficeLocationId
          ? (await tx
              .select({ officeLocation })
              .from(officeLocation)
              .innerJoin(organizationOfficeLocation, eq(organizationOfficeLocation.officeLocationId, officeLocation.id))
              .where(and(eq(officeLocation.id, correction.proposedOfficeLocationId), this.tenantCond(organizationOfficeLocation.tenantId)))
              .limit(1))[0]?.officeLocation ?? null
          : null;
        await tx.insert(attendanceEntry).values({
          userId: correction.userId,
          tenantId: this.tenantContext.currentTenantId() ?? null,
          entryType: correction.requestType,
          entryAt: correction.proposedAt,
          workDate: correction.workDate,
          attendanceMode: correction.proposedMode ?? null,
          officeLocationId: correction.proposedOfficeLocationId ?? correction.officeLocationId,
          latitude: correction.proposedLatitude,
          longitude: correction.proposedLongitude,
          geofenceStatus: this.evaluateGeofence({
            attendanceMode: (correction.proposedMode as AttendanceMode | null) ?? 'onsite',
            officeLocation: officeLocationRow,
            latitude: correction.proposedLatitude ? Number(correction.proposedLatitude) : undefined,
            longitude: correction.proposedLongitude ? Number(correction.proposedLongitude) : undefined
          }),
          source: 'admin',
          createdBy: actorId,
          metadata: { correction_id: correction.id, approved_by: actorId.toString() }
        });
      } else {
const targetEntries = correction.attendanceEntryId
          ? await tx.select().from(attendanceEntry).where(and(eq(attendanceEntry.id, correction.attendanceEntryId), this.tenantCond(attendanceEntry.tenantId)))
          : await tx.select().from(attendanceEntry).where(and(
              eq(attendanceEntry.userId, correction.userId),
              eq(attendanceEntry.workDate, correction.workDate),
              this.tenantCond(attendanceEntry.tenantId)
            ));
        for (const entry of targetEntries) {
          const officeLocationRow = correction.proposedOfficeLocationId
            ? (await tx
                .select({ officeLocation })
                .from(officeLocation)
                .innerJoin(organizationOfficeLocation, eq(organizationOfficeLocation.officeLocationId, officeLocation.id))
                .where(and(eq(officeLocation.id, correction.proposedOfficeLocationId), this.tenantCond(organizationOfficeLocation.tenantId)))
                .limit(1))[0]?.officeLocation ?? null
            : null;
          await tx.update(attendanceEntry)
            .set({
              attendanceMode: correction.proposedMode ?? entry.attendanceMode,
              officeLocationId:
                correction.proposedOfficeLocationId === null || correction.proposedOfficeLocationId === undefined
                  ? entry.officeLocationId
                  : correction.proposedOfficeLocationId,
              latitude: correction.proposedLatitude ?? entry.latitude,
              longitude: correction.proposedLongitude ?? entry.longitude,
              geofenceStatus: correction.proposedMode
                ? this.evaluateGeofence({
                    attendanceMode: correction.proposedMode as AttendanceMode,
                    officeLocation: officeLocationRow,
                    latitude: correction.proposedLatitude ? Number(correction.proposedLatitude) : undefined,
                    longitude: correction.proposedLongitude ? Number(correction.proposedLongitude) : undefined
                  })
                : entry.geofenceStatus
            })
            .where(eq(attendanceEntry.id, entry.id));
        }
      }

      await tx.update(attendanceCorrection)
        .set({
          status: 'approved',
          reviewedBy: actorId,
          reviewedAt: new Date(),
          reviewNotes: dto.review_notes?.trim() || null
        })
        .where(eq(attendanceCorrection.id, id));
    });

    const daily = await this.recomputeDay(correction.userId, correction.workDate, profile, policy);

    this.notifications.create({
      userId: correction.userId,
      type: 'success',
      title: 'Attendance Correction Approved',
      message: `Your ${correction.requestType.replace('_', ' ')} correction for ${this.workDateKey(correction.workDate)} has been approved.`,
      link: '/attendance',
      sentVia: ['in-app', 'email'],
      notifiableType: 'attendance_correction',
    }).catch((err) => this.logger.warn(`Failed to send correction approval notification: ${err.message}`));

    return { success: true, daily };
  }

  async rejectCorrection(userId: string, id: string, dto: ReviewAttendanceCorrectionDto) {
    const actorId = toBigInt(userId);
    const correctionRows = await this.db.client
      .select()
      .from(attendanceCorrection)
      .where(and(eq(attendanceCorrection.id, id), this.tenantCond(attendanceCorrection.tenantId)))
      .limit(1);
    const correction = correctionRows[0] ?? null;
    if (!correction) throw new NotFoundException('Attendance correction not found');
    if (correction.status !== 'pending') throw new BadRequestException('Attendance correction is no longer pending');

    await this.db.client.update(attendanceCorrection)
      .set({
        status: 'rejected',
        reviewedBy: actorId,
        reviewedAt: new Date(),
        reviewNotes: dto.review_notes?.trim() || null
      })
      .where(eq(attendanceCorrection.id, id));

    this.notifications.create({
      userId: correction.userId,
      type: 'info',
      title: 'Attendance Correction Rejected',
      message: `Your ${correction.requestType.replace('_', ' ')} correction for ${this.workDateKey(correction.workDate)} was not approved.${dto.review_notes ? ` Reason: ${dto.review_notes.trim()}` : ''}`,
      link: '/attendance',
      sentVia: ['in-app', 'email'],
      notifiableType: 'attendance_correction',
    }).catch((err) => this.logger.warn(`Failed to send correction rejection notification: ${err.message}`));

    return { success: true };
  }

  async listExceptions(query: Record<string, any>) {
    const status = query.status ? String(query.status).trim().toLowerCase() : undefined;
    const targetUserId = query.user_id ? toBigInt(String(query.user_id)) : undefined;
    const fromDate = query.from ? this.toWorkDate(new Date(String(query.from))) : undefined;
    const toDate = query.to ? this.toWorkDate(new Date(String(query.to))) : undefined;

const conds: SQL[] = [this.tenantCond(attendanceException.tenantId)];
    if (status) conds.push(eq(attendanceException.status, status));
    if (targetUserId) conds.push(eq(attendanceException.userId, targetUserId));
    if (fromDate) conds.push(gte(attendanceException.workDate, fromDate));
    if (toDate) conds.push(lte(attendanceException.workDate, toDate));

    const rows = await this.db.client
      .select()
      .from(attendanceException)
      .where(and(...conds))
      .orderBy(asc(attendanceException.status), desc(attendanceException.workDate), desc(attendanceException.createdAt));

    const withIncludes = await this.attachExceptionIncludes(rows);

    return { data: withIncludes.map((row) => this.serializeException(row)) };
  }

  async createException(userId: string, dto: CreateAttendanceExceptionDto) {
    const actorId = toBigInt(userId);
    const tid = this.tenantContext.currentTenantId();
    const targetUserId = toBigInt(dto.user_id);
    const workDate = this.toWorkDate(new Date(dto.work_date));
    const [daily, lastEntry] = await Promise.all([
      this.db.client
        .select()
        .from(attendanceDaily)
        .where(and(
          eq(attendanceDaily.userId, targetUserId),
          eq(attendanceDaily.workDate, workDate),
          this.tenantCond(attendanceDaily.tenantId)
        ))
        .limit(1),
      this.db.client
        .select()
        .from(attendanceEntry)
        .where(and(
          eq(attendanceEntry.userId, targetUserId),
          eq(attendanceEntry.workDate, workDate),
          this.tenantCond(attendanceEntry.tenantId)
        ))
        .orderBy(desc(attendanceEntry.entryAt))
        .limit(1)
    ]);

    const [row] = await this.db.client.insert(attendanceException).values({
      userId: targetUserId,
      attendanceDailyId: daily[0]?.id ?? null,
      attendanceEntryId: lastEntry[0]?.id ?? null,
      officeLocationId: dto.office_location_id ? toBigInt(dto.office_location_id) : daily[0]?.officeLocationId ?? null,
      exceptionType: dto.exception_type,
      status: 'active',
      workDate,
      attendanceMode: dto.attendance_mode ?? null,
      reason: dto.reason.trim(),
      notes: dto.notes?.trim() || null,
      createdBy: actorId,
      ...(tid ? { tenantId: tid } : {})
    }).returning();

    const profile = await this.getProfileContext(targetUserId);
    const policy = await this.resolveAttendancePolicy(targetUserId, profile);
    await this.recomputeDay(targetUserId, workDate, profile, policy);

    return { success: true, data: this.serializeException(row) };
  }

  async resolveException(userId: string, id: string, dto: ReviewAttendanceExceptionDto) {
    const actorId = toBigInt(userId);
    const existingRows = await this.db.client
      .select()
      .from(attendanceException)
      .where(and(eq(attendanceException.id, id), this.tenantCond(attendanceException.tenantId)))
      .limit(1);
    const existing = existingRows[0] ?? null;
    if (!existing) throw new NotFoundException('Attendance exception not found');
    if (existing.status !== 'active') throw new BadRequestException('Attendance exception is no longer active');

    await this.db.client.update(attendanceException)
      .set({
        status: 'resolved',
        reviewedBy: actorId,
        reviewedAt: new Date(),
        notes: dto.review_notes?.trim() ? `${existing.notes ? `${existing.notes}\n\n` : ''}Resolution: ${dto.review_notes.trim()}` : existing.notes
      })
      .where(eq(attendanceException.id, id));

    const profile = await this.getProfileContext(existing.userId);
    const policy = await this.resolveAttendancePolicy(existing.userId, profile);
    await this.recomputeDay(existing.userId, existing.workDate, profile, policy);

    return { success: true };
  }

  private async recomputeDay(userId: bigint, workDate: Date, profileArg?: ProfileContext, policyArg?: AttendancePolicy) {
    const profile = profileArg ?? (await this.getProfileContext(userId));
    const [entries, policy, exceptions, corrections] = await Promise.all([
      this.db.client
        .select()
        .from(attendanceEntry)
        .where(and(eq(attendanceEntry.userId, userId), eq(attendanceEntry.workDate, workDate), this.tenantCond(attendanceEntry.tenantId)))
        .orderBy(asc(attendanceEntry.entryAt)),
      policyArg ? Promise.resolve(policyArg) : this.resolveAttendancePolicy(userId, profile),
      this.db.client
        .select()
        .from(attendanceException)
        .where(and(
          eq(attendanceException.userId, userId),
          eq(attendanceException.workDate, workDate),
          eq(attendanceException.status, 'active'),
          this.tenantCond(attendanceException.tenantId)
        ))
        .orderBy(desc(attendanceException.createdAt)),
      this.db.client
        .select()
        .from(attendanceCorrection)
        .where(and(
          eq(attendanceCorrection.userId, userId),
          eq(attendanceCorrection.workDate, workDate),
          eq(attendanceCorrection.status, 'approved'),
          this.tenantCond(attendanceCorrection.tenantId)
        ))
        .orderBy(desc(attendanceCorrection.reviewedAt))
    ]);

    let firstInAt: Date | null = null;
    let lastOutAt: Date | null = null;
    let openIn: Date | null = null;
    let workedMinutes = 0;

    for (const entry of entries) {
      if (entry.entryType === 'clock_in') {
        if (!firstInAt) firstInAt = entry.entryAt;
        openIn = entry.entryAt;
      } else if (entry.entryType === 'clock_out') {
        if (openIn && entry.entryAt > openIn) {
          workedMinutes += Math.floor((entry.entryAt.getTime() - openIn.getTime()) / 60000);
          lastOutAt = entry.entryAt;
        }
        openIn = null;
      }
    }

    const scheduledMinutes = this.diffMinutesOnDay(workDate, policy.start_time, policy.end_time);
    let lateMinutes = 0;
    if (firstInAt) {
      const expectedStart = this.atTime(workDate, policy.start_time);
      const graceStart = new Date(expectedStart.getTime() + policy.grace_minutes * 60000);
      if (firstInAt > graceStart) {
        lateMinutes = Math.floor((firstInAt.getTime() - graceStart.getTime()) / 60000);
      }
    }

    const latestEntry = [...entries].reverse().find((entry) => entry.attendanceMode || entry.officeLocationId || entry.geofenceStatus) ?? null;
    const firstClockIn = entries.find((entry) => entry.entryType === 'clock_in') ?? null;
    const activeException = exceptions[0] ?? null;
    const approvedCorrection = corrections[0] ?? null;

    let effectiveMode =
      (activeException?.attendanceMode as AttendanceMode | null) ??
      (latestEntry?.attendanceMode as AttendanceMode | null) ??
      this.resolveExpectedMode(profile, workDate, policy);
    if (approvedCorrection?.proposedMode) {
      effectiveMode = approvedCorrection.proposedMode as AttendanceMode;
    }

    const officeLocationId = activeException?.officeLocationId
      ?? approvedCorrection?.proposedOfficeLocationId
      ?? latestEntry?.officeLocationId
      ?? null;
    const geofenceStatus = activeException
      ? 'not_applicable'
      : (firstClockIn?.geofenceStatus as GeofenceStatus | null) ?? null;

    if (approvedCorrection?.proposedAt && !firstInAt) {
      firstInAt = approvedCorrection.proposedAt;
    }

    const holiday = await this.findHoliday(profile, workDate, officeLocationId);
    const onLeave = await this.isOnApprovedLeave(userId, workDate);
    const isWeekend = this.isWeekend(workDate);

    let status: DailyStatus;
    let reconciliationStatus = 'open';
    if (holiday) {
      status = 'holiday';
      reconciliationStatus = 'holiday';
    } else if (onLeave) {
      status = 'leave';
      reconciliationStatus = 'leave';
    } else if (isWeekend) {
      status = 'off_day';
      reconciliationStatus = 'off_day';
    } else if (approvedCorrection) {
      reconciliationStatus = 'corrected';
      status = !firstInAt ? 'absent' : lateMinutes > 0 ? 'late' : 'present';
    } else if (activeException?.exceptionType === 'field_assignment') {
      reconciliationStatus = 'exception';
      status = !firstInAt ? 'absent' : lateMinutes > 0 ? 'late' : 'present';
    } else if (activeException?.exceptionType === 'remote_exception') {
      reconciliationStatus = 'exception';
      status = !firstInAt ? 'absent' : lateMinutes > 0 ? 'late' : 'present';
    } else if (activeException?.exceptionType === 'excused_absence') {
      status = 'off_day';
      reconciliationStatus = 'exception';
    } else if (activeException) {
      status = 'exception_pending';
      reconciliationStatus = 'exception';
    } else if (!firstInAt) {
      status = 'absent';
    } else {
      status = lateMinutes > 0 ? 'late' : 'present';
    }

    const overtimeMinutes = Math.max(0, workedMinutes - scheduledMinutes);
    const policySnapshot: Record<string, unknown> = {
      ...policy,
      expected_mode: this.resolveExpectedMode(profile, workDate, policy),
      employee_work_mode: profile.workMode,
      holiday: holiday ? { id: holiday.id, name: holiday.name } : null,
      leave: onLeave,
      office_location_id: officeLocationId ? officeLocationId.toString() : null
    };

    const dailyValues = {
      status,
      attendanceMode: effectiveMode,
      expectedMode: this.resolveExpectedMode(profile, workDate, policy),
      reconciliationStatus,
      officeLocationId,
      geofenceStatus,
      scheduledMinutes,
      workedMinutes,
      lateMinutes,
      overtimeMinutes,
      firstInAt,
      lastOutAt,
      policySnapshot,
      computedAt: new Date()
    };

    const daily = await this.db.client.insert(attendanceDaily).values({
      userId,
      workDate,
      ...dailyValues,
      ...(this.tenantContext.currentTenantId() ? { tenantId: this.tenantContext.currentTenantId() } : {})
    })
      .onConflictDoUpdate({
        target: [attendanceDaily.userId, attendanceDaily.workDate],
        set: dailyValues
      })
      .returning();

    return this.serializeDaily(daily[0]);
  }

  private async resolveAttendancePolicy(userId: bigint, profileArg?: ProfileContext): Promise<AttendancePolicy> {
    const defaultPolicy: AttendancePolicy = {
      start_time: '09:00',
      end_time: '17:00',
      grace_minutes: 15,
      max_future_minutes: 5,
      max_past_days: 7,
      allow_multiple_open_sessions: false,
      earliest_clock_in_minutes_before_start: 240,
      latest_clock_out_minutes_after_end: 720,
      onsite_weekdays: [1, 5],
      remote_weekdays: [2, 3, 4],
      required_extra_onsite_day_count: 1,
      enforce_expected_mode_clock_in: false,
      enforce_clock_out_match_clock_in_mode: true
    };

    const profile = profileArg ?? (await this.getProfileContext(userId));
    const orgId = profile.primaryOrganizationId?.toString();
    const teamId = profile.primaryTeamId?.toString();
    const staffType = profile.workMode ?? undefined;

    const now = new Date();
    const policies = await this.db.client
      .select()
      .from(policy)
      .where(and(
        eq(policy.module, 'attendance'),
        eq(policy.policyKey, 'schedule'),
        eq(policy.isActive, true),
        or(isNull(policy.effectiveFrom), lte(policy.effectiveFrom, now)),
        or(isNull(policy.effectiveTo), gte(policy.effectiveTo, now)),
        this.tenantCond(policy.tenantId) ? or(eq(policy.tenantId, this.tenantContext.currentTenantId()!), isNull(policy.tenantId)) : undefined
      ));

    const matched = policies
      .filter((row) => {
        if (row.scopeType === 'global') return true;
        if (row.scopeType === 'organization') return orgId && row.scopeId === orgId;
        if (row.scopeType === 'team') return teamId && row.scopeId === teamId;
        if (row.scopeType === 'staff_type') return staffType && row.scopeId === staffType;
        if (row.scopeType === 'user') return row.scopeId === userId.toString();
        return false;
      })
      .sort((a, b) => {
        const rank = this.scopeRank(a.scopeType) - this.scopeRank(b.scopeType);
        if (rank !== 0) return rank;
        return a.priority - b.priority;
      });

    const merged = (matched as any[]).reduce((acc: Record<string, unknown>, row) => {
      const cfg =
        row.configJson && typeof row.configJson === 'object' && !Array.isArray(row.configJson)
          ? (row.configJson as Record<string, unknown>)
          : {};
      return { ...acc, ...cfg };
    }, defaultPolicy as unknown as Record<string, unknown>);

    return {
      start_time: typeof merged.start_time === 'string' ? merged.start_time : defaultPolicy.start_time,
      end_time: typeof merged.end_time === 'string' ? merged.end_time : defaultPolicy.end_time,
      grace_minutes:
        typeof merged.grace_minutes === 'number'
          ? merged.grace_minutes
          : Number(merged.grace_minutes ?? defaultPolicy.grace_minutes),
      max_future_minutes:
        typeof merged.max_future_minutes === 'number'
          ? merged.max_future_minutes
          : Number(merged.max_future_minutes ?? defaultPolicy.max_future_minutes),
      max_past_days:
        typeof merged.max_past_days === 'number'
          ? merged.max_past_days
          : Number(merged.max_past_days ?? defaultPolicy.max_past_days),
      allow_multiple_open_sessions:
        typeof merged.allow_multiple_open_sessions === 'boolean'
          ? merged.allow_multiple_open_sessions
          : String(merged.allow_multiple_open_sessions ?? defaultPolicy.allow_multiple_open_sessions) === 'true',
      earliest_clock_in_minutes_before_start:
        typeof merged.earliest_clock_in_minutes_before_start === 'number'
          ? merged.earliest_clock_in_minutes_before_start
          : Number(merged.earliest_clock_in_minutes_before_start ?? defaultPolicy.earliest_clock_in_minutes_before_start),
      latest_clock_out_minutes_after_end:
        typeof merged.latest_clock_out_minutes_after_end === 'number'
          ? merged.latest_clock_out_minutes_after_end
          : Number(merged.latest_clock_out_minutes_after_end ?? defaultPolicy.latest_clock_out_minutes_after_end),
      onsite_weekdays: this.normalizeWeekdayList(merged.onsite_weekdays, defaultPolicy.onsite_weekdays),
      remote_weekdays: this.normalizeWeekdayList(merged.remote_weekdays, defaultPolicy.remote_weekdays),
      required_extra_onsite_day_count: Number(
        merged.required_extra_onsite_day_count ?? defaultPolicy.required_extra_onsite_day_count
      ),
      enforce_expected_mode_clock_in:
        typeof merged.enforce_expected_mode_clock_in === 'boolean'
          ? merged.enforce_expected_mode_clock_in
          : String(merged.enforce_expected_mode_clock_in ?? defaultPolicy.enforce_expected_mode_clock_in) === 'true',
      enforce_clock_out_match_clock_in_mode:
        typeof merged.enforce_clock_out_match_clock_in_mode === 'boolean'
          ? merged.enforce_clock_out_match_clock_in_mode
          : String(
              merged.enforce_clock_out_match_clock_in_mode ?? defaultPolicy.enforce_clock_out_match_clock_in_mode
            ) === 'true'
    };
  }

  /**
   * Resolves the user's effective clock-out time for a given work date based on
   * their attendance schedule policy (organization/team/staff-type/user scoping).
   * Returns null when the schedule cannot be resolved.
   */
  async getClockOutTime(userId: string | bigint, workDate: Date): Promise<Date | null> {
    const uid = toBigInt(userId);
    try {
      const policy = await this.resolveAttendancePolicy(uid);
      return this.atTime(workDate, policy.end_time);
    } catch (error) {
      this.logger.warn(
        `Failed to resolve attendance schedule for user ${uid}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
      return null;
    }
  }

  private async getProfileContext(userId: bigint): Promise<ProfileContext> {
    const [profileRows, primaryTeamRows, organizations, employeeRows, metaRows] = await Promise.all([
      this.db.client.select().from(profile).where(eq(profile.id, userId)).limit(1),
      this.db.client
        .select({ groupId: groupUser.groupId })
        .from(groupUser)
        .where(and(eq(groupUser.userId, userId), eq(groupUser.isPrimary, true)))
        .limit(1),
      this.db.client.select().from(profileOrganization).where(eq(profileOrganization.profileId, userId)),
      this.db.client
        .select({ workMode: employeeProfile.workMode })
        .from(employeeProfile)
        .where(eq(employeeProfile.userId, userId))
        .limit(1),
      this.db.client.select().from(employeeMeta).where(eq(employeeMeta.userId, userId))
    ]);
    const profileRow = profileRows[0] ?? null;
    if (!profileRow) throw new NotFoundException('User profile not found');

    return {
      id: profileRow.id,
      email: profileRow.email,
      username: profileRow.username,
      firstName: profileRow.firstName,
      lastName: profileRow.lastName,
      primaryOrganizationId: profileRow.primaryOrganizationId,
      primaryTeamId: primaryTeamRows[0]?.groupId ?? null,
      workMode: employeeRows[0]?.workMode ?? null,
      organizationIds: Array.from(
        new Set(
          [
            ...(profileRow.primaryOrganizationId ? [profileRow.primaryOrganizationId] : []),
            ...organizations.map((row: any) => row.organizationId)
          ].filter(Boolean) as bigint[]
        )
      ),
      employeeMeta: (metaRows ?? []).reduce((acc: Record<string, unknown>, row: any) => {
        acc[row.metaKey] = row.metaValue;
        return acc;
      }, {})
    };
  }

  private resolveCurrentAction(input: { entries: Array<{ entryType: string; entryAt: Date }>; policy: AttendancePolicy; now: Date }) {
    const { entries, policy, now } = input;
    const openClockIn = this.getOpenClockIn(entries);
    const today = this.toWorkDate(now);
    const earliestClockIn = new Date(this.atTime(today, policy.start_time).getTime() - policy.earliest_clock_in_minutes_before_start * 60000);
    const latestClockOut = new Date(this.atTime(today, policy.end_time).getTime() + policy.latest_clock_out_minutes_after_end * 60000);

    if (openClockIn) {
      return { canClockIn: false, canClockOut: true, reason: null };
    }

    if (now < earliestClockIn) {
      return { canClockIn: false, canClockOut: false, reason: 'Clock in is not open yet' };
    }
    if (now > latestClockOut) {
      return { canClockIn: false, canClockOut: false, reason: 'Clock window closed for today' };
    }

    return { canClockIn: true, canClockOut: false, reason: null };
  }

  private assertTimestampAllowed(at: Date, policy: AttendancePolicy, source?: string) {
    if ((source ?? 'web') === 'import') return;

    const now = new Date();
    const maxFuture = new Date(now.getTime() + policy.max_future_minutes * 60000);
    if (at > maxFuture) {
      throw new BadRequestException('Attendance time cannot be in the future');
    }

    const maxPast = new Date(now.getTime() - policy.max_past_days * 24 * 60 * 60000);
    if (at < maxPast) {
      throw new BadRequestException(`Attendance backdate exceeds ${policy.max_past_days} day limit`);
    }
  }

  private async listAllowedOfficeLocations(profile: ProfileContext) {
    if (!profile.organizationIds.length) return [];
    const linked = await this.orgLinkedLocationIds(profile.organizationIds);
    const rows = await this.db.client
      .select()
      .from(officeLocation)
      .where(and(
        eq(officeLocation.isActive, true),
        inArray(officeLocation.id, linked)
      ))
      .orderBy(asc(officeLocation.name));
    const withOrganizations = await this.attachOfficeLocationOrganizations(rows);
    return withOrganizations.map((row) => this.serializeOfficeLocation(row));
  }

  private async resolveOfficeLocationForAttendance(input: {
    profile: ProfileContext;
    requestedOfficeLocationId?: string;
    attendanceMode: AttendanceMode;
  }) {
    if (input.attendanceMode !== 'onsite') return null;
    if (!input.profile.organizationIds.length) return null;

    const requestedOfficeLocationId = input.requestedOfficeLocationId ? toBigInt(input.requestedOfficeLocationId) : null;
    if (requestedOfficeLocationId) {
      const linked = await this.orgLinkedLocationIds(input.profile.organizationIds);
      const rows = await this.db.client
        .select()
        .from(officeLocation)
        .where(and(
          eq(officeLocation.id, requestedOfficeLocationId),
          eq(officeLocation.isActive, true),
          inArray(officeLocation.id, linked)
        ))
        .limit(1);
      const row = rows[0] ?? null;
      if (!row) throw new BadRequestException('Office location is not available for this staff member');
      return row;
    }

    const linked = await this.orgLinkedLocationIds(input.profile.organizationIds);
    const rows = await this.db.client
      .select()
      .from(officeLocation)
      .where(and(
        eq(officeLocation.isActive, true),
        inArray(officeLocation.id, linked)
      ))
      .orderBy(asc(officeLocation.id))
      .limit(1);
    return rows[0] ?? null;
  }

  private async orgLinkedLocationIds(organizationIds: bigint[]): Promise<bigint[]> {
    if (!organizationIds.length) return [];
    const rows = await this.db.client
      .select({ officeLocationId: organizationOfficeLocation.officeLocationId })
      .from(organizationOfficeLocation)
      .where(and(
        inArray(organizationOfficeLocation.organizationId, organizationIds),
        this.tenantCond(organizationOfficeLocation.tenantId)
      ));
    return rows.map((row) => row.officeLocationId);
  }

  private async attachOfficeLocationOrganizations<T extends { id: bigint }>(rows: T[]) {
    if (!rows.length) return rows.map((row) => ({ ...row, organizations: [] }));
    const ids = Array.from(new Set(rows.map((row) => row.id)));
    const orgRows = await this.db.client
      .select({ rel: organizationOfficeLocation, org: organization })
      .from(organizationOfficeLocation)
      .innerJoin(organization, eq(organizationOfficeLocation.organizationId, organization.id))
      .where(and(
        inArray(organizationOfficeLocation.officeLocationId, ids),
        this.tenantCond(organizationOfficeLocation.tenantId)
      ))
      .orderBy(desc(organizationOfficeLocation.isPrimary), asc(organizationOfficeLocation.createdAt));
    const byLocation = new Map<string, any[]>();
    for (const entry of orgRows) {
      const key = entry.rel.officeLocationId.toString();
      const list = byLocation.get(key) ?? [];
      list.push({ ...entry.rel, organization: entry.org });
      byLocation.set(key, list);
    }
    return rows.map((row) => ({ ...row, organizations: byLocation.get(row.id.toString()) ?? [] }));
  }

  private async attachCorrectionIncludes(rows: any[]) {
    if (!rows.length) return rows;
    const profileIds = Array.from(new Set(
      rows.flatMap((row) => [row.userId, row.requestedBy, row.reviewedBy].filter((id): id is bigint => id != null))
    ));
    const locationIds = Array.from(new Set(
      rows.flatMap((row) => [row.officeLocationId, row.proposedOfficeLocationId].filter((id): id is bigint => id != null))
    ));
    const [users, locations] = await Promise.all([
      profileIds.length
        ? this.db.client.select().from(profile).where(inArray(profile.id, profileIds))
        : Promise.resolve([]),
      locationIds.length
        ? this.db.client.select().from(officeLocation).where(inArray(officeLocation.id, locationIds))
        : Promise.resolve([])
    ]);
    const userMap = new Map(users.map((user) => [user.id.toString(), user]));
    const locationMap = new Map(locations.map((location) => [location.id.toString(), location]));
    return rows.map((row) => ({
      ...row,
      user: row.userId ? userMap.get(row.userId.toString()) ?? null : null,
      requester: row.requestedBy ? userMap.get(row.requestedBy.toString()) ?? null : null,
      reviewer: row.reviewedBy ? userMap.get(row.reviewedBy.toString()) ?? null : null,
      officeLocation: row.officeLocationId ? locationMap.get(row.officeLocationId.toString()) ?? null : null,
      proposedOfficeLocation: row.proposedOfficeLocationId ? locationMap.get(row.proposedOfficeLocationId.toString()) ?? null : null
    }));
  }

  private async attachExceptionIncludes(rows: any[]) {
    if (!rows.length) return rows;
    const profileIds = Array.from(new Set(
      rows.flatMap((row) => [row.userId, row.createdBy, row.reviewedBy].filter((id): id is bigint => id != null))
    ));
    const locationIds = Array.from(new Set(
      rows.flatMap((row) => [row.officeLocationId].filter((id): id is bigint => id != null))
    ));
    const [users, locations] = await Promise.all([
      profileIds.length
        ? this.db.client.select().from(profile).where(inArray(profile.id, profileIds))
        : Promise.resolve([]),
      locationIds.length
        ? this.db.client.select().from(officeLocation).where(inArray(officeLocation.id, locationIds))
        : Promise.resolve([])
    ]);
    const userMap = new Map(users.map((user) => [user.id.toString(), user]));
    const locationMap = new Map(locations.map((location) => [location.id.toString(), location]));
    return rows.map((row) => ({
      ...row,
      user: row.userId ? userMap.get(row.userId.toString()) ?? null : null,
      creator: row.createdBy ? userMap.get(row.createdBy.toString()) ?? null : null,
      reviewer: row.reviewedBy ? userMap.get(row.reviewedBy.toString()) ?? null : null,
      officeLocation: row.officeLocationId ? locationMap.get(row.officeLocationId.toString()) ?? null : null
    }));
  }

  private resolveSubmittedMode(mode: string | undefined, profile: ProfileContext, workDate: Date, policy: AttendancePolicy): AttendanceMode {
    const requested = mode?.trim().toLowerCase();
    if (requested === 'onsite' || requested === 'remote' || requested === 'field') return requested;
    return this.resolveExpectedMode(profile, workDate, policy);
  }

  private resolveExpectedMode(profile: ProfileContext, workDate: Date, policy: AttendancePolicy): AttendanceMode {
    const day = workDate.getUTCDay();
    const extraOnsiteDays = this.normalizeWeekdayList(profile.employeeMeta.attendance_extra_onsite_days, []);
    if (policy.remote_weekdays.includes(day)) return 'remote';
    if (policy.onsite_weekdays.includes(day) || extraOnsiteDays.includes(day)) return 'onsite';
    if (profile.workMode === 'remote') return 'remote';
    if (profile.workMode === 'onsite') return 'onsite';
    return 'onsite';
  }

  private async findHoliday(profile: ProfileContext, workDate: Date, officeLocationId: bigint | null) {
    const orConds: SQL[] = [];
    if (officeLocationId) orConds.push(eq(attendanceHoliday.officeLocationId, officeLocationId));
    if (profile.organizationIds.length) orConds.push(inArray(attendanceHoliday.organizationId, profile.organizationIds));
    const rows = await this.db.client
      .select()
      .from(attendanceHoliday)
      .where(and(
        eq(attendanceHoliday.isActive, true),
        ...(orConds.length ? [or(...orConds)] : []),
        this.tenantCond(attendanceHoliday.tenantId)
      ))
      .orderBy(desc(attendanceHoliday.officeLocationId), desc(attendanceHoliday.organizationId), desc(attendanceHoliday.createdAt));
    return (
      rows.find((row) => {
        const sameDay = this.workDateKey(row.holidayDate) === this.workDateKey(workDate);
        if (sameDay) return true;
        if (!row.isRecurring) return false;
        return (
          row.holidayDate.getUTCMonth() === workDate.getUTCMonth() &&
          row.holidayDate.getUTCDate() === workDate.getUTCDate()
        );
      }) ?? null
    );
  }

  private async isOnApprovedLeave(userId: bigint, workDate: Date) {
    const requests = await this.db.client
      .select({
        id: requestInstance.id,
        data: requestInstance.data,
        requestType: { taxonomyKeys: requestType.taxonomyKeys, name: requestType.name }
      })
      .from(requestInstance)
      .innerJoin(requestType, eq(requestInstance.requestTypeId, requestType.id))
      .where(and(
        eq(requestInstance.createdBy, userId),
        inArray(requestInstance.status, ['approved', 'completed']),
        this.tenantCond(requestInstance.tenantId)
      ))
      .orderBy(desc(requestInstance.createdAt))
      .limit(50);

    for (const row of requests) {
      const data = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : {};
      const leaveType = String(data.leave_type_key ?? data.leave_type ?? '').trim().toLowerCase();
      const startDateRaw = String(data.start_date ?? '').trim();
      const endDateRaw = String(data.end_date ?? '').trim();
      const typeCategory = String(row.requestType?.taxonomyKeys ?? '').trim().toLowerCase();
      const typeName = String(row.requestType?.name ?? '').trim().toLowerCase();
      if (!startDateRaw || !endDateRaw) continue;
      if (!leaveType && typeCategory !== 'leave' && !typeName.includes('leave')) continue;
      const startDate = this.toWorkDate(new Date(startDateRaw));
      const endDate = this.toWorkDate(new Date(endDateRaw));
      if (workDate >= startDate && workDate <= endDate) return true;
    }
    return false;
  }

  private evaluateGeofence(input: {
    attendanceMode: AttendanceMode;
    officeLocation: { latitude: Decimal | number | string; longitude: Decimal | number | string; radiusMeters: number } | null;
    latitude?: number | null;
    longitude?: number | null;
  }): GeofenceStatus {
    if (input.attendanceMode !== 'onsite') return 'not_applicable';
    if (!input.officeLocation || input.latitude === undefined || input.latitude === null || input.longitude === undefined || input.longitude === null) {
      return 'unknown';
    }
    const distance = this.distanceMeters(
      Number(input.officeLocation.latitude),
      Number(input.officeLocation.longitude),
      input.latitude,
      input.longitude
    );
    return distance <= Number(input.officeLocation.radiusMeters ?? 150) ? 'inside' : 'outside';
  }

  private distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  private normalizeWeekdayList(value: unknown, fallback: number[]) {
    if (!Array.isArray(value)) return fallback;
    const normalized = value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item >= 0 && item <= 6)
      .map((item) => Math.trunc(item));
    return normalized.length ? Array.from(new Set(normalized)) : fallback;
  }

  private uniqueBigInts(ids: string[]) {
    return Array.from(new Set(ids.map((value) => toBigInt(value))));
  }

  private isWeekend(workDate: Date) {
    const day = workDate.getUTCDay();
    return day === 0 || day === 6;
  }

  private scopeRank(scopeType: string) {
    if (scopeType === 'global') return 0;
    if (scopeType === 'organization') return 1;
    if (scopeType === 'team') return 2;
    if (scopeType === 'staff_type') return 3;
    if (scopeType === 'user') return 4;
    return 99;
  }

  private serializeEntry(row: any) {
    return {
      id: row.id,
      user_id: row.userId.toString(),
      entry_type: row.entryType,
      entry_at: row.entryAt,
      work_date: row.workDate,
      attendance_mode: row.attendanceMode ?? null,
      office_location_id: row.officeLocationId ? row.officeLocationId.toString() : null,
      latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
      longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
      geofence_status: row.geofenceStatus ?? null,
      source: row.source,
      metadata: row.metadata,
      created_at: row.createdAt
    };
  }

  private serializeDaily(row: any) {
    return {
      id: row.id,
      user_id: row.userId.toString(),
      work_date: row.workDate,
      status: row.status,
      attendance_mode: row.attendanceMode ?? null,
      expected_mode: row.expectedMode ?? null,
      reconciliation_status: row.reconciliationStatus ?? null,
      office_location_id: row.officeLocationId ? row.officeLocationId.toString() : null,
      geofence_status: row.geofenceStatus ?? null,
      scheduled_minutes: row.scheduledMinutes,
      worked_minutes: row.workedMinutes,
      late_minutes: row.lateMinutes,
      overtime_minutes: row.overtimeMinutes,
      first_in_at: row.firstInAt,
      last_out_at: row.lastOutAt,
      computed_at: row.computedAt
    };
  }

  private serializeOfficeLocation(row: any) {
    return {
      id: row.id.toString(),
      name: row.name,
      address: row.address,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      radius_meters: row.radiusMeters,
      is_active: row.isActive,
      organizations: (row.organizations ?? []).map((entry: any) => ({
        id: entry.organization.id.toString(),
        name: entry.organization.name,
        code: entry.organization.code,
        is_primary: entry.isPrimary
      })),
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private serializeCorrection(row: any) {
    return {
      id: row.id,
      user_id: row.userId?.toString?.() ?? row.user_id?.toString?.() ?? null,
      request_type: row.requestType,
      status: row.status,
      work_date: row.workDate,
      reason: row.reason,
      proposed_at: row.proposedAt,
      proposed_mode: row.proposedMode,
      proposed_office_location_id: row.proposedOfficeLocationId ? row.proposedOfficeLocationId.toString() : null,
      proposed_latitude: row.proposedLatitude === null || row.proposedLatitude === undefined ? null : Number(row.proposedLatitude),
      proposed_longitude: row.proposedLongitude === null || row.proposedLongitude === undefined ? null : Number(row.proposedLongitude),
      requested_at: row.requestedAt,
      reviewed_at: row.reviewedAt,
      review_notes: row.reviewNotes,
      user: row.user
        ? {
            id: row.user.id.toString(),
            first_name: row.user.firstName,
            last_name: row.user.lastName,
            email: row.user.email
          }
        : null,
      requester: row.requester
        ? {
            id: row.requester.id.toString(),
            first_name: row.requester.firstName,
            last_name: row.requester.lastName,
            email: row.requester.email
          }
        : null,
      reviewer: row.reviewer
        ? {
            id: row.reviewer.id.toString(),
            first_name: row.reviewer.firstName,
            last_name: row.reviewer.lastName,
            email: row.reviewer.email
          }
        : null,
      office_location: row.officeLocation
        ? { id: row.officeLocation.id.toString(), name: row.officeLocation.name }
        : null,
      proposed_office_location: row.proposedOfficeLocation
        ? { id: row.proposedOfficeLocation.id.toString(), name: row.proposedOfficeLocation.name }
        : null,
      snapshot_json: row.snapshotJson ?? null
    };
  }

  private serializeException(row: any) {
    return {
      id: row.id,
      user_id: row.userId?.toString?.() ?? row.user_id?.toString?.() ?? null,
      exception_type: row.exceptionType,
      status: row.status,
      work_date: row.workDate,
      attendance_mode: row.attendanceMode ?? null,
      reason: row.reason,
      notes: row.notes ?? null,
      created_at: row.createdAt,
      reviewed_at: row.reviewedAt,
      user: row.user
        ? {
            id: row.user.id.toString(),
            first_name: row.user.firstName,
            last_name: row.user.lastName,
            email: row.user.email
          }
        : null,
      creator: row.creator
        ? {
            id: row.creator.id.toString(),
            first_name: row.creator.firstName,
            last_name: row.creator.lastName,
            email: row.creator.email
          }
        : null,
      reviewer: row.reviewer
        ? {
            id: row.reviewer.id.toString(),
            first_name: row.reviewer.firstName,
            last_name: row.reviewer.lastName,
            email: row.reviewer.email
          }
        : null,
      office_location: row.officeLocation
        ? { id: row.officeLocation.id.toString(), name: row.officeLocation.name }
        : null
    };
  }

  private getOpenClockIn(
    entries: Array<{ entryType: string; entryAt: Date; workDate?: Date; attendanceMode?: string | null; officeLocationId?: bigint | null }>
  ) {
    let open: { entryType: string; entryAt: Date; workDate?: Date; attendanceMode?: string | null; officeLocationId?: bigint | null } | null = null;
    for (const entry of entries.sort((a, b) => a.entryAt.getTime() - b.entryAt.getTime())) {
      if (entry.entryType === 'clock_in') open = entry;
      if (entry.entryType === 'clock_out') open = null;
    }
    return open;
  }

  private workDateKey(value: Date) {
    return this.toWorkDate(value).toISOString().slice(0, 10);
  }

  private toWorkDate(value: Date) {
    const date = new Date(value);
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  private atTime(workDate: Date, hhmm: string) {
    const [hh, mm] = hhmm.split(':').map((v) => Number(v));
    return new Date(Date.UTC(workDate.getUTCFullYear(), workDate.getUTCMonth(), workDate.getUTCDate(), hh || 0, mm || 0, 0));
  }

  private diffMinutesOnDay(workDate: Date, start: string, end: string) {
    const s = this.atTime(workDate, start);
    const e = this.atTime(workDate, end);
    return Math.max(0, Math.floor((e.getTime() - s.getTime()) / 60000));
  }

  private getIp(req: any): string | null {
    return (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req?.ip ?? null;
  }

  private getUserAgent(req: any): string | null {
    return (req?.headers?.['user-agent'] as string) ?? null;
  }

  private sendAttendanceNotification(
    userId: bigint,
    eventType: 'clock-in' | 'clock-out',
    at: Date,
    mode?: AttendanceMode | null
  ): Promise<void> {
    const label = eventType === 'clock-in' ? 'Clock In' : 'Clock Out';
    const timeLabel = at.toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit'
    });
    return this.notifications
      .create({
        userId,
        type: 'info',
        title: `${label} Recorded`,
        message: `Your ${label} was recorded at ${timeLabel}.${mode ? ` Mode: ${mode}.` : ''}`,
        link: '/attendance',
        sentVia: ['in-app', 'email'],
        notifiableType: 'attendance_entry',
      })
      .then(() => undefined);
  }
}