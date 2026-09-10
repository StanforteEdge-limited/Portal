import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { toBigInt } from '../../common/utils/ids';
import { CreateAttendanceCorrectionDto } from './dto/create-attendance-correction.dto';
import { CreateAttendanceExceptionDto } from './dto/create-attendance-exception.dto';
import { ReviewAttendanceCorrectionDto } from './dto/review-attendance-correction.dto';
import { ReviewAttendanceExceptionDto } from './dto/review-attendance-exception.dto';
import { UpsertOfficeLocationDto } from './dto/upsert-office-location.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
    const at = payload?.at ? new Date(payload.at) : new Date();
    if (Number.isNaN(at.getTime())) throw new BadRequestException('Invalid attendance time');
    const profile = await this.getProfileContext(actorId);
    const policy = await this.resolveAttendancePolicy(actorId, profile);
    this.assertTimestampAllowed(at, policy, payload?.source);

    const workDate = this.toWorkDate(at);
    const entries = await this.prisma.attendanceEntry.findMany({
      where: { userId: actorId, workDate },
      orderBy: { entryAt: 'asc' }
    });
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

    await this.prisma.attendanceEntry.create({
      data: {
        userId: actorId,
        entryType: 'clock_in',
        entryAt: at,
        workDate,
        attendanceMode: effectiveMode,
        officeLocationId: officeLocation?.id ?? null,
        latitude: payload?.latitude ?? null,
        longitude: payload?.longitude ?? null,
        geofenceStatus,
        source: payload?.source ?? 'web',
        createdBy: actorId,
        metadata: {
          ip: this.getIp(req),
          user_agent: this.getUserAgent(req)
        } as Prisma.InputJsonValue
      }
    });

    const daily = await this.recomputeDay(actorId, workDate, profile, policy);
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
    const at = payload?.at ? new Date(payload.at) : new Date();
    if (Number.isNaN(at.getTime())) throw new BadRequestException('Invalid attendance time');
    const profile = await this.getProfileContext(actorId);
    const policy = await this.resolveAttendancePolicy(actorId, profile);
    this.assertTimestampAllowed(at, policy, payload?.source);
    const workDate = this.toWorkDate(at);
    const lookbackStart = this.toWorkDate(
      new Date(Date.now() - policy.max_past_days * 24 * 60 * 60000)
    );

    const entries = await this.prisma.attendanceEntry.findMany({
      where: {
        userId: actorId,
        workDate: {
          gte: lookbackStart,
          lte: workDate
        }
      },
      orderBy: [{ workDate: 'asc' }, { entryAt: 'asc' }]
    });
    const openClockIn = this.getOpenClockIn(entries);
    if (!openClockIn) {
      throw new BadRequestException('No open clock-in found for this day');
    }

    const effectiveMode =
      openClockIn.attendanceMode === 'onsite' ||
      openClockIn.attendanceMode === 'remote' ||
      openClockIn.attendanceMode === 'field'
        ? (openClockIn.attendanceMode as AttendanceMode)
        : this.resolveExpectedMode(profile, workDate, policy);

    await this.prisma.attendanceEntry.create({
      data: {
        userId: actorId,
        entryType: 'clock_out',
        entryAt: at,
        workDate: openClockIn.workDate ?? workDate,
        attendanceMode: effectiveMode,
        officeLocationId: openClockIn.officeLocationId ?? null,
        latitude: null,
        longitude: null,
        geofenceStatus: null,
        source: payload?.source ?? 'web',
        createdBy: actorId,
        metadata: {
          ip: this.getIp(req),
          user_agent: this.getUserAgent(req)
        } as Prisma.InputJsonValue
      }
    });

    const daily = await this.recomputeDay(actorId, openClockIn.workDate ?? workDate, profile, policy);
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
      this.prisma.attendanceEntry.findMany({
        where: {
          userId: actorId,
          workDate: { gte: fromDate, lte: toDate }
        },
        orderBy: [{ workDate: 'desc' }, { entryAt: 'asc' }]
      }),
      this.prisma.attendanceDaily.findMany({
        where: {
          userId: actorId,
          workDate: { gte: fromDate, lte: toDate }
        },
        orderBy: { workDate: 'desc' }
      }),
      this.resolveAttendancePolicy(actorId, profile),
      this.prisma.attendanceCorrection.findMany({
        where: { userId: actorId, workDate: { gte: fromDate, lte: toDate } },
        orderBy: { requestedAt: 'desc' }
      }),
      this.prisma.attendanceException.findMany({
        where: { userId: actorId, workDate: { gte: fromDate, lte: toDate } },
        orderBy: { createdAt: 'desc' }
      }),
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

    const rows = await this.prisma.attendanceDaily.groupBy({
      by: ['status'],
      where: { workDate: { gte: fromDate, lte: toDate } },
      _count: { _all: true }
    });

    const summary: Record<string, number> = {};
    for (const row of rows) summary[row.status] = row._count._all;
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

    const where: any = {
      workDate: { gte: fromDate, lte: toDate },
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {})
    };

    if (orgId || teamId) {
      where.user = {};
      if (orgId) {
        where.user.organizations = { some: { organizationId: orgId } };
      }
      if (teamId) {
        where.user.groups = { some: { groupId: teamId } };
      }
    }

    const [total, dailyRows] = await Promise.all([
      this.prisma.attendanceDaily.count({ where }),
      this.prisma.attendanceDaily.findMany({
        where,
        orderBy: [{ workDate: 'desc' }, { userId: 'asc' }],
        skip,
        take: limit
      })
    ]);

    if (dailyRows.length === 0) {
      return paginatedResponse([], { page, per_page: limit, total: 0 });
    }

    const userIds = Array.from(new Set(dailyRows.map((row) => row.userId.toString())));
    const profiles = await this.prisma.profile.findMany({
      where: { id: { in: userIds.map((id) => toBigInt(id)) } },
      select: { id: true, email: true, username: true, firstName: true, lastName: true }
    });
    const profileMap = new Map(
      profiles.map((profile) => [
        profile.id.toString(),
        {
          id: profile.id.toString(),
          email: profile.email,
          username: profile.username,
          first_name: profile.firstName,
          last_name: profile.lastName
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

    return paginatedResponse(rows, { page, per_page: limit, total });
  }

  async getDailyRecord(userId: string, workDate: string) {
    const userIdBigInt = toBigInt(userId);

    const daily = await this.prisma.attendanceDaily.findFirst({
      where: {
        userId: userIdBigInt,
        workDate: workDate
      }
    });

    if (!daily) {
      return null;
    }

    const entries = await this.prisma.attendanceEntry.findMany({
      where: {
        userId: userIdBigInt,
        workDate: workDate
      },
      orderBy: { entryAt: 'asc' }
    });

    const profile = await this.prisma.profile.findUnique({
      where: { id: userIdBigInt },
      select: { id: true, email: true, username: true, firstName: true, lastName: true }
    });

    return {
      daily: this.serializeDaily(daily),
      profile: profile ? {
        id: profile.id.toString(),
        email: profile.email,
        username: profile.username,
        first_name: profile.firstName,
        last_name: profile.lastName
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

    const rows = await this.prisma.officeLocation.findMany({
      where: {
        ...(status === null ? {} : { isActive: status }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {}),
        ...(organizationId ? { organizations: { some: { organizationId } } } : {})
      },
      include: {
        organizations: {
          include: {
            organization: { select: { id: true, name: true, code: true } }
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }]
        }
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }]
    });

    return {
      data: rows.map((row) => this.serializeOfficeLocation(row))
    };
  }

  async getAttendanceStatus(userId: string) {
    const actorId = toBigInt(userId);
    const profile = await this.getProfileContext(actorId);
    const policy = await this.resolveAttendancePolicy(actorId, profile);
    const today = this.toWorkDate(new Date());
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const entries = await this.prisma.attendanceEntry.findMany({
      where: {
        userId: actorId,
        workDate: today,
      },
      orderBy: { entryAt: 'desc' }
    });

    const openClockIn = entries.find(e => e.entryType === 'clock_in' && !entries.some(out => out.entryType === 'clock_out' && out.entryAt > e.entryAt));
    const lastEntry = entries[0] ?? null;

    const response = {
      current_state: {
        is_clocked_in: !!openClockIn,
        last_clock_in_at: openClockIn?.entryAt?.toISOString() ?? null,
        last_clock_in_work_date: openClockIn?.workDate?.toISOString().slice(0, 10) ?? null,
        can_clock_in: !openClockIn && new Date() >= new Date(today.setHours(9, 0, 0, 0)),
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
    const organizationIds = this.uniqueBigInts(dto.organization_ids ?? []);
    const primaryOrganizationId = dto.primary_organization_id ? toBigInt(dto.primary_organization_id) : null;
    if (primaryOrganizationId && !organizationIds.some((id) => id === primaryOrganizationId)) {
      organizationIds.unshift(primaryOrganizationId);
    }

    const row = await this.prisma.officeLocation.create({
      data: {
        name: dto.name.trim(),
        address: dto.address?.trim() || null,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radius_meters ?? 150,
        isActive: dto.is_active ?? true,
        createdBy: actorId,
        updatedBy: actorId,
        organizations: organizationIds.length
          ? {
              create: organizationIds.map((organizationId) => ({
                organizationId,
                isPrimary: primaryOrganizationId ? organizationId === primaryOrganizationId : false
              }))
            }
          : undefined
      },
      include: {
        organizations: {
          include: { organization: { select: { id: true, name: true, code: true } } },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }]
        }
      }
    });

    return { success: true, data: this.serializeOfficeLocation(row) };
  }

  async updateOfficeLocation(userId: string, id: string, dto: UpsertOfficeLocationDto) {
    const actorId = toBigInt(userId);
    const officeLocationId = toBigInt(id);
    const existing = await this.prisma.officeLocation.findUnique({ where: { id: officeLocationId } });
    if (!existing) throw new NotFoundException('Office location not found');

    const organizationIds = dto.organization_ids ? this.uniqueBigInts(dto.organization_ids) : null;
    const primaryOrganizationId = dto.primary_organization_id ? toBigInt(dto.primary_organization_id) : null;
    if (organizationIds && primaryOrganizationId && !organizationIds.some((orgId) => orgId === primaryOrganizationId)) {
      organizationIds.unshift(primaryOrganizationId);
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (organizationIds) {
        await tx.organizationOfficeLocation.deleteMany({ where: { officeLocationId } });
      }
      const updated = await tx.officeLocation.update({
        where: { id: officeLocationId },
        data: {
          name: dto.name?.trim() || existing.name,
          address: dto.address === undefined ? existing.address : dto.address?.trim() || null,
          latitude: dto.latitude ?? existing.latitude,
          longitude: dto.longitude ?? existing.longitude,
          radiusMeters: dto.radius_meters ?? existing.radiusMeters,
          isActive: dto.is_active ?? existing.isActive,
          updatedBy: actorId,
          organizations: organizationIds
            ? {
                create: organizationIds.map((organizationId) => ({
                  organizationId,
                  isPrimary: primaryOrganizationId ? organizationId === primaryOrganizationId : false
                }))
              }
            : undefined
        },
        include: {
          organizations: {
            include: { organization: { select: { id: true, name: true, code: true } } },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }]
          }
        }
      });
      return updated;
    });

    return { success: true, data: this.serializeOfficeLocation(row) };
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

    const where = {
      ...(status ? { status } : {}),
      ...(targetUserId ? { userId: targetUserId } : {}),
      ...((fromDate || toDate)
        ? {
            workDate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {})
            }
          }
        : {}),
      ...(String(query.mine) === 'true' ? { OR: [{ requestedBy: actorId }, { reviewedBy: actorId }] } : {})
    };

    const [total, rows] = await Promise.all([
      this.prisma.attendanceCorrection.count({ where }),
      this.prisma.attendanceCorrection.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          requester: { select: { id: true, firstName: true, lastName: true, email: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
          officeLocation: { select: { id: true, name: true } },
          proposedOfficeLocation: { select: { id: true, name: true } }
        },
        orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
        skip,
        take: limit
      })
    ]);

    return paginatedResponse(
      rows.map((row) => this.serializeCorrection(row)),
      { page, per_page: limit, total }
    );
  }

  async createCorrection(userId: string, dto: CreateAttendanceCorrectionDto) {
    const actorId = toBigInt(userId);
    const workDate = this.toWorkDate(new Date(dto.work_date));
    const existingDaily = await this.prisma.attendanceDaily.findUnique({
      where: { unique_attendance_daily: { userId: actorId, workDate } }
    });
    const relevantEntry = dto.request_type === 'clock_in'
      ? await this.prisma.attendanceEntry.findFirst({ where: { userId: actorId, workDate, entryType: 'clock_in' }, orderBy: { entryAt: 'asc' } })
      : dto.request_type === 'clock_out'
        ? await this.prisma.attendanceEntry.findFirst({ where: { userId: actorId, workDate, entryType: 'clock_out' }, orderBy: { entryAt: 'desc' } })
        : await this.prisma.attendanceEntry.findFirst({ where: { userId: actorId, workDate }, orderBy: { entryAt: 'desc' } });

    const correction = await this.prisma.attendanceCorrection.create({
      data: {
        userId: actorId,
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
        proposedLatitude: dto.proposed_latitude ?? null,
        proposedLongitude: dto.proposed_longitude ?? null,
        snapshotJson: {
          daily: existingDaily ? this.serializeDaily(existingDaily) : null,
          entry: relevantEntry ? this.serializeEntry(relevantEntry) : null
        } as Prisma.InputJsonValue
      }
    });

    return { success: true, data: this.serializeCorrection(correction) };
  }

  async approveCorrection(userId: string, id: string, dto: ReviewAttendanceCorrectionDto) {
    const actorId = toBigInt(userId);
    const correction = await this.prisma.attendanceCorrection.findUnique({ where: { id } });
    if (!correction) throw new NotFoundException('Attendance correction not found');
    if (correction.status !== 'pending') throw new BadRequestException('Attendance correction is no longer pending');

    const profile = await this.getProfileContext(correction.userId);
    const policy = await this.resolveAttendancePolicy(correction.userId, profile);

    await this.prisma.$transaction(async (tx) => {
      if (correction.requestType === 'clock_in' || correction.requestType === 'clock_out') {
        if (!correction.proposedAt) throw new BadRequestException('Correction is missing the proposed time');
        await tx.attendanceEntry.create({
          data: {
            userId: correction.userId,
            entryType: correction.requestType,
            entryAt: correction.proposedAt,
            workDate: correction.workDate,
            attendanceMode: correction.proposedMode ?? null,
            officeLocationId: correction.proposedOfficeLocationId ?? correction.officeLocationId,
            latitude: correction.proposedLatitude,
            longitude: correction.proposedLongitude,
            geofenceStatus: this.evaluateGeofence({
              attendanceMode: (correction.proposedMode as AttendanceMode | null) ?? 'onsite',
              officeLocation: correction.proposedOfficeLocationId
                ? await tx.officeLocation.findUnique({ where: { id: correction.proposedOfficeLocationId } })
                : null,
              latitude: correction.proposedLatitude ? Number(correction.proposedLatitude) : undefined,
              longitude: correction.proposedLongitude ? Number(correction.proposedLongitude) : undefined
            }),
            source: 'admin',
            createdBy: actorId,
            metadata: { correction_id: correction.id, approved_by: actorId.toString() } as Prisma.InputJsonValue
          }
        });
      } else {
        const targetEntries = correction.attendanceEntryId
          ? await tx.attendanceEntry.findMany({ where: { id: correction.attendanceEntryId } })
          : await tx.attendanceEntry.findMany({ where: { userId: correction.userId, workDate: correction.workDate } });
        for (const entry of targetEntries) {
          await tx.attendanceEntry.update({
            where: { id: entry.id },
            data: {
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
                    officeLocation: correction.proposedOfficeLocationId
                      ? await tx.officeLocation.findUnique({ where: { id: correction.proposedOfficeLocationId } })
                      : null,
                    latitude: correction.proposedLatitude ? Number(correction.proposedLatitude) : undefined,
                    longitude: correction.proposedLongitude ? Number(correction.proposedLongitude) : undefined
                  })
                : entry.geofenceStatus
            }
          });
        }
      }

      await tx.attendanceCorrection.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedBy: actorId,
          reviewedAt: new Date(),
          reviewNotes: dto.review_notes?.trim() || null
        }
      });
    });

    const daily = await this.recomputeDay(correction.userId, correction.workDate, profile, policy);
    return { success: true, daily };
  }

  async rejectCorrection(userId: string, id: string, dto: ReviewAttendanceCorrectionDto) {
    const actorId = toBigInt(userId);
    const correction = await this.prisma.attendanceCorrection.findUnique({ where: { id } });
    if (!correction) throw new NotFoundException('Attendance correction not found');
    if (correction.status !== 'pending') throw new BadRequestException('Attendance correction is no longer pending');

    await this.prisma.attendanceCorrection.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedBy: actorId,
        reviewedAt: new Date(),
        reviewNotes: dto.review_notes?.trim() || null
      }
    });

    return { success: true };
  }

  async listExceptions(query: Record<string, any>) {
    const status = query.status ? String(query.status).trim().toLowerCase() : undefined;
    const targetUserId = query.user_id ? toBigInt(String(query.user_id)) : undefined;
    const fromDate = query.from ? this.toWorkDate(new Date(String(query.from))) : undefined;
    const toDate = query.to ? this.toWorkDate(new Date(String(query.to))) : undefined;

    const rows = await this.prisma.attendanceException.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(targetUserId ? { userId: targetUserId } : {}),
        ...((fromDate || toDate)
          ? {
              workDate: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {})
              }
            }
          : {})
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        officeLocation: { select: { id: true, name: true } }
      },
      orderBy: [{ status: 'asc' }, { workDate: 'desc' }, { createdAt: 'desc' }]
    });

    return { data: rows.map((row) => this.serializeException(row)) };
  }

  async createException(userId: string, dto: CreateAttendanceExceptionDto) {
    const actorId = toBigInt(userId);
    const targetUserId = toBigInt(dto.user_id);
    const workDate = this.toWorkDate(new Date(dto.work_date));
    const [daily, lastEntry] = await Promise.all([
      this.prisma.attendanceDaily.findUnique({ where: { unique_attendance_daily: { userId: targetUserId, workDate } } }),
      this.prisma.attendanceEntry.findFirst({ where: { userId: targetUserId, workDate }, orderBy: { entryAt: 'desc' } })
    ]);

    const row = await this.prisma.attendanceException.create({
      data: {
        userId: targetUserId,
        attendanceDailyId: daily?.id ?? null,
        attendanceEntryId: lastEntry?.id ?? null,
        officeLocationId: dto.office_location_id ? toBigInt(dto.office_location_id) : daily?.officeLocationId ?? null,
        exceptionType: dto.exception_type,
        status: 'active',
        workDate,
        attendanceMode: dto.attendance_mode ?? null,
        reason: dto.reason.trim(),
        notes: dto.notes?.trim() || null,
        createdBy: actorId
      }
    });

    const profile = await this.getProfileContext(targetUserId);
    const policy = await this.resolveAttendancePolicy(targetUserId, profile);
    await this.recomputeDay(targetUserId, workDate, profile, policy);

    return { success: true, data: this.serializeException(row) };
  }

  async resolveException(userId: string, id: string, dto: ReviewAttendanceExceptionDto) {
    const actorId = toBigInt(userId);
    const existing = await this.prisma.attendanceException.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Attendance exception not found');
    if (existing.status !== 'active') throw new BadRequestException('Attendance exception is no longer active');

    await this.prisma.attendanceException.update({
      where: { id },
      data: {
        status: 'resolved',
        reviewedBy: actorId,
        reviewedAt: new Date(),
        notes: dto.review_notes?.trim() ? `${existing.notes ? `${existing.notes}\n\n` : ''}Resolution: ${dto.review_notes.trim()}` : existing.notes
      }
    });

    const profile = await this.getProfileContext(existing.userId);
    const policy = await this.resolveAttendancePolicy(existing.userId, profile);
    await this.recomputeDay(existing.userId, existing.workDate, profile, policy);

    return { success: true };
  }

  private async recomputeDay(userId: bigint, workDate: Date, profileArg?: ProfileContext, policyArg?: AttendancePolicy) {
    const profile = profileArg ?? (await this.getProfileContext(userId));
    const [entries, policy, exceptions, corrections] = await Promise.all([
      this.prisma.attendanceEntry.findMany({
        where: { userId, workDate },
        orderBy: { entryAt: 'asc' }
      }),
      policyArg ? Promise.resolve(policyArg) : this.resolveAttendancePolicy(userId, profile),
      this.prisma.attendanceException.findMany({ where: { userId, workDate, status: 'active' }, orderBy: { createdAt: 'desc' } }),
      this.prisma.attendanceCorrection.findMany({ where: { userId, workDate, status: 'approved' }, orderBy: { reviewedAt: 'desc' } })
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
    const effectiveMode =
      (activeException?.attendanceMode as AttendanceMode | null) ??
      (latestEntry?.attendanceMode as AttendanceMode | null) ??
      this.resolveExpectedMode(profile, workDate, policy);

    const officeLocationId = activeException?.officeLocationId ?? latestEntry?.officeLocationId ?? null;
    const geofenceStatus = activeException
      ? 'not_applicable'
      : (firstClockIn?.geofenceStatus as GeofenceStatus | null) ?? null;

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
      status = 'corrected';
      reconciliationStatus = 'corrected';
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

    const daily = await this.prisma.attendanceDaily.upsert({
      where: {
        unique_attendance_daily: { userId, workDate }
      },
      update: {
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
        policySnapshot: policySnapshot as Prisma.InputJsonValue,
        computedAt: new Date()
      },
      create: {
        userId,
        workDate,
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
        policySnapshot: policySnapshot as Prisma.InputJsonValue,
        computedAt: new Date()
      }
    });

    return this.serializeDaily(daily);
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
    const policies = await this.prisma.policy.findMany({
      where: {
        module: 'attendance',
        policyKey: 'schedule',
        isActive: true,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }]
      }
    });

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

    const merged = matched.reduce<Record<string, unknown>>((acc, row) => {
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

  private async getProfileContext(userId: bigint): Promise<ProfileContext> {
    const [profile, primaryTeam] = await this.prisma.$transaction([
      this.prisma.profile.findUnique({
        where: { id: userId },
        include: {
          organizations: true,
          employeeProfile: { select: { workMode: true } },
          employeeMeta: true
        }
      }),
      this.prisma.groupUser.findFirst({
        where: { userId, isPrimary: true },
        select: { groupId: true }
      })
    ]);
    if (!profile) throw new NotFoundException('User profile not found');

    return {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      primaryOrganizationId: profile.primaryOrganizationId,
      primaryTeamId: primaryTeam?.groupId ?? null,
      workMode: profile.employeeProfile?.workMode ?? null,
      organizationIds: Array.from(
        new Set(
          [
            ...(profile.primaryOrganizationId ? [profile.primaryOrganizationId] : []),
            ...profile.organizations.map((row: any) => row.organizationId)
          ].filter(Boolean) as bigint[]
        )
      ),
      employeeMeta: (profile.employeeMeta ?? []).reduce<Record<string, unknown>>((acc, row: any) => {
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
    const rows = await this.prisma.officeLocation.findMany({
      where: {
        isActive: true,
        organizations: { some: { organizationId: { in: profile.organizationIds } } }
      },
      include: {
        organizations: {
          include: { organization: { select: { id: true, name: true, code: true } } },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }]
        }
      },
      orderBy: [{ name: 'asc' }]
    });
    return rows.map((row) => this.serializeOfficeLocation(row));
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
      const row = await this.prisma.officeLocation.findFirst({
        where: {
          id: requestedOfficeLocationId,
          isActive: true,
          organizations: { some: { organizationId: { in: input.profile.organizationIds } } }
        }
      });
      if (!row) throw new BadRequestException('Office location is not available for this staff member');
      return row;
    }

    return this.prisma.officeLocation.findFirst({
      where: {
        isActive: true,
        organizations: { some: { organizationId: { in: input.profile.organizationIds } } }
      },
      orderBy: [{ organizations: { _count: 'desc' } }, { id: 'asc' }]
    });
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
    const rows = await this.prisma.attendanceHoliday.findMany({
      where: {
        isActive: true,
        OR: [
          ...(officeLocationId ? [{ officeLocationId }] : []),
          ...(profile.organizationIds.length ? [{ organizationId: { in: profile.organizationIds } }] : [])
        ]
      },
      orderBy: [{ officeLocationId: 'desc' }, { organizationId: 'desc' }, { createdAt: 'desc' }]
    });
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
    const requests = await this.prisma.requestInstance.findMany({
      where: {
        createdBy: userId,
        status: { in: ['approved', 'completed'] }
      },
      select: {
        id: true,
        data: true,
        requestType: { select: { taxonomyKeys: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 250
    });

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
    officeLocation: { latitude: Prisma.Decimal | number; longitude: Prisma.Decimal | number; radiusMeters: number } | null;
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
}
