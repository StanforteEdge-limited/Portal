import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, EmploymentStatus, EmploymentType, GroupUserRole } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma/prisma.service';
import { randomToken } from '../../common/utils/crypto';
import { toBigInt } from '../../common/utils/ids';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { generateUniqueUsername, makeUsernameSeed } from '../../common/utils/username';
import { SetPrimaryOrganizationDto } from './dto/set-primary-organization.dto';
import { EmployeeActionDto, UpsertEmployeeDto } from './dto/upsert-employee.dto';
import { AdjustLeaveBalanceDto } from './dto/leave-balance.dto';
import {
  AssignEmployeeOrganizationDto,
  AssignEmployeeTeamDto,
  AssignOnboardingFormDto,
  UpdateOnboardingFormAssignmentDto
} from './dto/manage-employee-links.dto';

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [total, active, inactive, onboardingPending] = await this.prisma.$transaction([
      this.prisma.profile.count({ where: { type: { in: ['staff', 'employee'] } } }),
      this.prisma.employeeProfile.count({ where: { employmentStatus: 'active' } }),
      this.prisma.employeeProfile.count({ where: { employmentStatus: { in: ['draft', 'suspended', 'exited'] } } }),
      this.prisma.onboardingProgress.count({
        where: {
          status: {
            in: ['invited', 'accepted', 'profile_pending', 'forms_pending', 'hr_review']
          }
        }
      })
    ]);

    return { total, active, inactive, onboarding_pending: onboardingPending };
  }

  async listEmployees(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const where: Prisma.ProfileWhereInput = {
      type: { in: ['staff', 'employee'] }
    };

    if (query.search) {
      where.OR = [
        { username: { contains: String(query.search), mode: 'insensitive' } },
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { firstName: { contains: String(query.search), mode: 'insensitive' } },
        { lastName: { contains: String(query.search), mode: 'insensitive' } }
      ];
    }

    if (query.status) where.status = String(query.status);

    const profileFilter: Prisma.EmployeeProfileWhereInput = {};
    if (query.employment_status) profileFilter.employmentStatus = String(query.employment_status) as EmploymentStatus;
    if (query.employment_type) profileFilter.employmentType = String(query.employment_type) as EmploymentType;
    if (Object.keys(profileFilter).length > 0) {
      where.employeeProfile = { is: profileFilter };
    }

    if (query.organization_id) {
      where.organizations = {
        some: { organizationId: this.parseId(String(query.organization_id), 'organization id') }
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.profile.findMany({
        where,
        include: this.employeeInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.prisma.profile.count({ where })
    ]);

    return paginatedResponse(
      data.map((item) => this.serializeEmployee(item)),
      { page, per_page: perPage, total }
    );
  }

  async createEmployee(dto: UpsertEmployeeDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        let profileId: bigint;
        let resolvedPrimaryOrganizationId = dto.primary_organization_id?.trim() || undefined;

        if (dto.user_id) {
          profileId = this.parseId(dto.user_id, 'user id');
          const existing = await tx.profile.findUnique({ where: { id: profileId } });
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
                async (candidate) => Boolean(await tx.profile.findFirst({ where: { username: candidate } }))
              );
          const [emailExists, usernameExists] = await Promise.all([
            tx.profile.findUnique({ where: { email } }),
            requestedUsername ? tx.profile.findFirst({ where: { username } }) : Promise.resolve(null)
          ]);

          if (emailExists) throw new BadRequestException('Email already exists');
          if (usernameExists) throw new BadRequestException('Username already exists');

          const tempPassword = randomToken(10);
          const passwordHash = await bcrypt.hash(tempPassword, 12);
          const created = await tx.profile.create({
            data: {
              username,
              email,
              passwordHash,
              type: 'staff',
              status: 'invited',
              firstName: dto.first_name,
              lastName: dto.last_name,
              phone: dto.phone
            }
          });
          profileId = created.id;
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
        
        const profile = await tx.profile.findUnique({
          where: { id: profileId },
          include: this.employeeInclude()
        });
        
        if (!profile || !['staff', 'employee'].includes(profile.type)) {
          throw new NotFoundException('Employee not found');
        }
        
        return this.serializeEmployee(profile);
      });
    } catch (error) {
      this.handleEmployeePersistenceError(error);
      throw error;
    }
  }

  async getEmployee(id: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: this.parseId(id, 'employee id') },
      include: this.employeeInclude()
    });

    if (!profile || !['staff', 'employee'].includes(profile.type)) {
      throw new NotFoundException('Employee not found');
    }

    return this.serializeEmployee(profile);
  }

  async updateEmployee(id: string, dto: UpsertEmployeeDto) {
    const profileId = this.parseId(id, 'employee id');
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile || !['staff', 'employee'].includes(profile.type)) {
      throw new NotFoundException('Employee not found');
    }

    const nextEmail = dto.email ? dto.email.trim().toLowerCase() : profile.email;
    const nextUsername = dto.username !== undefined ? this.normalizeOptionalText(dto.username) : profile.username;
    if (dto.email !== undefined && nextEmail !== profile.email) {
      const existingEmail = await this.prisma.profile.findFirst({
        where: { email: nextEmail, id: { not: profileId } }
      });
      if (existingEmail) throw new BadRequestException('Email already exists');
    }
    if (dto.username !== undefined && nextUsername && nextUsername !== profile.username) {
      const existingUsername = await this.prisma.profile.findFirst({
        where: { username: nextUsername, id: { not: profileId } }
      });
      if (existingUsername) throw new BadRequestException('Username already exists');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.profile.update({
          where: { id: profileId },
          data: {
            firstName: dto.first_name ?? profile.firstName,
            lastName: dto.last_name ?? profile.lastName,
            phone: dto.phone ?? profile.phone,
            email: nextEmail,
            username: nextUsername
          }
        });

        await this.upsertEmployeeProfileTx(tx, profileId, dto, profileId);
        return this.getEmployee(profileId.toString());
      });
    } catch (error) {
      this.handleEmployeePersistenceError(error);
      throw error;
    }
  }

  async runEmployeeAction(id: string, dto: EmployeeActionDto) {
    const profileId = this.parseId(id, 'employee id');
    const existing = await this.prisma.employeeProfile.findUnique({ where: { userId: profileId } });
    if (!existing) throw new NotFoundException('Employee profile not found');

    const nextStatus: EmploymentStatus =
      dto.action === 'activate' ? 'active' : dto.action === 'suspend' ? 'suspended' : 'exited';

    await this.prisma.employeeProfile.update({
      where: { userId: profileId },
      data: {
        employmentStatus: nextStatus,
        exitDate: dto.action === 'exit' ? new Date(dto.effective_date ?? Date.now()) : null
      }
    });

    await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        status: nextStatus === 'active' ? 'active' : nextStatus === 'suspended' ? 'inactive' : 'inactive'
      }
    });

    return this.getEmployee(profileId.toString());
  }

  async setPrimaryOrganization(id: string, dto: SetPrimaryOrganizationDto) {
    const profileId = this.parseId(id, 'employee id');
    const organizationId = this.parseId(dto.organization_id, 'organization id');

    const [profile, organization] = await this.prisma.$transaction([
      this.prisma.profile.findUnique({ where: { id: profileId } }),
      this.prisma.organization.findUnique({ where: { id: organizationId } })
    ]);

    if (!profile || !['staff', 'employee'].includes(profile.type)) {
      throw new NotFoundException('Employee not found');
    }
    if (!organization) throw new NotFoundException('Organization not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.profileOrganization.updateMany({
        where: { profileId, isPrimary: true },
        data: { isPrimary: false }
      });

      const existing = await tx.profileOrganization.findFirst({
        where: { profileId, organizationId }
      });

      if (existing) {
        await tx.profileOrganization.update({
          where: { id: existing.id },
          data: { isPrimary: true }
        });
      } else {
        await tx.profileOrganization.create({
          data: {
            profileId,
            organizationId,
            isPrimary: true,
            createdAt: new Date()
          }
        });
      }

      await tx.profile.update({
        where: { id: profileId },
        data: { primaryOrganizationId: organizationId }
      });
    });

    return this.getEmployee(id);
  }

  async addOrganizationMembership(id: string, dto: AssignEmployeeOrganizationDto) {
    const profileId = this.parseId(id, 'employee id');
    const organizationId = this.parseId(dto.organization_id, 'organization id');

    const [profile, organization] = await this.prisma.$transaction([
      this.prisma.profile.findUnique({ where: { id: profileId } }),
      this.prisma.organization.findUnique({ where: { id: organizationId } })
    ]);
    if (!profile || !['staff', 'employee'].includes(profile.type)) throw new NotFoundException('Employee not found');
    if (!organization) throw new NotFoundException('Organization not found');

    await this.prisma.profileOrganization.upsert({
      where: {
        profile_org_unique: {
          profileId,
          organizationId
        }
      },
      update: {
        isPrimary: Boolean(dto.is_primary)
      },
      create: {
        profileId,
        organizationId,
        isPrimary: Boolean(dto.is_primary),
        createdAt: new Date()
      }
    });

    if (dto.is_primary) {
      await this.prisma.$transaction([
        this.prisma.profileOrganization.updateMany({
          where: { profileId, organizationId: { not: organizationId }, isPrimary: true },
          data: { isPrimary: false }
        }),
        this.prisma.profile.update({
          where: { id: profileId },
          data: { primaryOrganizationId: organizationId }
        })
      ]);
    }

    return this.getEmployee(id);
  }

  async removeOrganizationMembership(id: string, organizationIdParam: string) {
    const profileId = this.parseId(id, 'employee id');
    const organizationId = this.parseId(organizationIdParam, 'organization id');

    const membership = await this.prisma.profileOrganization.findFirst({
      where: { profileId, organizationId }
    });
    if (!membership) throw new NotFoundException('Organization membership not found');

    await this.prisma.profileOrganization.delete({ where: { id: membership.id } });

    const primary = await this.prisma.profileOrganization.findFirst({
      where: { profileId, isPrimary: true }
    });

    await this.prisma.profile.update({
      where: { id: profileId },
      data: { primaryOrganizationId: primary?.organizationId ?? null }
    });

    return this.getEmployee(id);
  }

  async addTeamMembership(id: string, dto: AssignEmployeeTeamDto) {
    const profileId = this.parseId(id, 'employee id');
    const teamId = this.parseId(dto.team_id, 'team id');

    const [profile, team] = await this.prisma.$transaction([
      this.prisma.profile.findUnique({ where: { id: profileId } }),
      this.prisma.group.findUnique({ where: { id: teamId } })
    ]);
    if (!profile || !['staff', 'employee'].includes(profile.type)) throw new NotFoundException('Employee not found');
    if (!team) throw new NotFoundException('Team not found');

    const role: GroupUserRole =
      dto.role === 'lead'
        ? GroupUserRole.moderator
        : dto.role === 'manager'
          ? GroupUserRole.admin
          : GroupUserRole.member;

    const existingPrimary = await this.prisma.groupUser.findFirst({
      where: { userId: profileId, isPrimary: true },
      select: { id: true }
    });
    const makePrimary = !existingPrimary;

    await this.prisma.groupUser.upsert({
      where: {
        unique_group_user: {
          groupId: teamId,
          userId: profileId
        }
      },
      update: {
        role,
        isPrimary: makePrimary
      },
      create: {
        groupId: teamId,
        userId: profileId,
        role,
        isPrimary: makePrimary
      }
    });

    return this.getEmployee(id);
  }

  async removeTeamMembership(id: string, teamIdParam: string) {
    const profileId = this.parseId(id, 'employee id');
    const teamId = this.parseId(teamIdParam, 'team id');

    await this.prisma.groupUser.delete({
      where: {
        unique_group_user: {
          groupId: teamId,
          userId: profileId
        }
      }
    });

    const fallbackTeam = await this.prisma.groupUser.findFirst({
      where: { userId: profileId },
      orderBy: { joinedAt: 'asc' }
    });

    if (fallbackTeam) {
      await this.prisma.groupUser.update({
        where: { id: fallbackTeam.id },
        data: { isPrimary: true }
      });
    }

    return this.getEmployee(id);
  }

  async listOnboardingFormAssignments(query: Record<string, any>) {
    const where: Prisma.FormAssignmentWhereInput = {};
    if (query.form_id) where.formId = String(query.form_id);
    if (query.profile_id) where.assignedToProfileId = this.parseId(String(query.profile_id), 'profile id');
    if (query.role_slug) where.assignedToRole = String(query.role_slug);

    const assignments = await this.prisma.formAssignment.findMany({
      where,
      include: {
        form: { select: { id: true, name: true, module: true, isActive: true } }
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
    });

    const items = assignments.map((row) => ({
      id: row.id,
      form_id: row.formId,
      form_name: row.form.name,
      module: row.form.module,
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
    const form = await this.prisma.form.findUnique({ where: { id: dto.form_id } });
    if (!form || !form.isActive) throw new NotFoundException('Form not found');

    const assignedToProfileId = dto.profile_id ? this.parseId(dto.profile_id, 'profile id') : null;
    if (assignedToProfileId) {
      const user = await this.prisma.profile.findUnique({ where: { id: assignedToProfileId } });
      if (!user) throw new NotFoundException('Profile not found');
    }

    return this.prisma.formAssignment.create({
      data: {
        formId: dto.form_id,
        assignedToRole: dto.role_slug ?? null,
        assignedToProfileId,
        dueDate: dto.due_date ? new Date(dto.due_date) : null
      }
    });
  }

  async deleteOnboardingFormAssignment(id: string) {
    const existing = await this.prisma.formAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Form assignment not found');
    await this.prisma.formAssignment.delete({ where: { id } });
    return { success: true };
  }

  async updateOnboardingFormAssignment(id: string, dto: UpdateOnboardingFormAssignmentDto) {
    const existing = await this.prisma.formAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Form assignment not found');

    let assignedToProfileId: bigint | null | undefined;
    if (dto.profile_id !== undefined) {
      assignedToProfileId = dto.profile_id ? this.parseId(dto.profile_id, 'profile id') : null;
      if (assignedToProfileId) {
        const user = await this.prisma.profile.findUnique({ where: { id: assignedToProfileId } });
        if (!user) throw new NotFoundException('Profile not found');
      }
    }

    const formId = dto.form_id ?? existing.formId;
    if (dto.form_id) {
      const form = await this.prisma.form.findUnique({ where: { id: dto.form_id } });
      if (!form || !form.isActive) throw new NotFoundException('Form not found');
    }

    const assignedToRole = dto.role_slug !== undefined ? dto.role_slug || null : existing.assignedToRole;
    const resolvedProfileId =
      assignedToProfileId !== undefined ? assignedToProfileId : existing.assignedToProfileId;

    if (!assignedToRole && !resolvedProfileId) {
      throw new BadRequestException('Either profile_id or role_slug is required');
    }

    return this.prisma.formAssignment.update({
      where: { id },
      data: {
        formId,
        assignedToRole,
        assignedToProfileId: resolvedProfileId,
        dueDate: dto.due_date !== undefined ? (dto.due_date ? new Date(dto.due_date) : null) : undefined
      }
    });
  }

  async getLeaveBalance(query: Record<string, any>) {
    const year = Number(query.year ?? new Date().getFullYear());
    const userId = query.user_id ? this.parseId(String(query.user_id), 'user id') : undefined;

    const where: Prisma.LeaveBalanceLedgerWhereInput = {
      periodYear: year,
      ...(userId ? { userId } : {})
    };

    const rows = await this.prisma.leaveBalanceLedger.findMany({
      where,
      orderBy: [{ userId: 'asc' }, { leaveTypeKey: 'asc' }, { createdAt: 'asc' }]
    });

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
    const userId = this.parseId(dto.user_id, 'user id');
    const leaveTypeKey = dto.leave_type_key.trim().toLowerCase();
    const periodYear = Number(dto.period_year);
    if (!Number.isFinite(periodYear) || periodYear < 2000 || periodYear > 2100) {
      throw new BadRequestException('Invalid period_year');
    }

    const userExists = await this.prisma.profile.count({ where: { id: userId } });
    if (!userExists) throw new NotFoundException('User not found');

    const row = await this.prisma.leaveBalanceLedger.create({
      data: {
        userId,
        leaveTypeKey,
        periodYear,
        deltaDays: dto.delta_days,
        entryType: dto.entry_type?.trim() || 'adjustment',
        notes: dto.notes ?? null,
        createdBy: actorId ? toBigInt(actorId) : null
      }
    });

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
    tx: Prisma.TransactionClient,
    profileId: bigint,
    dto: UpsertEmployeeDto,
    actorId: bigint | null
  ) {
    const managerUserId = dto.manager_user_id ? this.parseId(dto.manager_user_id, 'manager user id') : undefined;
    const primaryTeamId = dto.primary_team_id ? this.parseId(dto.primary_team_id, 'primary team id') : undefined;
    const primaryOrganizationId = dto.primary_organization_id
      ? this.parseId(dto.primary_organization_id, 'primary organization id')
      : undefined;
    const designationId = dto.designation_id !== undefined
      ? (dto.designation_id ? this.parseId(dto.designation_id, 'designation id') : null)
      : undefined;
    const employeeCode = this.normalizeOptionalText(dto.employee_code);
    const jobTitle = this.normalizeOptionalText(dto.job_title);
    const jobDescription = this.normalizeOptionalText(dto.job_description);

    if (managerUserId) {
      const managerExists = await tx.profile.count({ where: { id: managerUserId } });
      if (!managerExists) throw new BadRequestException('Manager not found');
    }
    if (primaryTeamId) {
      const teamExists = await tx.group.count({ where: { id: primaryTeamId } });
      if (!teamExists) throw new BadRequestException('Primary team not found');
    }
    if (primaryOrganizationId) {
      const organizationExists = await tx.organization.count({ where: { id: primaryOrganizationId } });
      if (!organizationExists) throw new NotFoundException('Organization not found');
    }
    if (designationId) {
      const designationExists = await tx.hrDesignation.count({ where: { id: designationId } });
      if (!designationExists) throw new BadRequestException('Designation template not found');
    }
    if (employeeCode) {
      const employeeCodeExists = await tx.employeeProfile.findFirst({
        where: {
          employeeCode,
          userId: { not: profileId }
        }
      });
      if (employeeCodeExists) throw new BadRequestException('Employee code already exists');
    }

    await tx.employeeProfile.upsert({
      where: { userId: profileId },
      update: {
        employeeCode,
        jobTitle,
        jobDescription,
        managerUserId,
        designationId,
        employmentType: dto.employment_type,
        employmentStatus: dto.employment_status,
        workMode: dto.work_mode,
        hireDate: dto.hire_date ? new Date(dto.hire_date) : undefined,
        confirmationDate: dto.confirmation_date ? new Date(dto.confirmation_date) : undefined,
        exitDate: dto.exit_date ? new Date(dto.exit_date) : undefined,
        updatedBy: actorId ?? undefined
      },
      create: {
        userId: profileId,
        employeeCode,
        jobTitle,
        jobDescription,
        managerUserId,
        designationId: designationId ?? null,
        employmentType: dto.employment_type,
        employmentStatus: dto.employment_status ?? 'draft',
        workMode: dto.work_mode,
        hireDate: dto.hire_date ? new Date(dto.hire_date) : undefined,
        confirmationDate: dto.confirmation_date ? new Date(dto.confirmation_date) : undefined,
        exitDate: dto.exit_date ? new Date(dto.exit_date) : undefined,
        createdBy: actorId ?? undefined,
        updatedBy: actorId ?? undefined
      }
    });

    if (primaryOrganizationId) {
      await tx.profileOrganization.updateMany({
        where: { profileId, isPrimary: true, organizationId: { not: primaryOrganizationId } },
        data: { isPrimary: false }
      });
      await tx.profileOrganization.upsert({
        where: {
          profile_org_unique: {
            profileId,
            organizationId: primaryOrganizationId
          }
        },
        update: { isPrimary: true },
        create: {
          profileId,
          organizationId: primaryOrganizationId,
          isPrimary: true,
          createdAt: new Date()
        }
      });
      await tx.profile.update({
        where: { id: profileId },
        data: { primaryOrganizationId }
      });
    }

    if (primaryTeamId) {
      await tx.groupUser.updateMany({
        where: { userId: profileId, isPrimary: true },
        data: { isPrimary: false }
      });
      await tx.groupUser.upsert({
        where: {
          unique_group_user: {
            groupId: primaryTeamId,
            userId: profileId
          }
        },
        update: { isPrimary: true },
        create: {
          groupId: primaryTeamId,
          userId: profileId,
          isPrimary: true,
          role: 'member'
        }
      });
    }

    if (dto.metadata && Object.keys(dto.metadata).length > 0) {
      const normalizedMetadata: Record<string, unknown> = { ...dto.metadata };
      if (Array.isArray(normalizedMetadata.assigned_emails)) {
        normalizedMetadata.assigned_emails = normalizedMetadata.assigned_emails
          .map((item) => String(item || '').trim().toLowerCase())
          .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      }
      await Promise.all(
        Object.entries(normalizedMetadata).map(([key, value]) =>
          tx.employeeMeta.upsert({
            where: {
              employee_meta_unique: {
                userId: profileId,
                metaKey: key
              }
            },
            update: {
              metaValue: value as Prisma.InputJsonValue
            },
            create: {
              userId: profileId,
              metaKey: key,
              metaValue: value as Prisma.InputJsonValue
            }
          })
        )
      );
    }

    if (dto.roles && dto.roles.length > 0) {
      const roleSlugs = Array.from(new Set(dto.roles));
      const roles = await tx.role.findMany({
        where: {
          slug: { in: roleSlugs },
          isActive: true
        },
        select: { id: true, slug: true }
      });

      if (roles.length !== roleSlugs.length) {
        const found = new Set(roles.map((item) => item.slug));
        const missing = roleSlugs.filter((slug) => !found.has(slug));
        throw new BadRequestException(`Unknown role(s): ${missing.join(', ')}`);
      }

      await tx.userRole.deleteMany({ where: { profileId } });
      await tx.userRole.createMany({
        data: roles.map((role, index) => ({
          profileId,
          roleId: role.id,
          organizationId: null,
          isPrimaryRole: index === 0
        })),
        skipDuplicates: true
      });
    }
  }

  private employeeInclude() {
    return {
      primaryOrganization: true,
      organizations: {
        include: { organization: true }
      },
      roles: { include: { role: true, organization: true } },
      groups: {
        include: {
          group: true
        }
      },
      projectMemberships: {
        include: { project: true }
      },
      employeeProfile: {
        include: {
          manager: { select: { id: true, firstName: true, lastName: true, email: true } },
          designation: {
            include: { document: true }
          }
        }
      },
      employeeMeta: true,
      onboardingProgress: true
    } as const;
  }

  private async resolveLeaveEntitlementPolicy(userId?: bigint, year = new Date().getFullYear()) {
    const { entitlements, carryoverCaps } = await this.getDefaultLeaveRulesFromRequestTypes();
    const now = new Date();
    const context = userId ? await this.resolvePolicyContextForUser(userId) : null;
    const rows = await this.prisma.policy.findMany({
      where: {
        module: 'leave',
        policyKey: { in: ['leave_entitlements', 'entitlement'] },
        NOT: { scopeType: 'global' },
        isActive: true,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }]
      },
      orderBy: [{ scopeType: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }]
    });

    const matched = rows
      .filter((row) => {
        if (!context) return row.scopeType === 'global';
        return this.policyScopeMatches(row.scopeType, row.scopeId, context);
      })
      .sort((a, b) => {
        const rankDelta = this.policyScopeRank(a.scopeType) - this.policyScopeRank(b.scopeType);
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
      const previousDeltaRows = await this.prisma.leaveBalanceLedger.groupBy({
        by: ['leaveTypeKey'],
        where: {
          userId,
          periodYear: previousYear
        },
        _sum: {
          deltaDays: true
        }
      });
      const previousDeltaByKey = new Map(
        previousDeltaRows.map((row) => [row.leaveTypeKey, Number(row._sum?.deltaDays ?? 0)])
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
    const types = await this.prisma.requestType.findMany({
      where: { isActive: true },
      select: {
        name: true,
        taxonomyKeys: true,
        formSchema: true
      }
    });

    const defaults: Record<string, number> = {};
    const carryoverCaps: Record<string, number> = {};
    for (const type of types) {
      if (!this.isLeaveRequestType(type.name, type.taxonomyKeys as string[] | null, type.formSchema)) continue;
      const schema =
        type.formSchema && typeof type.formSchema === 'object' && !Array.isArray(type.formSchema)
          ? (type.formSchema as Record<string, unknown>)
          : {};
      const key = this.resolveLeaveTypeKey(type.name, schema);
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

  private isLeaveRequestType(name: string | null, taxonomyKeys: string[] | null, formSchema: unknown) {
    const normalizedName = String(name ?? '').toLowerCase();
    const normalizedCategory = String(taxonomyKeys?.[0] ?? '').toLowerCase();
    const schema =
      formSchema && typeof formSchema === 'object' && !Array.isArray(formSchema)
        ? (formSchema as Record<string, unknown>)
        : {};
    const schemaLeaveTypeKey = String(schema.leave_type_key ?? '').trim().toLowerCase();
    return (
      normalizedCategory.includes('leave') ||
      normalizedName.includes('leave') ||
      schemaLeaveTypeKey.length > 0
    );
  }

  private resolveLeaveTypeKey(requestTypeName: string | null, formSchema: unknown) {
    const schema =
      formSchema && typeof formSchema === 'object' && !Array.isArray(formSchema)
        ? (formSchema as Record<string, unknown>)
        : {};
    const fromSchema = String(schema.leave_type_key ?? '').trim().toLowerCase();
    if (fromSchema) return fromSchema;
    const fromName = String(requestTypeName ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return fromName || 'annual_leave';
  }

  private async resolvePolicyContextForUser(userId: bigint) {
    const [profile, primaryTeam] = await this.prisma.$transaction([
      this.prisma.profile.findUnique({
        where: { id: userId },
        include: {
          employeeProfile: { select: { employmentType: true } }
        }
      }),
      this.prisma.groupUser.findFirst({
        where: { userId, isPrimary: true },
        select: { groupId: true }
      })
    ]);

    return {
      user_id: userId.toString(),
      organization_id: profile?.primaryOrganizationId?.toString(),
      team_id: primaryTeam?.groupId?.toString(),
      staff_type: profile?.employeeProfile?.employmentType ?? undefined
    };
  }

  private policyScopeMatches(
    scopeType: string,
    scopeId: string | null,
    context: { organization_id?: string; team_id?: string; staff_type?: string; user_id?: string }
  ) {
    if (scopeType === 'global') return true;
    if (!scopeId) return false;
    if (scopeType === 'organization') return context.organization_id === scopeId;
    if (scopeType === 'team') return context.team_id === scopeId;
    if (scopeType === 'staff_type') return context.staff_type === scopeId;
    if (scopeType === 'user') return context.user_id === scopeId;
    return false;
  }

  private policyScopeRank(scopeType: string) {
    if (scopeType === 'global') return 0;
    if (scopeType === 'organization') return 1;
    if (scopeType === 'team') return 2;
    if (scopeType === 'staff_type') return 3;
    if (scopeType === 'user') return 4;
    return 99;
  }

  private serializeEmployee(profile: any) {
    const groupMemberships = (profile.groups ?? []).map((entry: any) => ({
      id: entry.group.id.toString(),
      name: entry.group.name,
      type: entry.group.type,
      role: entry.role
    }));

    return this.normalizeBigInts({
      id: profile.id.toString(),
      username: profile.username,
      email: profile.email,
      status: profile.status,
      type: profile.type,
      first_name: profile.firstName,
      last_name: profile.lastName,
      phone: profile.phone,
      primary_organization: profile.primaryOrganization
        ? { id: profile.primaryOrganization.id.toString(), name: profile.primaryOrganization.name, code: profile.primaryOrganization.code }
        : null,
      organizations: (profile.organizations ?? []).map((entry: any) => ({
        id: entry.organization.id.toString(),
        name: entry.organization.name,
        code: entry.organization.code,
        is_primary: entry.isPrimary
      })),
      roles: (profile.roles ?? []).map((entry: any) => ({
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
      projects: (profile.projectMemberships ?? []).map((entry: any) => ({
        id: entry.project.id.toString(),
        name: entry.project.name,
        type: 'project',
        role: entry.role
      })),
      employee_profile: profile.employeeProfile
        ? {
            ...profile.employeeProfile,
            userId: profile.employeeProfile.userId.toString(),
            managerUserId: profile.employeeProfile.managerUserId
              ? profile.employeeProfile.managerUserId.toString()
              : null,
            designationId: profile.employeeProfile.designationId
              ? profile.employeeProfile.designationId.toString()
              : null,
            jobTitle: profile.employeeProfile.jobTitle || profile.employeeProfile.designation?.name || null,
            jobDescription: profile.employeeProfile.jobDescription || profile.employeeProfile.designation?.document?.contentHtml || null,
            primary_team:
              (() => {
                const pt = (profile.groups ?? []).find(
                  (g: any) => g.isPrimary && ['team', 'department'].includes(String(g.group.type).toLowerCase())
                );
                return pt ? { id: pt.group.id.toString(), name: pt.group.name, type: pt.group.type } : null;
              })(),
            primary_organization:
              (() => {
                const po = (profile.organizations ?? []).find((o: any) => o.isPrimary);
                return po ? { id: po.organization.id.toString(), name: po.organization.name, code: po.organization.code } : null;
              })(),
            meta: (profile.employeeMeta ?? []).reduce(
              (acc: Record<string, unknown>, entry: any) => {
                acc[entry.metaKey] = entry.metaValue;
                return acc;
              },
              {}
            )
          }
        : null,
      onboarding_progress: profile.onboardingProgress ?? null,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt
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
    if (!(error instanceof PrismaClientKnownRequestError)) return;
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[]).join(', ')
        : String(error.meta?.target ?? '');
      if (target.includes('email')) {
        throw new BadRequestException('Email already exists');
      }
      if (target.includes('username')) {
        throw new BadRequestException('Username already exists');
      }
      if (target.includes('employee_code')) {
        throw new BadRequestException('Employee code already exists');
      }
      throw new BadRequestException('Duplicate value detected');
    }
    if (error.code === 'P2003') {
      throw new BadRequestException('Invalid employee relationship reference');
    }
  }

  private parseId(value: string, label: string): bigint {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}
