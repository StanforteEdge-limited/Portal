import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { generateUniqueUsername, makeUsernameSeed } from '../../common/utils/username';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService
  ) {}

  async listUsers(filters: Record<string, any>) {
    const page = Math.max(1, Number(filters.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(filters.per_page ?? 20)));
    const skip = (page - 1) * perPage;

    const where: any = {};

    if (filters.type) where.type = String(filters.type);
    if (filters.status) where.status = String(filters.status);

    const andConditions: any[] = [];

    if (filters.search) {
      const search = String(filters.search);
      andConditions.push({
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    if (filters.organization_id) {
      try {
        const orgId = toBigInt(filters.organization_id);
        andConditions.push({
          OR: [
            { primaryOrganizationId: orgId },
            {
              organizations: {
                some: {
                  organizationId: orgId
                }
              }
            }
          ]
        });
      } catch (err) {
        // ignore invalid org id format
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.profile.findMany({
        where,
        include: {
          organizations: {
            include: { organization: true }
          },
          roles: {
            include: {
              role: { select: { id: true, name: true, slug: true } },
              organization: { select: { id: true, name: true, code: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage
      }),
      this.prisma.profile.count({ where })
    ]);

    return paginatedResponse(users.map((user) => this.serializeUser(user)), { page, per_page: perPage, total });
  }

  async getUser(profileId: string) {
    const id = this.parseId(profileId, 'profile id');
    const user = await this.prisma.profile.findUnique({
      where: { id },
      include: {
        organizations: { include: { organization: true } },
        roles: {
          include: {
            role: true,
            organization: true
          }
        }
      }
    });

    if (!user) throw new NotFoundException('Profile not found');
    return this.serializeUser(user);
  }

  async createUser(dto: CreateAdminUserDto) {
    const email = dto.email.trim().toLowerCase();
    const requestedUsername = dto.username?.trim();
    const username = requestedUsername
      ? requestedUsername
      : await generateUniqueUsername(
          makeUsernameSeed(dto.first_name, dto.last_name, email.split('@')[0]),
          async (candidate) =>
            Boolean(await this.prisma.profile.findFirst({ where: { username: candidate } }))
        );

    const checks = [this.prisma.profile.findUnique({ where: { email } })] as const;
    const emailExists = await checks[0];
    const usernameExists = requestedUsername
      ? await this.prisma.profile.findFirst({ where: { username } })
      : null;

    if (emailExists) throw new BadRequestException('Email already exists');
    if (usernameExists) throw new BadRequestException('Username already exists');

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : null;
    const userType = dto.type ?? 'staff';
    const orgInput = dto.primary_organization_id ?? dto.organization_id;
    let primaryOrganizationId: bigint | null = null;
    if (orgInput !== undefined) {
      const trimmed = String(orgInput).trim();
      if (trimmed) {
        try {
          primaryOrganizationId = toBigInt(trimmed);
        } catch {
          throw new BadRequestException('Invalid primary organization id');
        }
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

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: {
          username,
          email,
          passwordHash,
          firstName: dto.first_name,
          lastName: dto.last_name,
          type: userType,
          status: dto.status ?? 'active',
          primaryOrganizationId
        }
      });

      if (primaryOrganizationId) {
        await tx.profileOrganization.upsert({
          where: {
            profile_org_unique: {
              profileId: created.id,
              organizationId: primaryOrganizationId
            }
          },
          update: { isPrimary: true },
          create: {
            profileId: created.id,
            organizationId: primaryOrganizationId,
            isPrimary: true,
            createdAt: new Date()
          }
        });
      }

      // Assign roles
      if (dto.roles) {
        let roleSlugs: string[] = [];
        if (typeof dto.roles === 'string') {
          roleSlugs = dto.roles.split(',').map((r) => r.trim()).filter(Boolean);
        } else if (Array.isArray(dto.roles)) {
          roleSlugs = dto.roles.map((r) => String(r).trim()).filter(Boolean);
        }

        if (roleSlugs.length > 0) {
          const roles = await tx.role.findMany({
            where: { slug: { in: roleSlugs }, isActive: true },
            select: { id: true }
          });

          await tx.userRole.deleteMany({ where: { profileId: created.id } });
          if (roles.length > 0) {
            await tx.userRole.createMany({
              data: roles.map((role) => ({
                profileId: created.id,
                roleId: role.id,
                isPrimaryRole: false
              }))
            });
          }
        }
      }

      return tx.profile.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          organizations: { include: { organization: true } },
          roles: {
            include: {
              role: true,
              organization: true
            }
          }
        }
      });
    });

    const serialized = this.serializeUser(user);

    // Send invitation email if requested
    const shouldSendInvite = dto.send_invite === true || dto.send_invite === 'true';
    if (shouldSendInvite) {
      try {
        await this.usersService.inviteUser(String(user.id), { message: 'You have been added to the system.' });
      } catch (err) {
        console.error(`Failed to send invite email to ${dto.email}:`, err);
      }
    }

    return serialized;
  }

  async updateUser(profileId: string, dto: UpdateAdminUserDto) {
    const id = this.parseId(profileId, 'profile id');
    const existing = await this.prisma.profile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profile not found');

    const data: {
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      type?: string;
      status?: string;
      primaryOrganizationId?: bigint | null;
      passwordHash?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (dto.username && dto.username !== existing.username) {
      const usernameExists = await this.prisma.profile.findUnique({ where: { username: dto.username } });
      if (usernameExists) throw new BadRequestException('Username already exists');
      data.username = dto.username;
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const emailExists = await this.prisma.profile.findUnique({ where: { email } });
        if (emailExists) throw new BadRequestException('Email already exists');
      }
      data.email = email;
    }

    if (dto.first_name !== undefined) data.firstName = dto.first_name;
    if (dto.last_name !== undefined) data.lastName = dto.last_name;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    const orgInput = dto.primary_organization_id ?? dto.organization_id;
    let nextPrimaryOrganizationId = existing.primaryOrganizationId;
    if (orgInput !== undefined) {
      const trimmed = String(orgInput).trim();
      if (!trimmed) {
        nextPrimaryOrganizationId = null;
      } else {
        try {
          nextPrimaryOrganizationId = toBigInt(trimmed);
        } catch {
          throw new BadRequestException('Invalid primary organization id');
        }
      }
      data.primaryOrganizationId = nextPrimaryOrganizationId;
    }

    const nextType = dto.type ?? existing.type;
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

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.profile.update({
        where: { id },
        data
      });

      if (orgInput !== undefined) {
        await tx.profileOrganization.updateMany({
          where: { profileId: id },
          data: { isPrimary: false }
        });
        if (nextPrimaryOrganizationId) {
          await tx.profileOrganization.upsert({
            where: {
              profile_org_unique: {
                profileId: id,
                organizationId: nextPrimaryOrganizationId
              }
            },
            update: { isPrimary: true },
            create: {
              profileId: id,
              organizationId: nextPrimaryOrganizationId,
              isPrimary: true,
              createdAt: new Date()
            }
          });
        }
      }

      return tx.profile.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          organizations: { include: { organization: true } },
          roles: {
            include: {
              role: true,
              organization: true
            }
          }
        }
      });
    });

    return this.serializeUser(user);
  }

  async updateStatus(profileId: string, dto: UpdateUserStatusDto) {
    const id = this.parseId(profileId, 'profile id');
    const existing = await this.prisma.profile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Profile not found');

    const user = await this.prisma.profile.update({
      where: { id },
      data: {
        status: dto.status,
        updatedAt: new Date()
      },
      include: {
        roles: {
          include: {
            role: true,
            organization: true
          }
        }
      }
    });

    return this.serializeUser(user);
  }

  private parseId(value: string, label: string): bigint {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private serializeUser(user: any) {
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      type: user.type,
      status: user.status,
      phone: user.phone,
      avatar: user.avatar,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      primary_organization_id: user.primaryOrganizationId ? user.primaryOrganizationId.toString() : null,
      roles: (user.roles ?? []).map((userRole: any) => ({
        id: userRole.role.id.toString(),
        name: userRole.role.name,
        slug: userRole.role.slug,
        is_primary_role: userRole.isPrimaryRole,
        organization: userRole.organization
          ? {
              id: userRole.organization.id.toString(),
              name: userRole.organization.name,
              code: userRole.organization.code
            }
          : null
      })),
      organizations: (user.organizations ?? []).map((membership: any) => ({
        id: membership.organization.id.toString(),
        name: membership.organization.name,
        code: membership.organization.code,
        type: membership.organization.organizationType,
        is_active: membership.organization.isActive
      }))
    };
  }

  async createBulkUsers(users: CreateAdminUserDto[]) {
    let successCount = 0;
    let failedCount = 0;
    const results: { identifier: string; status: "success" | "failed"; error?: string }[] = [];

    for (const userDto of users) {
      const identifier = userDto.email || `${userDto.first_name || ''} ${userDto.last_name || ''}`.trim() || 'Unknown';
      try {
        await this.createUser(userDto);
        successCount++;
        results.push({ identifier, status: "success" });
      } catch (err: any) {
        failedCount++;
        results.push({
          identifier,
          status: "failed",
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }

    return {
      successCount,
      failedCount,
      results
    };
  }
}
