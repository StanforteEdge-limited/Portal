import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SQL, and, asc, count, desc, eq, ilike, inArray, isNull, ne, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { toBigInt } from '$common/utils/ids';
import { UpdateProfileDto } from '$modules/identity/users/dto/update-profile.dto';
import { CreateUserDto } from '$modules/identity/users/dto/create-user.dto';
import { ProfileResponseDto } from '$modules/identity/users/dto/profile-response.dto';
import { AssignUserRolesDto } from '$modules/identity/users/dto/assign-user-roles.dto';
import { InviteUserDto } from '$modules/identity/users/dto/invite-user.dto';
import { UpdateUserDto } from '$modules/identity/users/dto/update-user.dto';
import { randomToken, sha256 } from '$common/utils/crypto';
import { MailService } from '$common/mail/mail.service';
import { MailQueueService } from '$common/mail/mail-queue.service';
import { generateUniqueUsername, makeUsernameSeed } from '$common/utils/username';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { TenantContext } from '$common/auth/tenant-context';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { profile } from '$modules/identity/users/model';
import { organization as organizationTable, profileOrganization } from '$modules/directory/organizations/model';
import { tenantMembership, tenantOrganization } from '$modules/tenancy/model';
import { role as roleTable, userRole as userRoleTable } from '$modules/identity/rbac/model';
import { group as groupTable, groupUser } from '$modules/communication/groups/model';
import { project as projectTable, projectMember } from '$modules/operations/projects/model';
import { employeeProfile, employeeMeta, onboardingProgress } from '$modules/hr/hr/model';
import { fileAsset } from '$modules/storage/model';
import { token as tokenTable } from '$modules/identity/auth/model';

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DbService,
    private readonly mailService: MailService,
    private readonly mailQueue: MailQueueService,
    private readonly tenantContext: TenantContextService
  ) {}

