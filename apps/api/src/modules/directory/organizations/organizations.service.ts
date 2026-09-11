import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationType, Drizzle } from '$common/db/drizzle-compat';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { toBigInt } from '$common/utils/ids';
import { CreateOrganizationDto } from '$modules/directory/organizations/dto/create-organization.dto';
import { UpdateOrganizationDto } from '$modules/directory/organizations/dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async listOrganizations(params: Record<string, any>) {
    const where: Drizzle.OrganizationWhereInput = {};
    if (params.is_active !== undefined) where.isActive = params.is_active === 'true';
    if (params.organization_type) where.organizationType = params.organization_type;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const items = await this.drizzle.organization.findMany({
      where,
      include: { childOrganizations: true },
      orderBy: { createdAt: 'desc' }
    });
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async getMyOrganizations(profileId: string) {
    const rows = await this.drizzle.profileOrganization.findMany({
      where: { profileId: toBigInt(profileId) },
      include: { organization: true }
    });

    const items = rows.map((row) => ({
      is_primary: row.isPrimary,
      start_date: row.startDate,
      end_date: row.endDate,
      organization: row.organization
    }));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createOrganization(dto: CreateOrganizationDto, tenantId?: bigint) {
    const code = dto.code.trim();
    const exists = await this.drizzle.organization.findUnique({ where: { code } });
    if (exists) throw new BadRequestException('Organization code already exists');

    return this.drizzle.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          code,
          organizationType: (dto.organization_type ?? 'venture') as OrganizationType,
          isActive: dto.is_active ?? true,
          parentOrganizationId: dto.parent_organization_id ? toBigInt(dto.parent_organization_id) : null,
          metadata: dto.metadata as Drizzle.InputJsonValue | undefined,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      if (tenantId) {
        await tx.tenantOrganization.create({
          data: { tenantId, organizationId: organization.id },
        });
      }
      return organization;
    });
  }

  async updateOrganization(id: string, dto: UpdateOrganizationDto) {
    const org = await this.drizzle.organization.findUnique({ where: { id: toBigInt(id) } });
    if (!org) throw new NotFoundException('Organization not found');

    if (dto.code && dto.code !== org.code) {
      const codeExists = await this.drizzle.organization.findUnique({ where: { code: dto.code } });
      if (codeExists) throw new BadRequestException('Organization code already exists');
    }

    return this.drizzle.organization.update({
      where: { id: org.id },
      data: {
        name: dto.name ?? org.name,
        code: dto.code ?? org.code,
        organizationType: (dto.organization_type as OrganizationType | undefined) ?? org.organizationType,
        isActive: dto.is_active ?? org.isActive,
        parentOrganizationId:
          dto.parent_organization_id === null
            ? null
            : dto.parent_organization_id
              ? toBigInt(dto.parent_organization_id)
              : org.parentOrganizationId,
        metadata:
          dto.metadata !== undefined
            ? (dto.metadata as Drizzle.InputJsonValue)
            : (org.metadata ?? Drizzle.JsonNull),
        updatedAt: new Date()
      }
    });
  }

  async deleteOrganization(id: string) {
    const org = await this.drizzle.organization.findUnique({
      where: { id: toBigInt(id) },
      include: { childOrganizations: { select: { id: true } } }
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.childOrganizations.length > 0) {
      throw new BadRequestException('Cannot delete organization with child organizations');
    }

    await this.drizzle.organization.delete({ where: { id: org.id } });
    return { success: true };
  }

  async getOrganization(id: string) {
    const org = await this.drizzle.organization.findUnique({
      where: { id: toBigInt(id) },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
