import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { generateUniqueUsername, makeUsernameSeed } from '$common/utils/username';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

const RESERVED_SLUGS = new Set([
  'admin', 'administrator', 'system', 'platform', 'stanforteedge',
  'stanforte-edge', 'demo', 'test', 'tenant', 'workspace', 'api', 'beta', 'www',
]);

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createWorkspace(dto: CreateWorkspaceDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const slug = this.normalizeSlug(dto.slug ?? name);
    if (RESERVED_SLUGS.has(slug)) throw new BadRequestException('Workspace slug is reserved');

    await this.tenantContext.runSystem('workspace.createWorkspace.validate', async () => {
      const [existingTenant, existingProfile] = await Promise.all([
        this.drizzle.tenant.findUnique({ where: { slug } }),
        this.drizzle.profile.findUnique({ where: { email } }),
      ]);
      if (existingTenant) throw new BadRequestException('Workspace slug is already taken');
      if (existingProfile) {
        throw new BadRequestException('A user with this email already exists; sign in and join a workspace instead');
      }
    });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const username = await generateUniqueUsername(
      makeUsernameSeed(dto.first_name, dto.last_name, email.split('@')[0]),
      async (candidate) =>
        await this.tenantContext.runSystem('workspace.createWorkspace.username', () =>
          this.drizzle.profile.findFirst({ where: { username: candidate } }).then(Boolean),
        ),
    );

    return this.tenantContext.runSystem('workspace.createWorkspace', () =>
      this.drizzle.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name, slug, plan: dto.plan?.trim() || 'trial' },
        });

        const owner = await tx.profile.create({
          data: {
            username,
            email,
            passwordHash,
            type: 'admin',
            status: 'active',
            firstName: dto.first_name,
            lastName: dto.last_name,
          },
        });

        await tx.tenantMembership.create({
          data: { tenantId: tenant.id, profileId: owner.id, status: 'active', isOwner: true },
        });

        const adminRoles = await tx.role.findMany({
          where: { slug: { in: ['administrator', 'admin'] }, isActive: true, tenantId: null },
          select: { id: true },
        });

        if (adminRoles.length > 0) {
          await tx.userRole.createMany({
            data: adminRoles.map((role) => ({
              profileId: owner.id,
              roleId: role.id,
              tenantId: tenant.id,
              organizationId: null,
              isPrimaryRole: true,
            })),
            skipDuplicates: true,
          });
        }

        return {
          tenant_id: tenant.id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          owner_id: owner.id.toString(),
          email: owner.email,
          role: adminRoles.length > 0 ? 'administrator' : 'owner',
        };
      }),
    );
  }

  private normalizeSlug(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!slug || slug.length < 2) throw new BadRequestException('A valid workspace slug is required');
    if (slug.length > 100) throw new BadRequestException('Workspace slug is too long');
    return slug;
  }
}