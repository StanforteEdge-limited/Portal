import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SQL, and, asc, count, desc, eq, exists, gte, ilike, inArray, isNull, lte, ne, or, sum } from 'drizzle-orm';
import type { EmploymentStatus, EmploymentType, GroupUserRole } from '$app/db/enums';
import { DbService, type AppDb } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { randomToken } from '$common/utils/crypto';
import { parseBigIntId, toBigInt } from '$common/utils/ids';
import { isLeaveRequestType, objectSchema, policyScopeMatches, policyScopeRank, resolveLeaveTypeKey } from '$common/utils/leave-policy';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { generateUniqueUsername, makeUsernameSeed } from '$common/utils/username';
import { employeeProfile, employeeMeta, hrDesignation, leaveBalanceLedger, onboardingProgress } from '$modules/hrm/employees/model';
import { profile, type Profile } from '$modules/identity/users/model';
import { role, userRole } from '$modules/identity/rbac/model';
import { organization, profileOrganization } from '$modules/hrm/organizations/model';
import { group, groupUser } from '$modules/communication/groups/model';
import { form, formAssignment } from '$modules/hrm/forms/model';
import { project, projectMember } from '$modules/hrm/projects/model';
import { document as documentTable } from '$modules/hrm/documents/model';
import { policy } from '$modules/hrm/policies/model';
import { requestType } from '$modules/hrm/requests/model';
import { SetPrimaryOrganizationDto } from '$modules/hrm/employees/dto/set-primary-organization.dto';
import { EmployeeActionDto, UpsertEmployeeDto } from '$modules/hrm/employees/dto/upsert-employee.dto';
import { AdjustLeaveBalanceDto } from '$modules/hrm/employees/dto/leave-balance.dto';
import {
  AssignEmployeeOrganizationDto,
  AssignEmployeeTeamDto,
  AssignOnboardingFormDto,
  UpdateOnboardingFormAssignmentDto
} from '$modules/hrm/employees/dto/manage-employee-links.dto';

