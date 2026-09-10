import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { randomToken, sha256 } from '../../common/utils/crypto';
import { MailService } from '../../common/mail/mail.service';
import { generateUniqueUsername, makeUsernameSeed } from '../../common/utils/username';
import { paginatedResponse } from '../../common/helpers/paginated-response';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  async getMyProfile(profileId: string) {
    const user = await this.prisma.profile.findUnique({
      where: { id: toBigInt(profileId) },
      include: {
        organizations: {
          include: { organization: true }
        },
        groups: { include: { group: true } },
        projectMemberships: {
          include: { project: true }
        },
        employeeProfile: {
          include: {
            manager: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        employeeMeta: true,
        onboardingProgress: true,
        signatureFile: { select: { publicUrl: true, storagePath: true } }
      }
    });

    if (!user) throw new NotFoundException('Profile not found');
    return this.serializeProfile(user);
  }

  async updateMyProfile(profileId: string, dto: UpdateProfileDto) {
    const existing = await this.prisma.profile.findUnique({
      where: { id: toBigInt(profileId) }
    });
    if (!existing) throw new NotFoundException('Profile not found');

    const updated = await this.prisma.profile.update({
      where: { id: existing.id },
      data: {
        firstName: dto.first_name ?? existing.firstName,
        lastName: dto.last_name ?? existing.lastName,
        dateOfBirth: dto.date_of_birth ? new Date(dto.date_of_birth) : existing.dateOfBirth,
        gender: dto.gender ?? existing.gender,
        phone: dto.phone ?? existing.phone,
        address: dto.address ?? existing.address,
        nationality: dto.nationality ?? existing.nationality,
        state: dto.state ?? existing.state,
        lga: dto.lga ?? existing.lga,
        maritalStatus: dto.marital_status ?? existing.maritalStatus,
        avatar: dto.avatar ?? existing.avatar,
        bio: dto.bio ?? existing.bio,
        occupation: dto.occupation ?? existing.occupation,
        ...(dto.signature_file_id !== undefined
          ? { signatureFileId: dto.signature_file_id || null }
          : {})
      },
      include: {
        organizations: {
          include: { organization: true }
        },
        groups: { include: { group: true } },
        projectMemberships: {
          include: { project: true }
        },
        employeeProfile: {
          include: {
            manager: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        },
        employeeMeta: true,
        onboardingProgress: true,
        signatureFile: { select: { publicUrl: true, storagePath: true } }
      }
    });
    return this.serializeProfile(updated);
  }

  async listUsers(filters: Record<string, any>) {
    const page = Number(filters.page ?? 1);
    const perPage = Number(filters.per_page ?? 15);
    const skip = (page - 1) * perPage;

    const where: any = {};
    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.profile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage
      }),
      this.prisma.profile.count({ where })
    ]);

    return paginatedResponse(data.map((row) => this.serializeUserSummary(row)), { page, per_page: perPage, total });
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.profile.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email already exists');
    const shouldSetPassword = dto.set_password ?? Boolean(dto.password);
    if (shouldSetPassword && !dto.password) {
      throw new BadRequestException('Password is required when "set password" is enabled');
    }
    const shouldSendInvite = dto.send_invite === true;
    const shouldSendWelcomeEmail = dto.send_welcome_email === true;
    const requestedStatus = dto.status === 'pending' ? 'pending' : 'active';
    const effectiveStatus = shouldSendInvite ? 'pending' : requestedStatus;
    if (effectiveStatus === 'active' && !shouldSetPassword) {
      throw new BadRequestException('Active users must have a password or be created as pending');
    }

    const userType = dto.type ?? 'staff';
    let primaryOrganizationId: bigint | null = null;
    if (dto.primary_organization_id) {
      try {
        primaryOrganizationId = toBigInt(dto.primary_organization_id);
      } catch {
        throw new BadRequestException('Invalid primary organization id');
      }
    }
    if (['staff', 'employee'].includes(userType) && !primaryOrganizationId) {
      throw new BadRequestException('Primary organization is required for staff');
    }
    if (primaryOrganizationId) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: primaryOrganizationId },
        select: { id: true }
      });
      if (!organization) throw new BadRequestException('Organization not found');
    }
    const requestedUsername = dto.username?.trim();
    const username = requestedUsername
      ? requestedUsername
      : await generateUniqueUsername(
          makeUsernameSeed(dto.first_name, dto.last_name, email.split('@')[0]),
          async (candidate) =>
            Boolean(await this.prisma.profile.findFirst({ where: { username: candidate } }))
        );
    if (requestedUsername) {
      const usernameExists = await this.prisma.profile.findFirst({
        where: { username }
      });
      if (usernameExists) throw new BadRequestException('Username already exists');
    }

    const passwordHash = shouldSetPassword && dto.password ? await bcrypt.hash(dto.password, 12) : null;
    const roleSlugs = Array.from(new Set(dto.roles?.map((r) => r.trim()).filter(Boolean) ?? []));

    const user = await this.prisma.$transaction(async (tx) => {
      const user = await tx.profile.create({
        data: {
          username,
          email,
          passwordHash,
          type: userType,
          status: effectiveStatus,
          firstName: dto.first_name,
          lastName: dto.last_name,
          primaryOrganizationId
        }
      });

      if (primaryOrganizationId) {
        await tx.profileOrganization.create({
          data: {
            profileId: user.id,
            organizationId: primaryOrganizationId,
            isPrimary: true,
            createdAt: new Date()
          }
        });
      }

      if (roleSlugs.length > 0) {
        const roles = await tx.role.findMany({
          where: { slug: { in: roleSlugs }, isActive: true },
          select: { id: true, slug: true }
        });
        if (roles.length !== roleSlugs.length) {
          const found = new Set(roles.map((r) => r.slug));
          const missing = roleSlugs.filter((slug) => !found.has(slug));
          throw new BadRequestException(`Unknown role(s): ${missing.join(', ')}`);
        }

        await tx.userRole.createMany({
          data: roles.map((role, index) => ({
            profileId: user.id,
            roleId: role.id,
            organizationId: null,
            isPrimaryRole: index === 0
          })),
          skipDuplicates: true
        });
      }

      return user;
    });

    if (shouldSendInvite) {
      const { inviteToken, expiresAt } = await this.issueInvite(user.id, 'pending');
      await this.sendInviteEmail(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        inviteToken,
        expiresAt
      );
    }

    if (shouldSendWelcomeEmail) {
      await this.sendWelcomeEmail({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    }

    return this.serializeUserSummary(user);
  }

  async getUserById(userId: string) {
    const profileId = toBigInt(userId);
    const user = await this.prisma.profile.findUnique({
      where: { id: profileId }
    });
    if (!user) throw new NotFoundException('User not found');
    return this.serializeUserDetail(user);
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const profileId = toBigInt(userId);
    const existing = await this.prisma.profile.findUnique({
      where: { id: profileId }
    });
    if (!existing) throw new NotFoundException('User not found');

    const shouldSetPassword = dto.set_password === true || Boolean(dto.password);
    if (shouldSetPassword && !dto.password) {
      throw new BadRequestException('Password is required when "set password" is enabled');
    }
    const shouldSendInvite = dto.send_invite === true;
    const shouldSendWelcomeEmail = dto.send_welcome_email === true;

    let nextEmail = existing.email;
    if (dto.email !== undefined) {
      nextEmail = dto.email.trim().toLowerCase();
      if (!nextEmail) throw new BadRequestException('Email is required');
      if (nextEmail !== existing.email) {
        const emailExists = await this.prisma.profile.findUnique({ where: { email: nextEmail } });
        if (emailExists && emailExists.id !== existing.id) {
          throw new BadRequestException('Email already exists');
        }
      }
    }

    let nextUsername = existing.username ?? null;
    if (dto.username !== undefined) {
      const requestedUsername = dto.username.trim();
      if (!requestedUsername) {
        nextUsername = await generateUniqueUsername(
          makeUsernameSeed(existing.firstName, existing.lastName, nextEmail.split('@')[0]),
          async (candidate) =>
            Boolean(
              await this.prisma.profile.findFirst({
                where: { username: candidate, id: { not: existing.id } }
              })
            )
        );
      } else {
        const usernameExists = await this.prisma.profile.findFirst({
          where: { username: requestedUsername, id: { not: existing.id } }
        });
        if (usernameExists) throw new BadRequestException('Username already exists');
        nextUsername = requestedUsername;
      }
    }

    const nextType = dto.type ?? existing.type;
    let nextStatus = dto.status ?? (existing.status as 'active' | 'pending' | string);
    let nextPrimaryOrganizationId = existing.primaryOrganizationId;

    if (dto.primary_organization_id !== undefined) {
      const trimmed = dto.primary_organization_id.trim();
      if (!trimmed) {
        nextPrimaryOrganizationId = null;
      } else {
        try {
          nextPrimaryOrganizationId = toBigInt(trimmed);
        } catch {
          throw new BadRequestException('Invalid primary organization id');
        }
      }
    }

    if (['staff', 'employee'].includes(nextType) && !nextPrimaryOrganizationId) {
      throw new BadRequestException('Primary organization is required for staff');
    }

    if (nextPrimaryOrganizationId) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: nextPrimaryOrganizationId },
        select: { id: true }
      });
      if (!organization) throw new BadRequestException('Organization not found');
    }

    if (shouldSendInvite) {
      nextStatus = 'pending';
    }
    if (nextStatus === 'active' && !existing.passwordHash && !shouldSetPassword && !shouldSendInvite) {
      throw new BadRequestException('Active users must have a password or invite link');
    }

    const passwordHash = shouldSetPassword && dto.password ? await bcrypt.hash(dto.password, 12) : undefined;

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.profile.update({
        where: { id: existing.id },
        data: {
          username: nextUsername,
          email: nextEmail,
          firstName: dto.first_name ?? existing.firstName,
          lastName: dto.last_name ?? existing.lastName,
          type: nextType,
          status: nextStatus,
          primaryOrganizationId: nextPrimaryOrganizationId,
          ...(passwordHash ? { passwordHash } : {})
        }
      });

      if (dto.primary_organization_id !== undefined) {
        await tx.profileOrganization.updateMany({
          where: { profileId: existing.id },
          data: { isPrimary: false }
        });
        if (nextPrimaryOrganizationId) {
          await tx.profileOrganization.upsert({
            where: {
              profile_org_unique: {
                profileId: existing.id,
                organizationId: nextPrimaryOrganizationId
              }
            },
            update: { isPrimary: true },
            create: {
              profileId: existing.id,
              organizationId: nextPrimaryOrganizationId,
              isPrimary: true,
              createdAt: new Date()
            }
          });
        }
      }

      return updated;
    });

    if (shouldSendInvite) {
      const { inviteToken, expiresAt } = await this.issueInvite(user.id, 'pending');
      await this.sendInviteEmail(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        inviteToken,
        expiresAt
      );
    }

    if (shouldSendWelcomeEmail) {
      await this.sendWelcomeEmail({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
    }

    return this.serializeUserDetail(user);
  }

  async getUserRoles(userId: string) {
    const profileId = toBigInt(userId);
    const user = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, email: true, username: true }
    });
    if (!user) throw new NotFoundException('User not found');

    const userRoles = await this.prisma.userRole.findMany({
      where: { profileId },
      include: { role: true },
      orderBy: [{ isPrimaryRole: 'desc' }, { assignedAt: 'asc' }]
    });

    return {
      user: {
        id: user.id.toString(),
        email: user.email,
        username: user.username
      },
      roles: userRoles.map((row) => ({
        id: row.role.id.toString(),
        slug: row.role.slug,
        name: row.role.name,
        is_primary: row.isPrimaryRole
      }))
    };
  }

  async setUserRoles(userId: string, dto: AssignUserRolesDto) {
    const profileId = toBigInt(userId);
    const user = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, email: true, username: true }
    });
    if (!user) throw new NotFoundException('User not found');

    const roleSlugs = Array.from(new Set(dto.roles.map((r) => r.trim()).filter(Boolean)));
    if (roleSlugs.length === 0) {
      throw new BadRequestException('At least one role is required');
    }

    const roles = await this.prisma.role.findMany({
      where: { slug: { in: roleSlugs }, isActive: true },
      select: { id: true, slug: true, name: true }
    });

    if (roles.length !== roleSlugs.length) {
      const found = new Set(roles.map((r) => r.slug));
      const missing = roleSlugs.filter((slug) => !found.has(slug));
      throw new BadRequestException(`Unknown role(s): ${missing.join(', ')}`);
    }

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { profileId } }),
      this.prisma.userRole.createMany({
        data: roles.map((role, index) => ({
          profileId,
          roleId: role.id,
          organizationId: null,
          isPrimaryRole: index === 0
        })),
        skipDuplicates: true
      })
    ]);

    return {
      user: {
        id: user.id.toString(),
        email: user.email,
        username: user.username
      },
      roles: roles.map((role, index) => ({
        id: role.id.toString(),
        slug: role.slug,
        name: role.name,
        is_primary: index === 0
      }))
    };
  }

  async inviteUser(userId: string, dto: InviteUserDto) {
    const profileId = toBigInt(userId);
    const user = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    if (!user) throw new NotFoundException('User not found');

    const { inviteToken, expiresAt } = await this.issueInvite(user.id, 'invited');
    await this.sendInviteEmail(user, inviteToken, expiresAt, dto.message);

    return {
      success: true,
      expires_at: expiresAt.toISOString()
    };
  }

  private resolvePortalUrl() {
    return (process.env.PWA_URL || process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  }

  private async issueInvite(profileId: bigint, status: 'pending' | 'invited') {
    const inviteToken = randomToken(32);
    const tokenHash = sha256(inviteToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await this.prisma.$transaction([
      this.prisma.token.deleteMany({
        where: { profileId, type: 'invite' }
      }),
      this.prisma.token.create({
        data: {
          id: randomToken(24),
          profileId,
          type: 'invite',
          tokenHash,
          expiresAt
        }
      }),
      this.prisma.profile.update({
        where: { id: profileId },
        data: { status }
      }),
      this.prisma.onboardingProgress.upsert({
        where: { userId: profileId },
        update: {
          status: 'invited',
          currentStep: 'invite',
          dueDate: expiresAt
        },
        create: {
          userId: profileId,
          status: 'invited',
          currentStep: 'invite',
          dueDate: expiresAt
        }
      })
    ]);

    return { inviteToken, expiresAt };
  }

  private async sendInviteEmail(
    user: { id: bigint; email: string; firstName: string | null; lastName: string | null },
    inviteToken: string,
    expiresAt: Date,
    message?: string
  ) {
    const portalUrl = this.resolvePortalUrl();
    const inviteLink = `${portalUrl}/accept-invite?token=${encodeURIComponent(inviteToken)}`;
    const displayName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    await this.mailService.send({
      to: user.email,
      subject: 'You are invited to StanforteEdge Portal',
      text: `${displayName},\n\nYou have been invited to StanforteEdge Portal. Set up your password here:\n${inviteLink}\n\n${message ?? ''}`.trim(),
      html: `<p>Hello ${displayName},</p><p>You have been invited to StanforteEdge Portal. Set up your password here:</p><p><a href="${inviteLink}">${inviteLink}</a></p>${message ? `<p>${message}</p>` : ''}<p>This invite expires on ${expiresAt.toDateString()}.</p>`,
      threadKey: `invite-${user.id.toString()}`,
      userId: user.id
    });
  }

  private async sendWelcomeEmail(user: { id: bigint; email: string; firstName: string | null; lastName: string | null }) {
    const portalUrl = this.resolvePortalUrl();
    const displayName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    await this.mailService.send({
      to: user.email,
      subject: 'Welcome to StanforteEdge Portal',
      text: `Hello ${displayName},\n\nYour account has been created. You can sign in here:\n${portalUrl}/login`,
      html: `<p>Hello ${displayName},</p><p>Your account has been created.</p><p>You can sign in here: <a href="${portalUrl}/login">${portalUrl}/login</a></p>`,
      threadKey: `welcome-${user.id.toString()}`,
      userId: user.id
    });
  }

  private serializeProfile(user: any): ProfileResponseDto {
    const groupMemberships = (user.groups ?? []).map((item: any) => ({
      id: item.group.id.toString(),
      name: item.group.name,
      type: item.group.type,
      role: item.role,
      is_primary: Boolean(item.isPrimary ?? item.is_primary ?? false)
    }));

    const projectMemberships = (user.projectMemberships ?? []).map((item: any) => ({
      id: item.project.id.toString(),
      name: item.project.name,
      type: 'project',
      role: item.role
    }));

    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      type: user.type,
      status: user.status,
      first_name: user.firstName ?? null,
      last_name: user.lastName ?? null,
      phone: user.phone ?? null,
      address: user.address ?? null,
      date_of_birth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : null,
      gender: user.gender ?? null,
      nationality: user.nationality ?? null,
      state: user.state ?? null,
      lga: user.lga ?? null,
      marital_status: user.maritalStatus ?? null,
      bio: user.bio ?? null,
      occupation: user.occupation ?? null,
      avatar: user.avatar ?? null,
      primary_organization_id: user.primaryOrganizationId ? user.primaryOrganizationId.toString() : null,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      organizations: (user.organizations ?? []).map((item: any) => ({
        id: item.organization.id.toString(),
        name: item.organization.name,
        code: item.organization.code,
        is_primary: item.isPrimary
      })),
      groups: groupMemberships.filter((item: any) => String(item.type).toLowerCase() !== 'project'),
      teams: groupMemberships.filter((item: any) => {
        const type = String(item.type).toLowerCase();
        return type === 'team' || type === 'department';
      }),
      projects: projectMemberships,
      employee_profile: user.employeeProfile
        ? {
            id: user.employeeProfile.id,
            employee_code: user.employeeProfile.employeeCode ?? null,
            job_title: user.employeeProfile.jobTitle ?? null,
            job_description: user.employeeProfile.jobDescription ?? null,
            employment_type: user.employeeProfile.employmentType ?? null,
            employment_status: user.employeeProfile.employmentStatus ?? null,
            hire_date: user.employeeProfile.hireDate ?? null,
            confirmation_date: user.employeeProfile.confirmationDate ?? null,
            exit_date: user.employeeProfile.exitDate ?? null,
            work_mode: user.employeeProfile.workMode ?? null,
            manager:
              user.employeeProfile.manager == null
                ? null
                : {
                    id: user.employeeProfile.manager.id.toString(),
                    first_name: user.employeeProfile.manager.firstName ?? null,
                    last_name: user.employeeProfile.manager.lastName ?? null,
                    email: user.employeeProfile.manager.email ?? null
                  },
            primary_team:
              (() => {
                const pt = (user.groups ?? []).find(
                  (g: any) => g.isPrimary && ['team', 'department'].includes(String(g.group.type).toLowerCase())
                );
                return pt ? { id: pt.group.id.toString(), name: pt.group.name, type: pt.group.type } : null;
              })(),
            primary_organization:
              (() => {
                const po = (user.organizations ?? []).find((o: any) => o.isPrimary);
                return po ? { id: po.organization.id.toString(), name: po.organization.name, code: po.organization.code } : null;
              })(),
            meta: (user.employeeMeta ?? []).reduce((acc: Record<string, unknown>, row: any) => {
              acc[row.metaKey] = row.metaValue;
              return acc;
            }, {})
          }
        : null,
      onboarding_progress: user.onboardingProgress ?? null,
      signature_url: user.signatureFile?.publicUrl ?? user.signatureFile?.storagePath ?? null
    };
  }

  private serializeUserSummary(user: any) {
    return {
      id: user.id.toString(),
      username: user.username ?? null,
      email: user.email,
      type: user.type,
      status: user.status,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      primaryOrganizationId: user.primaryOrganizationId ? user.primaryOrganizationId.toString() : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  private serializeUserDetail(user: any) {
    return this.serializeUserSummary(user);
  }
}