async getMyProfile(profileId: string, tenant?: TenantContext) {
    const user = await this.enrichProfile(toBigInt(profileId));
    if (!tenant) return this.serializeProfile(user);

    return this.serializeProfile({
      ...user,
      organizations: (user.organizations ?? []).filter((item: any) => item.tenantId === tenant.tenantId),
      groups: (user.groups ?? []).filter((item: any) => item.group?.tenantId === tenant.tenantId),
      projectMemberships: (user.projectMemberships ?? []).filter(
        (item: any) => item.project?.tenantId === tenant.tenantId,
      ),
      employeeProfile:
        user.employeeProfile?.tenantId === tenant.tenantId ? user.employeeProfile : null,
    });
  }

  async updateMyProfile(profileId: string, dto: UpdateProfileDto, tenant?: TenantContext) {
    const parsedProfileId = toBigInt(profileId);
    if (tenant) {
      const [membership] = await this.db.client
        .select({ id: tenantMembership.id })
        .from(tenantMembership)
        .where(
          and(
            eq(tenantMembership.tenantId, tenant.tenantId),
            eq(tenantMembership.profileId, parsedProfileId),
            eq(tenantMembership.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw new NotFoundException('Profile not found');
    }
    const [existing] = await this.db.client
      .select()
      .from(profile)
      .where(eq(profile.id, parsedProfileId))
      .limit(1);
    if (!existing) throw new NotFoundException('Profile not found');

    await this.db.client
      .update(profile)
      .set({
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
          : {}),
      })
      .where(eq(profile.id, existing.id));

    return this.serializeProfile(await this.enrichProfile(existing.id));
  }

  async listUsers(filters: Record<string, any>, tenant?: TenantContext) {
    const page = Number(filters.page ?? 1);
    const perPage = Number(filters.per_page ?? 15);
    const skip = (page - 1) * perPage;

    const conditions: SQL[] = [];
    if (filters.search) {
      const search = `%${String(filters.search)}%`;
      conditions.push(
        or(
          ilike(profile.username, search),
          ilike(profile.email, search),
          ilike(profile.firstName, search),
          ilike(profile.lastName, search),
        ) as SQL,
      );
    }
    if (filters.type) conditions.push(eq(profile.type, String(filters.type)));
    if (filters.status) conditions.push(eq(profile.status, String(filters.status)));
    if (tenant) {
      const memberships = await this.db.client
        .select({ profileId: tenantMembership.profileId })
        .from(tenantMembership)
        .where(and(eq(tenantMembership.tenantId, tenant.tenantId), eq(tenantMembership.status, 'active')));
      conditions.push(inArray(profile.id, memberships.map((membership) => membership.profileId)));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, totalResult] = await Promise.all([
      this.db.client.select().from(profile).where(where).orderBy(desc(profile.createdAt)).limit(perPage).offset(skip),
      this.db.client.select({ count: count() }).from(profile).where(where),
    ]);
    const total = totalResult[0]?.count ?? 0;

    return paginatedResponse(rows.map((row) => this.serializeUserSummary(row)), { page, per_page: perPage, total });
  }

  async createUser(dto: CreateUserDto, tenant?: TenantContext) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.tenantContext.runSystem('users.createUser.emailCheck', async () => {
      const [row] = await this.db.client.select().from(profile).where(eq(profile.email, email)).limit(1);
      return row ?? null;
    });
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
      const [organization] = await this.db.client
        .select({ id: organizationTable.id })
        .from(organizationTable)
        .where(eq(organizationTable.id, primaryOrganizationId))
        .limit(1);
      if (!organization) throw new BadRequestException('Organization not found');
      if (tenant) {
        const [mapping] = await this.db.client
          .select()
          .from(tenantOrganization)
          .where(
            and(
              eq(tenantOrganization.tenantId, tenant.tenantId),
              eq(tenantOrganization.organizationId, primaryOrganizationId),
            ),
          )
          .limit(1);
        if (!mapping) throw new BadRequestException('Organization does not belong to the active tenant');
      }
    }
    const requestedUsername = dto.username?.trim();
    const username = requestedUsername
      ? requestedUsername
      : await generateUniqueUsername(
          makeUsernameSeed(dto.first_name, dto.last_name, email.split('@')[0]),
          async (candidate) =>
            Boolean((await this.db.client.select().from(profile).where(eq(profile.username, candidate)).limit(1))[0])
        );
    if (requestedUsername) {
      const usernameExists = await this.db.client
        .select()
        .from(profile)
        .where(eq(profile.username, username))
        .limit(1);
      if (usernameExists[0]) throw new BadRequestException('Username already exists');
    }

    const passwordHash = shouldSetPassword && dto.password ? await bcrypt.hash(dto.password, 12) : null;
    const roleSlugs = Array.from(new Set(dto.roles?.map((r) => r.trim()).filter(Boolean) ?? []));

    const user = await this.db.client.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(profile)
        .values({
          username,
          email,
          passwordHash,
          type: userType,
          status: effectiveStatus,
          firstName: dto.first_name,
          lastName: dto.last_name,
          primaryOrganizationId,
        })
        .returning();

      if (primaryOrganizationId) {
        await tx.insert(profileOrganization).values({
          profileId: createdUser.id,
          organizationId: primaryOrganizationId,
          tenantId: tenant?.tenantId,
          isPrimary: true,
          createdAt: new Date(),
        });
      }
      if (tenant) {
        await tx.insert(tenantMembership).values({
          tenantId: tenant.tenantId,
          profileId: createdUser.id,
          status: 'active',
          isOwner: false,
        });
      }

if (roleSlugs.length > 0) {
        const roleCond = tenant?.tenantId
          ? or(eq(roleTable.tenantId, tenant.tenantId), isNull(roleTable.tenantId))
          : undefined;
        const roles = await tx
          .select({ id: roleTable.id, slug: roleTable.slug })
          .from(roleTable)
          .where(and(inArray(roleTable.slug, roleSlugs), eq(roleTable.isActive, true), roleCond));
        if (roles.length !== roleSlugs.length) {
          const found = new Set(roles.map((r) => r.slug));
          const missing = roleSlugs.filter((slug) => !found.has(slug));
          throw new BadRequestException(`Unknown role(s): ${missing.join(', ')}`);
        }

        await tx
          .insert(userRoleTable)
          .values(
            roles.map((role, index) => ({
              profileId: createdUser.id,
              roleId: role.id,
              tenantId: tenant?.tenantId as bigint,
              organizationId: null,
              isPrimaryRole: index === 0,
            })),
          )
          .onConflictDoNothing();
      }

      return createdUser;
    });

    if (shouldSendInvite) {
      const { inviteToken, expiresAt } = await this.issueInvite(user.id, 'pending');
      await this.sendInviteEmail(
        {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
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
        lastName: user.lastName,
      });
    }

    return this.serializeUserSummary(user);
  }

  async getUserById(userId: string, tenant?: TenantContext) {
    const profileId = toBigInt(userId);
    if (tenant) {
      const [membership] = await this.db.client
        .select({ id: tenantMembership.id })
        .from(tenantMembership)
        .where(
          and(
            eq(tenantMembership.tenantId, tenant.tenantId),
            eq(tenantMembership.profileId, profileId),
            eq(tenantMembership.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw new NotFoundException('User not found');
    }
    const [user] = await this.db.client.select().from(profile).where(eq(profile.id, profileId)).limit(1);
    if (!user) throw new NotFoundException('User not found');
    return this.serializeUserDetail(user);
  }

  async updateUser(userId: string, dto: UpdateUserDto, tenant?: TenantContext) {
    const profileId = toBigInt(userId);
    if (tenant) {
      const [membership] = await this.db.client
        .select({ id: tenantMembership.id })
        .from(tenantMembership)
        .where(
          and(
            eq(tenantMembership.tenantId, tenant.tenantId),
            eq(tenantMembership.profileId, profileId),
            eq(tenantMembership.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw new NotFoundException('User not found');
    }
    const [existing] = await this.db.client.select().from(profile).where(eq(profile.id, profileId)).limit(1);
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
        const emailExists = await this.tenantContext.runSystem('users.updateUser.emailCheck', async () => {
          const [row] = await this.db.client.select().from(profile).where(eq(profile.email, nextEmail)).limit(1);
          return row ?? null;
        });
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
              (
                await this.db.client
                  .select()
                  .from(profile)
                  .where(and(eq(profile.username, candidate), ne(profile.id, existing.id)))
                  .limit(1)
              )[0]
            )
        );
      } else {
        const usernameExists = await this.db.client
          .select()
          .from(profile)
          .where(and(eq(profile.username, requestedUsername), ne(profile.id, existing.id)))
          .limit(1);
        if (usernameExists[0]) throw new BadRequestException('Username already exists');
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
      const orgCond = tenant?.tenantId
        ? or(eq(organizationTable.tenantId, tenant.tenantId), isNull(organizationTable.tenantId))
        : undefined;
      const [organization] = await this.db.client
        .select({ id: organizationTable.id })
        .from(organizationTable)
        .where(and(eq(organizationTable.id, nextPrimaryOrganizationId), orgCond))
        .limit(1);
      if (!organization) throw new BadRequestException('Organization not found');
    }

    if (shouldSendInvite) {
      nextStatus = 'pending';
    }
    if (nextStatus === 'active' && !existing.passwordHash && !shouldSetPassword && !shouldSendInvite) {
      throw new BadRequestException('Active users must have a password or invite link');
    }

    const passwordHash = shouldSetPassword && dto.password ? await bcrypt.hash(dto.password, 12) : undefined;

    const user = await this.db.client.transaction(async (tx) => {
      const [updated] = await tx
        .update(profile)
        .set({
          username: nextUsername,
          email: nextEmail,
          firstName: dto.first_name ?? existing.firstName,
          lastName: dto.last_name ?? existing.lastName,
          type: nextType,
          status: nextStatus,
          primaryOrganizationId: nextPrimaryOrganizationId,
          ...(passwordHash ? { passwordHash } : {}),
        })
        .where(eq(profile.id, existing.id))
        .returning();

if (dto.primary_organization_id !== undefined) {
        const clearPrimaryWhere: SQL[] = [eq(profileOrganization.profileId, existing.id)];
        if (tenant?.tenantId) clearPrimaryWhere.push(eq(profileOrganization.tenantId, tenant.tenantId));
        await tx.update(profileOrganization).set({ isPrimary: false }).where(and(...clearPrimaryWhere));
        if (nextPrimaryOrganizationId) {
          await tx
            .insert(profileOrganization)
            .values({
              profileId: existing.id,
              organizationId: nextPrimaryOrganizationId,
              tenantId: tenant?.tenantId ?? null,
              isPrimary: true,
              createdAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [profileOrganization.profileId, profileOrganization.organizationId],
              set: { isPrimary: true },
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
          lastName: user.lastName,
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
        lastName: user.lastName,
      });
    }

    return this.serializeUserDetail(user);
  }

  async getUserRoles(userId: string, tenant?: TenantContext) {
    const profileId = toBigInt(userId);
    const [user] = await this.db.client
      .select({ id: profile.id, email: profile.email, username: profile.username })
      .from(profile)
      .where(eq(profile.id, profileId))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    if (tenant) {
      const [membership] = await this.db.client
        .select({ id: tenantMembership.id })
        .from(tenantMembership)
        .where(
          and(
            eq(tenantMembership.tenantId, tenant.tenantId),
            eq(tenantMembership.profileId, profileId),
            eq(tenantMembership.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw new NotFoundException('User not found');
    }

    const userRoles = await this.db.client
      .select({ userRole: userRoleTable, role: roleTable })
      .from(userRoleTable)
      .leftJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
      .where(
        and(
          eq(userRoleTable.profileId, profileId),
          tenant ? eq(userRoleTable.tenantId, tenant.tenantId) : undefined,
        ),
      )
      .orderBy(desc(userRoleTable.isPrimaryRole), asc(userRoleTable.assignedAt));

    return {
      user: {
        id: user.id.toString(),
        email: user.email,
        username: user.username,
      },
      roles: userRoles.map((row) => ({
        id: row.role?.id?.toString() ?? '',
        slug: row.role?.slug ?? '',
        name: row.role?.name ?? '',
        is_primary: row.userRole.isPrimaryRole,
      })),
    };
  }

  async setUserRoles(userId: string, dto: AssignUserRolesDto, tenant?: TenantContext) {
    const profileId = toBigInt(userId);
    const [user] = await this.db.client
      .select({ id: profile.id, email: profile.email, username: profile.username })
      .from(profile)
      .where(eq(profile.id, profileId))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    if (tenant) {
      const [membership] = await this.db.client
        .select({ id: tenantMembership.id })
        .from(tenantMembership)
        .where(
          and(
            eq(tenantMembership.tenantId, tenant.tenantId),
            eq(tenantMembership.profileId, profileId),
            eq(tenantMembership.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw new NotFoundException('User not found');
    }

    const roleSlugs = Array.from(new Set(dto.roles.map((r) => r.trim()).filter(Boolean)));
    if (roleSlugs.length === 0) {
      throw new BadRequestException('At least one role is required');
    }

const roleCond = tenant?.tenantId
      ? or(eq(roleTable.tenantId, tenant.tenantId), isNull(roleTable.tenantId))
      : undefined;

    const roles = await this.db.client
      .select({ id: roleTable.id, slug: roleTable.slug, name: roleTable.name })
      .from(roleTable)
      .where(and(inArray(roleTable.slug, roleSlugs), eq(roleTable.isActive, true), roleCond));

    if (roles.length !== roleSlugs.length) {
      const found = new Set(roles.map((r) => r.slug));
      const missing = roleSlugs.filter((slug) => !found.has(slug));
      throw new BadRequestException(`Unknown role(s): ${missing.join(', ')}`);
    }

    await this.db.client.transaction(async (tx) => {
      await tx
        .delete(userRoleTable)
        .where(and(eq(userRoleTable.profileId, profileId), tenant ? eq(userRoleTable.tenantId, tenant.tenantId) : undefined));
      await tx
        .insert(userRoleTable)
        .values(
          roles.map((role, index) => ({
            profileId,
            roleId: role.id,
            tenantId: tenant?.tenantId as bigint,
            organizationId: null,
            isPrimaryRole: index === 0,
          })),
        )
        .onConflictDoNothing();
    });

    return {
      user: {
        id: user.id.toString(),
        email: user.email,
        username: user.username,
      },
      roles: roles.map((role, index) => ({
        id: role.id.toString(),
        slug: role.slug,
        name: role.name,
        is_primary: index === 0,
      })),
    };
  }

async inviteUser(userId: string, dto: InviteUserDto, tenantId?: bigint) {
    const profileId = toBigInt(userId);
    const [user] = await this.db.client
      .select({ id: profile.id, email: profile.email, firstName: profile.firstName, lastName: profile.lastName })
      .from(profile)
      .where(eq(profile.id, profileId))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    if (tenantId) {
      const [membership] = await this.db.client
        .select({ id: tenantMembership.id })
        .from(tenantMembership)
        .where(
          and(
            eq(tenantMembership.tenantId, tenantId),
            eq(tenantMembership.profileId, profileId),
            eq(tenantMembership.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw new NotFoundException('User is not a member of this tenant');
    }

    const { inviteToken, expiresAt } = await this.issueInvite(user.id, 'invited', tenantId);
    await this.sendInviteEmail(user, inviteToken, expiresAt, dto.message);

    return {
      success: true,
      expires_at: expiresAt.toISOString(),
    };
  }

  async sendResetLink(userId: string, dto: InviteUserDto, tenant?: TenantContext) {
    const profileId = toBigInt(userId);
    const [user] = await this.db.client
      .select({ id: profile.id, email: profile.email, firstName: profile.firstName, lastName: profile.lastName })
      .from(profile)
      .where(eq(profile.id, profileId))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');
    if (tenant) {
      const [membership] = await this.db.client
        .select({ id: tenantMembership.id })
        .from(tenantMembership)
        .where(
          and(
            eq(tenantMembership.tenantId, tenant.tenantId),
            eq(tenantMembership.profileId, profileId),
            eq(tenantMembership.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw new NotFoundException('User not found');
    }

    const resetToken = randomToken(32);
    const tokenHash = sha256(resetToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.db.client.transaction(async (tx) => {
      await tx.delete(tokenTable).where(and(eq(tokenTable.profileId, profileId), eq(tokenTable.type, 'reset')));
      await tx.insert(tokenTable).values({
        id: randomToken(24),
        profileId,
        type: 'reset',
        tokenHash,
        expiresAt,
      });
    });

    const portalUrl = this.resolvePortalUrl();
    const resetLink = `${portalUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const displayName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    await this.mailQueue.enqueue({
      to: user.email,
      subject: 'Reset your StanforteEdge password',
      text: `${displayName},\n\nYour administrator requested a password reset. Use this link to set a new password:\n${resetLink}\n\n${dto.message ?? ''}`.trim(),
      html: `<p>Hello ${displayName},</p><p>Your administrator requested a password reset. Use this link to set a new password:</p><p><a href="${resetLink}">${resetLink}</a></p>${dto.message ? `<p>${dto.message}</p>` : ''}<p>This link expires in 30 minutes.</p>`,
      template: 'reset_password',
      templateContext: {
        subject: 'Reset your StanforteEdge password',
        displayName,
        resetUrl: resetLink,
      },
      threadKey: `admin-reset-${user.id.toString()}`,
      userId: user.id,
    });

    return { success: true, expires_at: expiresAt.toISOString() };
  }

  private resolvePortalUrl() {
    return (process.env.PWA_URL || process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  }

  private async issueInvite(profileId: bigint, status: 'pending' | 'invited', tenantId?: bigint) {
    const inviteToken = randomToken(32);
    const tokenHash = sha256(inviteToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await this.db.client.transaction(async (tx) => {
      await tx.delete(tokenTable).where(and(eq(tokenTable.profileId, profileId), eq(tokenTable.type, 'invite')));
      await tx.insert(tokenTable).values({
        id: randomToken(24),
        profileId,
        tenantId,
        type: 'invite',
        tokenHash,
        expiresAt,
      });
      await tx.update(profile).set({ status }).where(eq(profile.id, profileId));
      await tx
        .insert(onboardingProgress)
        .values({
          userId: profileId,
          status: 'invited',
          currentStep: 'invite',
          dueDate: expiresAt,
        })
        .onConflictDoUpdate({
          target: onboardingProgress.userId,
          set: {
            status: 'invited',
            currentStep: 'invite',
            dueDate: expiresAt,
          },
        });
    });

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

    await this.mailQueue.enqueue({
      to: user.email,
      subject: 'You are invited to StanforteEdge Portal',
      text: `${displayName},\n\nYou have been invited to StanforteEdge Portal. Set up your password here:\n${inviteLink}\n\n${message ?? ''}`.trim(),
      html: `<p>Hello ${displayName},</p><p>You have been invited to StanforteEdge Portal. Set up your password here:</p><p><a href="${inviteLink}">${inviteLink}</a></p>${message ? `<p>${message}</p>` : ''}<p>This invite expires on ${expiresAt.toDateString()}.</p>`,
      template: 'invitation',
      templateContext: {
        subject: 'You are invited to StanforteEdge Portal',
        displayName,
        inviteUrl: inviteLink,
        expiresOn: expiresAt.toDateString(),
        message: message?.trim() || undefined,
      },
      threadKey: `invite-${user.id.toString()}`,
      userId: user.id,
    });
  }

  private async sendWelcomeEmail(user: { id: bigint; email: string; firstName: string | null; lastName: string | null }) {
    const portalUrl = this.resolvePortalUrl();
    const displayName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;

    await this.mailQueue.enqueue({
      to: user.email,
      subject: 'Welcome to StanforteEdge Portal',
      text: `Hello ${displayName},\n\nYour account has been created. You can sign in here:\n${portalUrl}/login`,
      html: `<p>Hello ${displayName},</p><p>Your account has been created.</p><p>You can sign in here: <a href="${portalUrl}/login">${portalUrl}/login</a></p>`,
      template: 'welcome',
      templateContext: {
        subject: 'Welcome to StanforteEdge Portal',
        displayName,
        portalUrl: `${portalUrl}/login`,
      },
      threadKey: `welcome-${user.id.toString()}`,
      userId: user.id,
    });
  }

  private async enrichProfile(userId: bigint): Promise<any> {
    const [user] = await this.db.client.select().from(profile).where(eq(profile.id, userId)).limit(1);
    if (!user) throw new NotFoundException('Profile not found');

    const [orgRows, groupRows, projectRows, employeeRows, metaRows, onboardingRows, signatureRows] = await Promise.all([
      this.db.client
        .select({ membership: profileOrganization, organization: organizationTable })
        .from(profileOrganization)
        .leftJoin(organizationTable, eq(profileOrganization.organizationId, organizationTable.id))
        .where(eq(profileOrganization.profileId, userId)),
      this.db.client
        .select({ membership: groupUser, group: groupTable })
        .from(groupUser)
        .leftJoin(groupTable, eq(groupUser.groupId, groupTable.id))
        .where(eq(groupUser.userId, userId)),
      this.db.client
        .select({ membership: projectMember, project: projectTable })
        .from(projectMember)
        .leftJoin(projectTable, eq(projectMember.projectId, projectTable.id))
        .where(eq(projectMember.userId, userId)),
      this.db.client.select().from(employeeProfile).where(eq(employeeProfile.userId, userId)).limit(1),
      this.db.client.select().from(employeeMeta).where(eq(employeeMeta.userId, userId)),
      this.db.client.select().from(onboardingProgress).where(eq(onboardingProgress.userId, userId)).limit(1),
      user.signatureFileId
        ? this.db.client
            .select({ publicUrl: fileAsset.publicUrl, storagePath: fileAsset.storagePath })
            .from(fileAsset)
            .where(eq(fileAsset.id, user.signatureFileId))
            .limit(1)
        : (Promise.resolve([]) as Promise<Array<{ publicUrl: string | null; storagePath: string }>>),
    ]);

    const emp = employeeRows[0];
    let manager: { id: bigint; firstName: string | null; lastName: string | null; email: string | null } | null = null;
    if (emp?.managerUserId) {
      const [m] = await this.db.client
        .select({ id: profile.id, firstName: profile.firstName, lastName: profile.lastName, email: profile.email })
        .from(profile)
        .where(eq(profile.id, emp.managerUserId))
        .limit(1);
      manager = m ?? null;
    }

    return {
      ...user,
      organizations: orgRows.map((row) => ({ ...row.membership, organization: row.organization })),
      groups: groupRows.map((row) => ({ ...row.membership, group: row.group })),
      projectMemberships: projectRows.map((row) => ({ ...row.membership, project: row.project })),
      employeeProfile: emp ? { ...emp, manager } : null,
      employeeMeta: metaRows,
      onboardingProgress: onboardingRows[0] ?? null,
      signatureFile: signatureRows[0] ?? null,
    };
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
      organizations: (user.organizations ?? []).map((item: any) => {
        const metadata =
          item.organization.metadata && typeof item.organization.metadata === 'object'
            ? (item.organization.metadata as Record<string, unknown>)
            : {};
        return {
          id: item.organization.id.toString(),
          name: item.organization.name,
          code: item.organization.code,
          is_primary: item.isPrimary,
          logo_url: typeof metadata.logo_url === 'string' ? metadata.logo_url : null,
          theme: typeof metadata.theme === 'string' ? metadata.theme : 'ocean',
        };
      }),
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
                    email: user.employeeProfile.manager.email ?? null,
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