type TxClient = Parameters<Parameters<AppDb['transaction']>[0]>[0];
type WorkMode = 'onsite' | 'hybrid' | 'remote';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private currentTenantId(): bigint | undefined {
    return this.tenantContext.currentTenantId();
  }

  private async requireScopedEmployee(profileId: bigint): Promise<void> {
    const tid = this.currentTenantId();
    if (tid) {
      const [scoped] = await this.db.client
        .select({ id: employeeProfile.id })
        .from(employeeProfile)
        .where(and(eq(employeeProfile.userId, profileId), eq(employeeProfile.tenantId, tid)))
        .limit(1);
      if (!scoped) throw new NotFoundException('Employee not found');
      return;
    }
    const [existingProfile] = await this.db.client.select().from(profile).where(eq(profile.id, profileId)).limit(1);
    if (!existingProfile || !['staff', 'employee'].includes(existingProfile.type)) {
      throw new NotFoundException('Employee not found');
    }
  }

  async summary() {
    const tid = this.currentTenantId();
    const totalCond = tid
      ? and(
          inArray(profile.type, ['staff', 'employee']),
          exists(
            this.db.client
              .select({ id: employeeProfile.id })
              .from(employeeProfile)
              .where(and(eq(employeeProfile.userId, profile.id), eq(employeeProfile.tenantId, tid)))
          )
        )
      : inArray(profile.type, ['staff', 'employee']);

    const [totalRows, activeRows, inactiveRows] = await Promise.all([
      this.db.client.select({ value: count() }).from(profile).where(totalCond),
      this.db.client
        .select({ value: count() })
        .from(employeeProfile)
        .where(and(eq(employeeProfile.employmentStatus, 'active'), tid ? eq(employeeProfile.tenantId, tid) : undefined)),
      this.db.client
        .select({ value: count() })
        .from(employeeProfile)
        .where(
          and(
            inArray(employeeProfile.employmentStatus, ['draft', 'suspended', 'exited']),
            tid ? eq(employeeProfile.tenantId, tid) : undefined
          )
        )
    ]);
    const [pendingRows] = await this.db.client
      .select({ value: count() })
      .from(onboardingProgress)
      .where(
        inArray(onboardingProgress.status, ['invited', 'accepted', 'profile_pending', 'forms_pending', 'hr_review'])
      );

    return {
      total: Number(totalRows[0]?.value ?? 0),
      active: Number(activeRows[0]?.value ?? 0),
      inactive: Number(inactiveRows[0]?.value ?? 0),
      onboarding_pending: Number(pendingRows?.value ?? 0)
    };
  }

  async listEmployees(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const conditions: SQL[] = [inArray(profile.type, ['staff', 'employee'])];

    if (query.search) {
      const term = `%${String(query.search).trim()}%`;
      conditions.push(
        or(
          ilike(profile.username, term),
          ilike(profile.email, term),
          ilike(profile.firstName, term),
          ilike(profile.lastName, term)
        ) as SQL
      );
    }

    if (query.status) conditions.push(eq(profile.status, String(query.status)));

    const tid = this.currentTenantId();
    const empConditions: SQL[] = [];
    if (tid) empConditions.push(eq(employeeProfile.tenantId, tid));
    if (query.employment_status) empConditions.push(eq(employeeProfile.employmentStatus, String(query.employment_status) as EmploymentStatus));
    if (query.employment_type) empConditions.push(eq(employeeProfile.employmentType, String(query.employment_type) as EmploymentType));
    if (empConditions.length > 0) {
      conditions.push(
        exists(
          this.db.client
            .select({ id: employeeProfile.id })
            .from(employeeProfile)
            .where(and(eq(employeeProfile.userId, profile.id), ...empConditions))
        )
      );
    }

    if (query.organization_id) {
      const organizationId = parseBigIntId(String(query.organization_id), 'organization id');
      conditions.push(
        exists(
          this.db.client
            .select({ id: profileOrganization.id })
            .from(profileOrganization)
            .where(
              and(
                eq(profileOrganization.profileId, profile.id),
                eq(profileOrganization.organizationId, organizationId)
              )
            )
        )
      );
    }

    const [rows, totalRows] = await Promise.all([
      this.db.client
        .select()
        .from(profile)
        .where(and(...conditions))
        .orderBy(desc(profile.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),
      this.db.client.select({ value: count() }).from(profile).where(and(...conditions))
    ]);

    const details = await this.buildEmployeeDetails(rows);
    const data = rows.map((row) => this.serializeEmployee({ ...row, ...details.get(row.id)! }));

    return paginatedResponse(data, { page, per_page: perPage, total: Number(totalRows[0]?.value ?? 0) });
  }

  async createEmployee(dto: UpsertEmployeeDto) {
    try {
      const profileId = await this.db.client.transaction(async (tx) => {
        let profileId: bigint;
        let resolvedPrimaryOrganizationId = dto.primary_organization_id?.trim() || undefined;

        if (dto.user_id) {
          profileId = parseBigIntId(dto.user_id, 'user id');
          const [existing] = await tx.select().from(profile).where(eq(profile.id, profileId)).limit(1);
          if (!existing) throw new NotFoundException('User not found');
          if (!resolvedPrimaryOrganizationId && existing.primaryOrganizationId) {
            resolvedPrimaryOrganizationId = existing.primaryOrganizationId.toString();
          }
        } else {
          if (!dto.email || !dto.first_name || !dto.last_name) {
            throw new BadRequestException('email, first_name and last_name are required for new employee');
          }
          if (!resolvedPrimaryOrganizationId) {
            throw new BadRequestException('primary_organization_id is required');
          }

          const email = dto.email.trim().toLowerCase();
          const requestedUsername = dto.username?.trim();
          const username = requestedUsername
            ? requestedUsername
            : await generateUniqueUsername(
                makeUsernameSeed(dto.first_name, dto.last_name, email.split('@')[0]),
                async (candidate) =>
                  Boolean((await tx.select({ id: profile.id }).from(profile).where(eq(profile.username, candidate)).limit(1))[0])
              );

          const [emailExists, usernameExists] = await Promise.all([
            tx.select({ id: profile.id }).from(profile).where(eq(profile.email, email)).limit(1),
            requestedUsername
              ? tx.select({ id: profile.id }).from(profile).where(eq(profile.username, username)).limit(1)
              : Promise.resolve<Array<{ id: bigint }>>([])
          ]);

          if (emailExists[0]) throw new BadRequestException('Email already exists');
          if (usernameExists[0]) throw new BadRequestException('Username already exists');

          const tempPassword = randomToken(10);
          const passwordHash = await bcrypt.hash(tempPassword, 12);
          const [createdUser] = await tx
            .insert(profile)
            .values({
              username,
              email,
              passwordHash,
              type: 'staff',
              status: 'invited',
              firstName: dto.first_name,
              lastName: dto.last_name,
              phone: dto.phone
            })
            .returning();
          profileId = createdUser.id;
        }

        if (!resolvedPrimaryOrganizationId) {
          throw new BadRequestException(
            'Primary organization is required. Set it on the user first or choose one in employee organizations.'
          );
        }

        await this.upsertEmployeeProfileTx(
          tx,
          profileId,
          {
            ...dto,
            primary_organization_id: resolvedPrimaryOrganizationId
          },
          null
        );

        return profileId;
      });

      const createdProfile = await this.findEmployeeProfile(profileId);

      if (!createdProfile || !['staff', 'employee'].includes(createdProfile.type)) {
        throw new NotFoundException('Employee not found');
      }

      return this.serializeEmployee(createdProfile);
    } catch (error) {
      this.handleEmployeePersistenceError(error);
      throw error;
    }
  }

  async getEmployee(id: string) {
    const profileId = parseBigIntId(id, 'employee id');
    const tid = this.currentTenantId();
    if (tid) {
      const [scoped] = await this.db.client
        .select({ id: employeeProfile.id })
        .from(employeeProfile)
        .where(and(eq(employeeProfile.userId, profileId), eq(employeeProfile.tenantId, tid)))
        .limit(1);
      if (!scoped) throw new NotFoundException('Employee not found');
    }

    const employee = await this.findEmployeeProfile(profileId);

    if (!employee || !['staff', 'employee'].includes(employee.type)) {
      throw new NotFoundException('Employee not found');
    }

    return this.serializeEmployee(employee);
  }

  async updateEmployee(id: string, dto: UpsertEmployeeDto) {
    const profileId = parseBigIntId(id, 'employee id');
    const tid = this.currentTenantId();
    if (tid) {
      const [scoped] = await this.db.client
        .select({ id: employeeProfile.id })
        .from(employeeProfile)
        .where(and(eq(employeeProfile.userId, profileId), eq(employeeProfile.tenantId, tid)))
        .limit(1);
      if (!scoped) throw new NotFoundException('Employee not found');
    }
    const [currentProfile] = await this.db.client.select().from(profile).where(eq(profile.id, profileId)).limit(1);
    if (!currentProfile || !['staff', 'employee'].includes(currentProfile.type)) {
      throw new NotFoundException('Employee not found');
    }

    const nextEmail = dto.email ? dto.email.trim().toLowerCase() : currentProfile.email;
    const nextUsername = dto.username !== undefined ? this.normalizeOptionalText(dto.username) : currentProfile.username;
    if (dto.email !== undefined && nextEmail !== currentProfile.email) {
      const [existingEmail] = await this.db.client
        .select({ id: profile.id })
        .from(profile)
        .where(and(eq(profile.email, nextEmail), ne(profile.id, profileId)))
        .limit(1);
      if (existingEmail) throw new BadRequestException('Email already exists');
    }
    if (dto.username !== undefined && nextUsername && nextUsername !== currentProfile.username) {
      const [existingUsername] = await this.db.client
        .select({ id: profile.id })
        .from(profile)
        .where(and(eq(profile.username, nextUsername), ne(profile.id, profileId)))
        .limit(1);
      if (existingUsername) throw new BadRequestException('Username already exists');
    }

    try {
      await this.db.client.transaction(async (tx) => {
        await tx
          .update(profile)
          .set({
            firstName: dto.first_name ?? currentProfile.firstName,
            lastName: dto.last_name ?? currentProfile.lastName,
            phone: dto.phone ?? currentProfile.phone,
            email: nextEmail,
            username: nextUsername
          })
          .where(eq(profile.id, profileId));

        await this.upsertEmployeeProfileTx(tx, profileId, dto, profileId);
      });
      return this.getEmployee(profileId.toString());
    } catch (error) {
      this.handleEmployeePersistenceError(error);
      throw error;
    }
  }

  async runEmployeeAction(id: string, dto: EmployeeActionDto) {
    const profileId = parseBigIntId(id, 'employee id');
    const tid = this.currentTenantId();
    const [existing] = await this.db.client
      .select()
      .from(employeeProfile)
      .where(and(eq(employeeProfile.userId, profileId), tid ? eq(employeeProfile.tenantId, tid) : undefined))
      .limit(1);
    if (!existing) throw new NotFoundException('Employee profile not found');

    const nextStatus: EmploymentStatus =
      dto.action === 'activate' ? 'active' : dto.action === 'suspend' ? 'suspended' : 'exited';

    await this.db.client
      .update(employeeProfile)
      .set({
        employmentStatus: nextStatus,
        exitDate: dto.action === 'exit' ? new Date(dto.effective_date ?? Date.now()) : null
      })
      .where(eq(employeeProfile.id, existing.id));

    await this.db.client
      .update(profile)
      .set({ status: nextStatus === 'active' ? 'active' : 'inactive' })
      .where(eq(profile.id, profileId));

    return this.getEmployee(profileId.toString());
  }

  async setPrimaryOrganization(id: string, dto: SetPrimaryOrganizationDto) {
    const profileId = parseBigIntId(id, 'employee id');
    const organizationId = parseBigIntId(dto.organization_id, 'organization id');
    const tid = this.currentTenantId();

    if (tid) {
      const [scoped] = await this.db.client
        .select({ id: employeeProfile.id })
        .from(employeeProfile)
        .where(and(eq(employeeProfile.userId, profileId), eq(employeeProfile.tenantId, tid)))
        .limit(1);
      if (!scoped) throw new NotFoundException('Employee not found');
    }

    const [organizationRow] = await this.db.client
      .select()
      .from(organization)
      .where(and(eq(organization.id, organizationId), tid ? eq(organization.tenantId, tid) : undefined))
      .limit(1);

    if (!organizationRow) throw new NotFoundException('Organization not found');

    await this.db.client.transaction(async (tx) => {
      await tx
        .update(profileOrganization)
        .set({ isPrimary: false })
        .where(
          and(
            eq(profileOrganization.profileId, profileId),
            eq(profileOrganization.isPrimary, true),
            tid ? eq(profileOrganization.tenantId, tid) : undefined
          )
        );

      await tx
        .insert(profileOrganization)
        .values({
          profileId,
          organizationId,
          tenantId: tid ?? null,
          isPrimary: true,
          createdAt: new Date()
        })
        .onConflictDoUpdate({
          target: [profileOrganization.profileId, profileOrganization.organizationId],
          set: { isPrimary: true, ...(tid ? { tenantId: tid } : {}) }
        });

      await tx
        .update(profile)
        .set({ primaryOrganizationId: organizationId })
        .where(eq(profile.id, profileId));
    });

    return this.getEmployee(id);
  }

  async addOrganizationMembership(id: string, dto: AssignEmployeeOrganizationDto) {
    const profileId = parseBigIntId(id, 'employee id');
    const organizationId = parseBigIntId(dto.organization_id, 'organization id');
    const tid = this.currentTenantId();

    await this.requireScopedEmployee(profileId);

    const [organizationRow] = await this.db.client
      .select()
      .from(organization)
      .where(and(eq(organization.id, organizationId), tid ? eq(organization.tenantId, tid) : undefined))
      .limit(1);
    if (!organizationRow) throw new NotFoundException('Organization not found');

    await this.db.client
      .insert(profileOrganization)
      .values({
        profileId,
        organizationId,
        tenantId: tid ?? null,
        isPrimary: Boolean(dto.is_primary),
        createdAt: new Date()
      })
      .onConflictDoUpdate({
        target: [profileOrganization.profileId, profileOrganization.organizationId],
        set: { isPrimary: Boolean(dto.is_primary), ...(tid ? { tenantId: tid } : {}) }
      });

    if (dto.is_primary) {
      await this.db.client.transaction(async (tx) => {
        await tx
          .update(profileOrganization)
          .set({ isPrimary: false })
          .where(
            and(
              eq(profileOrganization.profileId, profileId),
              ne(profileOrganization.organizationId, organizationId),
              eq(profileOrganization.isPrimary, true),
              tid ? eq(profileOrganization.tenantId, tid) : undefined
            )
          );
        await tx
          .update(profile)
          .set({ primaryOrganizationId: organizationId })
          .where(eq(profile.id, profileId));
      });
    }

    return this.getEmployee(id);
  }

  async removeOrganizationMembership(id: string, organizationIdParam: string) {
    const profileId = parseBigIntId(id, 'employee id');
    const organizationId = parseBigIntId(organizationIdParam, 'organization id');
    const tid = this.currentTenantId();

    await this.requireScopedEmployee(profileId);

    const [membership] = await this.db.client
      .select()
      .from(profileOrganization)
      .where(
        and(
          eq(profileOrganization.profileId, profileId),
          eq(profileOrganization.organizationId, organizationId),
          tid ? eq(profileOrganization.tenantId, tid) : undefined
        )
      )
      .limit(1);
    if (!membership) throw new NotFoundException('Organization membership not found');

    await this.db.client
      .delete(profileOrganization)
      .where(and(eq(profileOrganization.id, membership.id), tid ? eq(profileOrganization.tenantId, tid) : undefined));

    const [primary] = await this.db.client
      .select()
      .from(profileOrganization)
      .where(
        and(
          eq(profileOrganization.profileId, profileId),
          eq(profileOrganization.isPrimary, true),
          tid ? eq(profileOrganization.tenantId, tid) : undefined
        )
      )
      .limit(1);

    await this.db.client
      .update(profile)
      .set({ primaryOrganizationId: primary?.organizationId ?? null })
      .where(eq(profile.id, profileId));

    return this.getEmployee(id);
  }

  async addTeamMembership(id: string, dto: AssignEmployeeTeamDto) {
    const profileId = parseBigIntId(id, 'employee id');
    const teamId = parseBigIntId(dto.team_id, 'team id');
    const tid = this.currentTenantId();

    await this.requireScopedEmployee(profileId);

    const [team] = await this.db.client
      .select()
      .from(group)
      .where(and(eq(group.id, teamId), tid ? eq(group.tenantId, tid) : undefined))
      .limit(1);
    if (!team) throw new NotFoundException('Team not found');

    const role: GroupUserRole =
      dto.role === 'lead'
        ? GroupUserRole.moderator
        : dto.role === 'manager'
          ? GroupUserRole.admin
          : GroupUserRole.member;

    const [existingPrimary] = await this.db.client
      .select({ id: groupUser.id })
      .from(groupUser)
      .where(and(eq(groupUser.userId, profileId), eq(groupUser.isPrimary, true)))
      .limit(1);
    const makePrimary = !existingPrimary;

    await this.db.client
      .insert(groupUser)
      .values({
        groupId: teamId,
        userId: profileId,
        role,
        isPrimary: makePrimary
      })
      .onConflictDoUpdate({
        target: [groupUser.groupId, groupUser.userId],
        set: {
          role,
          isPrimary: makePrimary
        }
      });

    return this.getEmployee(id);
  }

  async removeTeamMembership(id: string, teamIdParam: string) {
    const profileId = parseBigIntId(id, 'employee id');
    const teamId = parseBigIntId(teamIdParam, 'team id');
    const tid = this.currentTenantId();

    await this.requireScopedEmployee(profileId);

    const [team] = await this.db.client
      .select()
      .from(group)
      .where(and(eq(group.id, teamId), tid ? eq(group.tenantId, tid) : undefined))
      .limit(1);
    if (!team) throw new NotFoundException('Team not found');

    await this.db.client
      .delete(groupUser)
      .where(and(eq(groupUser.groupId, teamId), eq(groupUser.userId, profileId)));

    const [fallbackTeam] = await this.db.client
      .select()
      .from(groupUser)
      .where(eq(groupUser.userId, profileId))
      .orderBy(asc(groupUser.joinedAt))
      .limit(1);

    if (fallbackTeam) {
      await this.db.client
        .update(groupUser)
        .set({ isPrimary: true })
        .where(eq(groupUser.id, fallbackTeam.id));
    }

    return this.getEmployee(id);
  }

  async listOnboardingFormAssignments(query: Record<string, any>) {
    const tid = this.currentTenantId();
    const conditions: SQL[] = [];
    if (tid) conditions.push(eq(formAssignment.tenantId, tid));
    if (query.form_id) conditions.push(eq(formAssignment.formId, String(query.form_id)));
    if (query.profile_id) conditions.push(eq(formAssignment.assignedToProfileId, parseBigIntId(String(query.profile_id), 'profile id')));
    if (query.role_slug) conditions.push(eq(formAssignment.assignedToRole, String(query.role_slug)));

    const rows = await this.db.client
      .select({
        id: formAssignment.id,
        formId: formAssignment.formId,
        assignedToRole: formAssignment.assignedToRole,
        assignedToProfileId: formAssignment.assignedToProfileId,
        dueDate: formAssignment.dueDate,
        createdAt: formAssignment.createdAt,
        formName: form.name,
        module: form.module,
        formIsActive: form.isActive
      })
      .from(formAssignment)
      .leftJoin(form, eq(formAssignment.formId, form.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(formAssignment.dueDate), desc(formAssignment.createdAt));

    const items = rows.map((row) => ({
      id: row.id,
      form_id: row.formId,
      form_name: row.formName,
      module: row.module,
      assigned_to_role: row.assignedToRole,
      assigned_to_profile_id: row.assignedToProfileId ? row.assignedToProfileId.toString() : null,
      due_date: row.dueDate,
      created_at: row.createdAt
    }));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async assignOnboardingForm(dto: AssignOnboardingFormDto) {
    if (!dto.profile_id && !dto.role_slug) {
      throw new BadRequestException('Either profile_id or role_slug is required');
    }
    const tid = this.currentTenantId();
    const [scopedForm] = await this.db.client
      .select()
      .from(form)
      .where(
        and(
          eq(form.id, dto.form_id),
          eq(form.isActive, true),
          tid ? or(eq(form.tenantId, tid), isNull(form.tenantId)) : undefined
        )
      )
      .limit(1);
    if (!scopedForm) throw new NotFoundException('Form not found');

    const assignedToProfileId = dto.profile_id ? parseBigIntId(dto.profile_id, 'profile id') : null;
    if (assignedToProfileId) {
      const [existingUser] = await this.db.client.select().from(profile).where(eq(profile.id, assignedToProfileId)).limit(1);
      if (!existingUser) throw new NotFoundException('Profile not found');
    }

    const [assignment] = await this.db.client
      .insert(formAssignment)
      .values({
        tenantId: tid ?? null,
        formId: dto.form_id,
        assignedToRole: dto.role_slug ?? null,
        assignedToProfileId,
        dueDate: dto.due_date ? new Date(dto.due_date) : null
      })
      .returning();
    return assignment;
  }

  async deleteOnboardingFormAssignment(id: string) {
    const tid = this.currentTenantId();
    const [existing] = await this.db.client
      .select()
      .from(formAssignment)
      .where(and(eq(formAssignment.id, id), tid ? eq(formAssignment.tenantId, tid) : undefined))
      .limit(1);
    if (!existing) throw new NotFoundException('Form assignment not found');
    await this.db.client
      .delete(formAssignment)
      .where(and(eq(formAssignment.id, id), tid ? eq(formAssignment.tenantId, tid) : undefined));
    return { success: true };
  }

  async updateOnboardingFormAssignment(id: string, dto: UpdateOnboardingFormAssignmentDto) {
    const tid = this.currentTenantId();
    const [existing] = await this.db.client
      .select()
      .from(formAssignment)
      .where(and(eq(formAssignment.id, id), tid ? eq(formAssignment.tenantId, tid) : undefined))
      .limit(1);
    if (!existing) throw new NotFoundException('Form assignment not found');

    let assignedToProfileId: bigint | null | undefined;
    if (dto.profile_id !== undefined) {
      assignedToProfileId = dto.profile_id ? parseBigIntId(dto.profile_id, 'profile id') : null;
      if (assignedToProfileId) {
        const [existingUser] = await this.db.client.select().from(profile).where(eq(profile.id, assignedToProfileId)).limit(1);
        if (!existingUser) throw new NotFoundException('Profile not found');
      }
    }

    const formId = dto.form_id ?? existing.formId;
    if (dto.form_id) {
      const [scopedForm] = await this.db.client
        .select()
        .from(form)
        .where(
          and(
            eq(form.id, dto.form_id),
            eq(form.isActive, true),
            tid ? or(eq(form.tenantId, tid), isNull(form.tenantId)) : undefined
          )
        )
        .limit(1);
      if (!scopedForm) throw new NotFoundException('Form not found');
    }

    const assignedToRole = dto.role_slug !== undefined ? dto.role_slug || null : existing.assignedToRole;
    const resolvedProfileId =
      assignedToProfileId !== undefined ? assignedToProfileId : existing.assignedToProfileId;

    if (!assignedToRole && !resolvedProfileId) {
      throw new BadRequestException('Either profile_id or role_slug is required');
    }

    const [updated] = await this.db.client
      .update(formAssignment)
      .set({
        formId,
        assignedToRole,
        assignedToProfileId: resolvedProfileId,
        dueDate: dto.due_date !== undefined ? (dto.due_date ? new Date(dto.due_date) : null) : undefined
      })
      .where(and(eq(formAssignment.id, id), tid ? eq(formAssignment.tenantId, tid) : undefined))
      .returning();
    return updated;
  }

  async getLeaveBalance(query: Record<string, any>) {
    const year = Number(query.year ?? new Date().getFullYear());
    const userId = query.user_id ? parseBigIntId(String(query.user_id), 'user id') : undefined;
    const tid = this.currentTenantId();

    const conditions: SQL[] = [
      eq(leaveBalanceLedger.periodYear, year),
      ...(tid ? [eq(leaveBalanceLedger.tenantId, tid)] : []),
      ...(userId ? [eq(leaveBalanceLedger.userId, userId)] : [])
    ];

    const rows = await this.db.client
      .select()
      .from(leaveBalanceLedger)
      .where(and(...conditions))
      .orderBy(asc(leaveBalanceLedger.userId), asc(leaveBalanceLedger.leaveTypeKey), asc(leaveBalanceLedger.createdAt));

    const entitlementByUser = new Map<string, Record<string, number>>();
    const balanceMap = new Map<string, { user_id: string; leave_type_key: string; entitled: number; used: number; adjustments: number; available: number }>();

    const touch = async (uid: string, leaveType: string) => {
      const key = `${uid}:${leaveType}`;
      if (!balanceMap.has(key)) {
        if (!entitlementByUser.has(uid)) {
          entitlementByUser.set(uid, await this.resolveLeaveEntitlementPolicy(BigInt(uid), year));
        }
        const entitled = Number(entitlementByUser.get(uid)?.[leaveType] ?? 0);
        balanceMap.set(key, {
          user_id: uid,
          leave_type_key: leaveType,
          entitled,
          used: 0,
          adjustments: 0,
          available: entitled
        });
      }
      return balanceMap.get(key)!;
    };

    for (const row of rows) {
      const uid = row.userId.toString();
      const leaveType = row.leaveTypeKey;
      const bucket = await touch(uid, leaveType);
      const delta = Number(row.deltaDays ?? 0);
      if (delta < 0) bucket.used += Math.abs(delta);
      else bucket.adjustments += delta;
      bucket.available = bucket.entitled + bucket.adjustments - bucket.used;
    }

    return {
      year,
      data: Array.from(balanceMap.values()).sort((a, b) =>
        a.user_id === b.user_id ? a.leave_type_key.localeCompare(b.leave_type_key) : a.user_id.localeCompare(b.user_id)
      )
    };
  }

  async adjustLeaveBalance(dto: AdjustLeaveBalanceDto, actorId?: string) {
    const userId = parseBigIntId(dto.user_id, 'user id');
    const leaveTypeKey = dto.leave_type_key.trim().toLowerCase();
    const periodYear = Number(dto.period_year);
    if (!Number.isFinite(periodYear) || periodYear < 2000 || periodYear > 2100) {
      throw new BadRequestException('Invalid period_year');
    }

    const [existingUser] = await this.db.client.select({ id: profile.id }).from(profile).where(eq(profile.id, userId)).limit(1);
    if (!existingUser) throw new NotFoundException('User not found');

    const [row] = await this.db.client
      .insert(leaveBalanceLedger)
      .values({
        tenantId: this.currentTenantId() ?? null,
        userId,
        leaveTypeKey,
        periodYear,
        deltaDays: String(dto.delta_days),
        entryType: dto.entry_type?.trim() || 'adjustment',
        notes: dto.notes ?? null,
        createdBy: actorId ? toBigInt(actorId) : null
      })
      .returning();

    return {
      id: row.id,
      user_id: row.userId.toString(),
      leave_type_key: row.leaveTypeKey,
      period_year: row.periodYear,
      delta_days: Number(row.deltaDays),
      entry_type: row.entryType,
      notes: row.notes,
      created_at: row.createdAt
    };
  }

  private async upsertEmployeeProfileTx(
    tx: TxClient,
    profileId: bigint,
    dto: UpsertEmployeeDto,
    actorId: bigint | null
  ) {
    const tid = this.currentTenantId();
    const managerUserId = dto.manager_user_id ? parseBigIntId(dto.manager_user_id, 'manager user id') : undefined;
    const primaryTeamId = dto.primary_team_id ? parseBigIntId(dto.primary_team_id, 'primary team id') : undefined;
    const primaryOrganizationId = dto.primary_organization_id
      ? parseBigIntId(dto.primary_organization_id, 'primary organization id')
      : undefined;
    const designationId = dto.designation_id !== undefined
      ? (dto.designation_id ? parseBigIntId(dto.designation_id, 'designation id') : null)
      : undefined;
    const employeeCode = this.normalizeOptionalText(dto.employee_code);
    const jobTitle = this.normalizeOptionalText(dto.job_title);
    const jobDescription = this.normalizeOptionalText(dto.job_description);

    if (tid) {
      const [existingEmp] = await tx.select().from(employeeProfile).where(eq(employeeProfile.userId, profileId)).limit(1);
      if (existingEmp && existingEmp.tenantId !== tid) {
        throw new NotFoundException('Employee not found');
      }
    }

    if (managerUserId) {
      const [managerExists] = await tx.select({ id: profile.id }).from(profile).where(eq(profile.id, managerUserId)).limit(1);
      if (!managerExists) throw new BadRequestException('Manager not found');
    }
    if (primaryTeamId) {
      const [teamExists] = await tx
        .select({ id: group.id })
        .from(group)
        .where(and(eq(group.id, primaryTeamId), tid ? eq(group.tenantId, tid) : undefined))
        .limit(1);
      if (!teamExists) throw new BadRequestException('Primary team not found');
    }
    if (primaryOrganizationId) {
      const [organizationExists] = await tx
        .select({ id: organization.id })
        .from(organization)
        .where(and(eq(organization.id, primaryOrganizationId), tid ? eq(organization.tenantId, tid) : undefined))
        .limit(1);
      if (!organizationExists) throw new NotFoundException('Organization not found');
    }
    if (designationId) {
      const [designationExists] = await tx
        .select({ id: hrDesignation.id })
        .from(hrDesignation)
        .where(eq(hrDesignation.id, designationId))
        .limit(1);
      if (!designationExists) throw new BadRequestException('Designation template not found');
    }
    if (employeeCode) {
      const [employeeCodeExists] = await tx
        .select({ id: employeeProfile.id })
        .from(employeeProfile)
        .where(
          and(
            eq(employeeProfile.employeeCode, employeeCode),
            ne(employeeProfile.userId, profileId),
            tid ? eq(employeeProfile.tenantId, tid) : undefined
          )
        )
        .limit(1);
      if (employeeCodeExists) throw new BadRequestException('Employee code already exists');
    }

    await tx
      .insert(employeeProfile)
      .values({
        userId: profileId,
        tenantId: tid ?? null,
        employeeCode,
        jobTitle,
        jobDescription,
        managerUserId,
        designationId: designationId ?? null,
        employmentType: dto.employment_type as EmploymentType | undefined,
        employmentStatus: (dto.employment_status ?? 'draft') as EmploymentStatus,
        workMode: dto.work_mode as WorkMode | undefined,
        hireDate: dto.hire_date ? new Date(dto.hire_date) : undefined,
        confirmationDate: dto.confirmation_date ? new Date(dto.confirmation_date) : undefined,
        exitDate: dto.exit_date ? new Date(dto.exit_date) : undefined,
        createdBy: actorId ?? undefined,
        updatedBy: actorId ?? undefined
      })
      .onConflictDoUpdate({
        target: employeeProfile.userId,
        set: {
          ...(tid ? { tenantId: tid } : {}),
          employeeCode,
          jobTitle,
          jobDescription,
          managerUserId,
          designationId: dto.designation_id !== undefined ? (designationId ?? null) : undefined,
          employmentType: dto.employment_type as EmploymentType | undefined,
          employmentStatus: dto.employment_status as EmploymentStatus | undefined,
          workMode: dto.work_mode as WorkMode | undefined,
          hireDate: dto.hire_date ? new Date(dto.hire_date) : undefined,
          confirmationDate: dto.confirmation_date ? new Date(dto.confirmation_date) : undefined,
          exitDate: dto.exit_date ? new Date(dto.exit_date) : undefined,
          updatedBy: actorId ?? undefined
        }
      });

    if (primaryOrganizationId) {
      await tx
        .update(profileOrganization)
        .set({ isPrimary: false })
        .where(
          and(
            eq(profileOrganization.profileId, profileId),
            eq(profileOrganization.isPrimary, true),
            ne(profileOrganization.organizationId, primaryOrganizationId),
            tid ? eq(profileOrganization.tenantId, tid) : undefined
          )
        );
      await tx
        .insert(profileOrganization)
        .values({
          profileId,
          organizationId: primaryOrganizationId,
          tenantId: tid ?? null,
          isPrimary: true,
          createdAt: new Date()
        })
        .onConflictDoUpdate({
          target: [profileOrganization.profileId, profileOrganization.organizationId],
          set: { isPrimary: true, ...(tid ? { tenantId: tid } : {}) }
        });
      await tx
        .update(profile)
        .set({ primaryOrganizationId })
        .where(eq(profile.id, profileId));
    }

    if (primaryTeamId) {
      await tx
        .update(groupUser)
        .set({ isPrimary: false })
        .where(and(eq(groupUser.userId, profileId), eq(groupUser.isPrimary, true)));
      await tx
        .insert(groupUser)
        .values({
          groupId: primaryTeamId,
          userId: profileId,
          isPrimary: true,
          role: 'member'
        })
        .onConflictDoUpdate({
          target: [groupUser.groupId, groupUser.userId],
          set: { isPrimary: true }
        });
    }

    if (dto.metadata && Object.keys(dto.metadata).length > 0) {
      const normalizedMetadata: Record<string, unknown> = { ...dto.metadata };
      if (Array.isArray(normalizedMetadata.assigned_emails)) {
        normalizedMetadata.assigned_emails = normalizedMetadata.assigned_emails
          .map((item) => String(item || '').trim().toLowerCase())
          .filter((emailItem) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailItem));
      }
      await Promise.all(
        Object.entries(normalizedMetadata).map(([key, value]) =>
          tx
            .insert(employeeMeta)
            .values({ userId: profileId, metaKey: key, metaValue: value })
            .onConflictDoUpdate({
              target: [employeeMeta.userId, employeeMeta.metaKey],
              set: { metaValue: value }
            })
        )
      );
    }

    if (dto.roles && dto.roles.length > 0) {
      const roleSlugs = Array.from(new Set(dto.roles));
      const matchedRoles = await tx
        .select({ id: role.id, slug: role.slug })
        .from(role)
        .where(
          and(
            inArray(role.slug, roleSlugs),
            eq(role.isActive, true),
            tid ? or(eq(role.tenantId, tid), isNull(role.tenantId)) : undefined
          )
        );

      if (matchedRoles.length !== roleSlugs.length) {
        const found = new Set(matchedRoles.map((item) => item.slug));
        const missing = roleSlugs.filter((slug) => !found.has(slug));
        throw new BadRequestException(`Unknown role(s): ${missing.join(', ')}`);
      }

      await tx
        .delete(userRole)
        .where(and(eq(userRole.profileId, profileId), tid ? eq(userRole.tenantId, tid) : undefined));
      await tx
        .insert(userRole)
        .values(
          matchedRoles.map((matchedRole, index) => ({
            profileId,
            roleId: matchedRole.id,
            tenantId: tid ?? null,
            organizationId: null,
            isPrimaryRole: index === 0
          }))
        )
        .onConflictDoNothing({ target: [userRole.profileId, userRole.roleId, userRole.organizationId] });
    }
  }

  private async buildEmployeeDetails(rows: Profile[]) {
    const ids = rows.map((row) => row.id);
    const details = new Map<
      bigint,
      {
        primaryOrganization: any;
        organizations: any[];
        roles: any[];
        groups: any[];
        projectMemberships: any[];
        employeeProfile: any;
        employeeMeta: any[];
        onboardingProgress: any;
      }
    >();

    for (const id of ids) {
      details.set(id, {
        primaryOrganization: null,
        organizations: [],
        roles: [],
        groups: [],
        projectMemberships: [],
        employeeProfile: null,
        employeeMeta: [],
        onboardingProgress: null
      });
    }

    const primaryOrgIds = Array.from(
      new Set(rows.map((row) => row.primaryOrganizationId).filter((value): value is bigint => value != null))
    );

    const [orgRows, groupRows, projectRows, roleRows, empRows, metaRows, onboardingRows, primaryOrgRows] =
      await Promise.all([
        this.db.client
          .select({ membership: profileOrganization, organization })
          .from(profileOrganization)
          .leftJoin(organization, eq(profileOrganization.organizationId, organization.id))
          .where(inArray(profileOrganization.profileId, ids)),
        this.db.client
          .select({ membership: groupUser, group })
          .from(groupUser)
          .leftJoin(group, eq(groupUser.groupId, group.id))
          .where(inArray(groupUser.userId, ids)),
        this.db.client
          .select({ membership: projectMember, project })
          .from(projectMember)
          .leftJoin(project, eq(projectMember.projectId, project.id))
          .where(inArray(projectMember.userId, ids)),
        this.db.client
          .select({ membership: userRole, role, organization })
          .from(userRole)
          .leftJoin(role, eq(userRole.roleId, role.id))
          .leftJoin(organization, eq(userRole.organizationId, organization.id))
          .where(inArray(userRole.profileId, ids)),
        this.db.client.select().from(employeeProfile).where(inArray(employeeProfile.userId, ids)),
        this.db.client.select().from(employeeMeta).where(inArray(employeeMeta.userId, ids)),
        this.db.client.select().from(onboardingProgress).where(inArray(onboardingProgress.userId, ids)),
        primaryOrgIds.length > 0
          ? this.db.client.select().from(organization).where(inArray(organization.id, primaryOrgIds))
          : (Promise.resolve([]) as Promise<typeof organization.$inferSelect[]>)
      ]);

    const primaryOrgById = new Map(primaryOrgRows.map((row) => [row.id.toString(), row]));
    for (const row of rows) {
      const data = details.get(row.id);
      if (!data) continue;
      data.primaryOrganization =
        row.primaryOrganizationId != null ? (primaryOrgById.get(row.primaryOrganizationId.toString()) ?? null) : null;
    }

    for (const row of orgRows) {
      const data = details.get(row.membership.profileId);
      if (!data) continue;
      data.organizations.push({ ...row.membership, organization: row.organization });
    }

    for (const row of groupRows) {
      const data = details.get(row.membership.userId);
      if (!data) continue;
      data.groups.push({ ...row.membership, group: row.group });
    }

    for (const row of projectRows) {
      const data = details.get(row.membership.userId);
      if (!data) continue;
      data.projectMemberships.push({ ...row.membership, project: row.project });
    }

    for (const row of roleRows) {
      const data = details.get(row.membership.profileId);
      if (!data) continue;
      data.roles.push({ ...row.membership, role: row.role, organization: row.organization ?? null });
    }

    for (const row of metaRows) {
      const data = details.get(row.userId);
      if (!data) continue;
      data.employeeMeta.push(row);
    }

    for (const row of onboardingRows) {
      const data = details.get(row.userId);
      if (!data || data.onboardingProgress) continue;
      data.onboardingProgress = row;
    }

    const empRefs: Array<{ userId: bigint; managerUserId: bigint | null; designationId: bigint | null }> = [];
    for (const row of empRows) {
      const data = details.get(row.userId);
      if (!data) continue;
      data.employeeProfile = { ...row, manager: null, designation: null };
      empRefs.push({ userId: row.userId, managerUserId: row.managerUserId, designationId: row.designationId });
    }

    const managerIds = Array.from(
      new Set(empRefs.map((ref) => ref.managerUserId).filter((value): value is bigint => value != null))
    );
    const designationIds = Array.from(
      new Set(empRefs.map((ref) => ref.designationId).filter((value): value is bigint => value != null))
    );

    const [managerRows, typeRows] = await Promise.all([
      managerIds.length > 0
        ? this.db.client
            .select({ id: profile.id, firstName: profile.firstName, lastName: profile.lastName, email: profile.email })
            .from(profile)
            .where(inArray(profile.id, managerIds))
        : (Promise.resolve([]) as Promise<Array<{ id: bigint; firstName: string | null; lastName: string | null; email: string | null }>>),
      designationIds.length > 0
        ? this.db.client
            .select({ designation: hrDesignation, document: documentTable })
            .from(hrDesignation)
            .leftJoin(documentTable, eq(hrDesignation.documentId, documentTable.id))
            .where(inArray(hrDesignation.id, designationIds))
        : (Promise.resolve([]) as Promise<Array<{ designation: typeof hrDesignation.$inferSelect; document: typeof documentTable.$inferSelect | null }>>)
    ]);

    const managerById = new Map(managerRows.map((row) => [row.id.toString(), row]));
    const designationById = new Map(
      typeRows.map((row) => [
        row.designation.id.toString(),
        { ...row.designation, document: row.document ?? null }
      ])
    );

    for (const ref of empRefs) {
      const data = details.get(ref.userId);
      if (!data?.employeeProfile) continue;
      data.employeeProfile.manager =
        ref.managerUserId != null ? (managerById.get(ref.managerUserId.toString()) ?? null) : null;
      data.employeeProfile.designation =
        ref.designationId != null ? (designationById.get(ref.designationId.toString()) ?? null) : null;
    }

    return details;
  }

  private async findEmployeeProfile(profileId: bigint) {
    const [row] = await this.db.client.select().from(profile).where(eq(profile.id, profileId)).limit(1);
    if (!row) return null;
    const details = await this.buildEmployeeDetails([row]);
    return { ...row, ...details.get(profileId)! };
  }

  private async resolveLeaveEntitlementPolicy(userId?: bigint, year = new Date().getFullYear()) {
    const { entitlements, carryoverCaps } = await this.getDefaultLeaveRulesFromRequestTypes();
    const now = new Date();
    const context = userId ? await this.resolvePolicyContextForUser(userId) : null;
    const tid = this.currentTenantId();

    const conditions: SQL[] = [
      eq(policy.module, 'leave'),
      inArray(policy.policyKey, ['leave_entitlements', 'entitlement']),
      ne(policy.scopeType, 'global'),
      eq(policy.isActive, true),
      or(isNull(policy.effectiveFrom), lte(policy.effectiveFrom, now)),
      or(isNull(policy.effectiveTo), gte(policy.effectiveTo, now))
    ];
    if (tid) conditions.push(or(eq(policy.tenantId, tid), isNull(policy.tenantId)));

    const rows = await this.db.client
      .select()
      .from(policy)
      .where(and(...conditions))
      .orderBy(asc(policy.scopeType), asc(policy.priority), asc(policy.createdAt));

    const matched = rows
      .filter((row) => {
        if (!context) return row.scopeType === 'global';
        return policyScopeMatches(row.scopeType, row.scopeId, context);
      })
      .sort((a, b) => {
        const rankDelta = policyScopeRank(a.scopeType) - policyScopeRank(b.scopeType);
        if (rankDelta !== 0) return rankDelta;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    for (const row of matched) {
      const cfg =
        row.configJson && typeof row.configJson === 'object' && !Array.isArray(row.configJson)
          ? (row.configJson as Record<string, unknown>)
          : {};
      for (const [key, value] of Object.entries(cfg)) {
        const parsed = Number(value ?? 0);
        if (!Number.isFinite(parsed) || parsed < 0) continue;
        entitlements[String(key).toLowerCase()] = parsed;
      }
    }

    if (userId && Number.isFinite(year) && year > 2000) {
      const previousYear = year - 1;
      const previousDeltaRows = await this.db.client
        .select({ leaveTypeKey: leaveBalanceLedger.leaveTypeKey, total: sum(leaveBalanceLedger.deltaDays) })
        .from(leaveBalanceLedger)
        .where(
          and(
            eq(leaveBalanceLedger.userId, userId),
            eq(leaveBalanceLedger.periodYear, previousYear),
            tid ? eq(leaveBalanceLedger.tenantId, tid) : undefined
          )
        )
        .groupBy(leaveBalanceLedger.leaveTypeKey);
      const previousDeltaByKey = new Map(
        previousDeltaRows.map((row) => [row.leaveTypeKey, Number(row.total ?? 0)])
      );
      const baseEntitlements = { ...entitlements };

      for (const [key, capRaw] of Object.entries(carryoverCaps)) {
        const cap = Number(capRaw ?? 0);
        if (!Number.isFinite(cap) || cap <= 0) continue;
        const previousAvailable = Number(baseEntitlements[key] ?? 0) + Number(previousDeltaByKey.get(key) ?? 0);
        const carry = Math.min(cap, Math.max(previousAvailable, 0));
        entitlements[key] = Number(entitlements[key] ?? 0) + carry;
      }
    }

    return entitlements;
  }

  private async getDefaultLeaveRulesFromRequestTypes() {
    const types = await this.db.client
      .select({
        name: requestType.name,
        taxonomyKeys: requestType.taxonomyKeys,
        formSchema: requestType.formSchema
      })
      .from(requestType)
      .where(eq(requestType.isActive, true));

    const defaults: Record<string, number> = {};
    const carryoverCaps: Record<string, number> = {};
    for (const type of types) {
      if (!isLeaveRequestType(type.name, type.taxonomyKeys as string[] | null, type.formSchema)) continue;
      const schema = objectSchema(type.formSchema);
      const key = resolveLeaveTypeKey(type.name, schema);
      if (!key) continue;
      const entitled = Number(schema.entitled_days_per_year ?? 0);
      defaults[key] = Number.isFinite(entitled) && entitled > 0 ? entitled : 0;
      const carryover = Number(schema.max_carryover_days ?? 0);
      carryoverCaps[key] = Number.isFinite(carryover) && carryover > 0 ? carryover : 0;
    }

    return {
      entitlements: defaults,
      carryoverCaps
    };
  }

  private async resolvePolicyContextForUser(userId: bigint) {
    const [[currentProfile], [primaryTeam]] = await Promise.all([
      this.db.client
        .select({
          primaryOrganizationId: profile.primaryOrganizationId,
          employmentType: employeeProfile.employmentType
        })
        .from(profile)
        .leftJoin(employeeProfile, eq(employeeProfile.userId, profile.id))
        .where(eq(profile.id, userId))
        .limit(1),
      this.db.client
        .select({ groupId: groupUser.groupId })
        .from(groupUser)
        .where(and(eq(groupUser.userId, userId), eq(groupUser.isPrimary, true)))
        .limit(1)
    ]);

    return {
      user_id: userId.toString(),
      organization_id: currentProfile?.primaryOrganizationId?.toString(),
      team_id: primaryTeam?.groupId?.toString(),
      staff_type: currentProfile?.employmentType ?? undefined
    };
  }

  private serializeEmployee(profileRow: any) {
    const groupMemberships = (profileRow.groups ?? []).map((entry: any) => ({
      id: entry.group.id.toString(),
      name: entry.group.name,
      type: entry.group.type,
      role: entry.role
    }));

    return this.normalizeBigInts({
      id: profileRow.id.toString(),
      username: profileRow.username,
      email: profileRow.email,
      status: profileRow.status,
      type: profileRow.type,
      first_name: profileRow.firstName,
      last_name: profileRow.lastName,
      phone: profileRow.phone,
      primary_organization: profileRow.primaryOrganization
        ? { id: profileRow.primaryOrganization.id.toString(), name: profileRow.primaryOrganization.name, code: profileRow.primaryOrganization.code }
        : null,
      organizations: (profileRow.organizations ?? []).map((entry: any) => ({
        id: entry.organization.id.toString(),
        name: entry.organization.name,
        code: entry.organization.code,
        is_primary: entry.isPrimary
      })),
      roles: (profileRow.roles ?? []).map((entry: any) => ({
        id: entry.role.id.toString(),
        slug: entry.role.slug,
        name: entry.role.name,
        is_primary: entry.isPrimaryRole
      })),
      groups: groupMemberships.filter((entry: any) => String(entry.type).toLowerCase() !== 'project'),
      teams: groupMemberships.filter((entry: any) => {
        const type = String(entry.type).toLowerCase();
        return type === 'team' || type === 'department';
      }),
      projects: (profileRow.projectMemberships ?? []).map((entry: any) => ({
        id: entry.project.id.toString(),
        name: entry.project.name,
        type: 'project',
        role: entry.role
      })),
      employee_profile: profileRow.employeeProfile
        ? {
            ...profileRow.employeeProfile,
            userId: profileRow.employeeProfile.userId.toString(),
            managerUserId: profileRow.employeeProfile.managerUserId
              ? profileRow.employeeProfile.managerUserId.toString()
              : null,
            designationId: profileRow.employeeProfile.designationId
              ? profileRow.employeeProfile.designationId.toString()
              : null,
            jobTitle: profileRow.employeeProfile.jobTitle || profileRow.employeeProfile.designation?.name || null,
            jobDescription: profileRow.employeeProfile.jobDescription || profileRow.employeeProfile.designation?.document?.contentHtml || null,
            primary_team:
              (() => {
                const pt = (profileRow.groups ?? []).find(
                  (g: any) => g.isPrimary && ['team', 'department'].includes(String(g.group.type).toLowerCase())
                );
                return pt ? { id: pt.group.id.toString(), name: pt.group.name, type: pt.group.type } : null;
              })(),
            primary_organization:
              (() => {
                const po = (profileRow.organizations ?? []).find((o: any) => o.isPrimary);
                return po ? { id: po.organization.id.toString(), name: po.organization.name, code: po.organization.code } : null;
              })(),
            meta: (profileRow.employeeMeta ?? []).reduce(
              (acc: Record<string, unknown>, entry: any) => {
                acc[entry.metaKey] = entry.metaValue;
                return acc;
              },
              {}
            )
          }
        : null,
      onboarding_progress: profileRow.onboardingProgress ?? null,
      created_at: profileRow.createdAt,
      updated_at: profileRow.updatedAt
    });
  }

  private normalizeBigInts(value: unknown): unknown {
    if (typeof value === 'bigint') return value.toString();
    if (Array.isArray(value)) return value.map((item) => this.normalizeBigInts(item));
    if (value instanceof Date || value === null || value === undefined) return value;
    if (typeof value === 'object') {
      const output: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        output[key] = this.normalizeBigInts(item);
      }
      return output;
    }
    return value;
  }

  private normalizeOptionalText(value: string | null | undefined): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private handleEmployeePersistenceError(error: unknown) {
    if (error && typeof error === 'object') {
      const raw = error as { code?: unknown; detail?: unknown; constraint?: unknown };
      const code = String(raw.code ?? '');
      if (code === '23505') {
        const detail = String(raw.detail ?? '').toLowerCase();
        const constraint = String(raw.constraint ?? '').toLowerCase();
        const context = `${constraint} ${detail}`;
        if (context.includes('email')) {
          throw new BadRequestException('Email already exists');
        }
        if (context.includes('username')) {
          throw new BadRequestException('Username already exists');
        }
        if (context.includes('employee_code')) {
          throw new BadRequestException('Employee code already exists');
        }
        throw new BadRequestException('Duplicate value detected');
      }
      if (code === '23503') {
        throw new BadRequestException('Invalid employee relationship reference');
      }
    }
  }

}




