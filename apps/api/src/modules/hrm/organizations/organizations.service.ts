import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, desc, eq, ilike, or } from 'drizzle-orm';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { DbService } from '$common/db/db.service';
import { toBigInt } from '$common/utils/ids';
import { CreateOrganizationDto } from '$modules/hrm/organizations/dto/create-organization.dto';
import { UpdateOrganizationDto } from '$modules/hrm/organizations/dto/update-organization.dto';
import { organization, profileOrganization } from './model';
import { tenantOrganization } from '$modules/tenancy/model';
import { organizationTypeEnum } from '$app/db/enums';

type OrganizationType = (typeof organizationTypeEnum.enumValues)[number];

@Injectable()
export class OrganizationsService {
  constructor(private readonly db: DbService) {}

  async listOrganizations(params: Record<string, any>, tenantId?: bigint) {
    const conditions: SQL[] = [];
    if (tenantId) conditions.push(eq(organization.tenantId, tenantId));
    if (params.is_active !== undefined) conditions.push(eq(organization.isActive, params.is_active === 'true'));
    if (params.organization_type) conditions.push(eq(organization.organizationType, params.organization_type));
    if (params.search) {
      const search = `%${params.search}%`;
      conditions.push(or(ilike(organization.name, search), ilike(organization.code, search)) as SQL);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const items = await this.db.client
      .select()
      .from(organization)
      .where(where)
      .orderBy(desc(organization.createdAt));
    const itemsWithChildren = await Promise.all(
      items.map(async (item) => ({
        ...item,
        childOrganizations: await this.db.client
          .select()
          .from(organization)
          .where(eq(organization.parentOrganizationId, item.id)),
      })),
    );
    return paginatedResponse(itemsWithChildren, { page: 1, per_page: items.length, total: items.length });
  }

  async getMyOrganizations(profileId: string, tenantId?: bigint) {
    const conditions: SQL[] = [eq(profileOrganization.profileId, toBigInt(profileId))];
    if (tenantId) conditions.push(eq(profileOrganization.tenantId, tenantId));
    const rows = await this.db.client
      .select({ membership: profileOrganization, organization })
      .from(profileOrganization)
      .leftJoin(organization, eq(profileOrganization.organizationId, organization.id))
      .where(and(...conditions));

    const items = rows.map((row) => ({
      is_primary: row.membership.isPrimary,
      start_date: row.membership.startDate,
      end_date: row.membership.endDate,
      organization: row.organization
    }));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createOrganization(dto: CreateOrganizationDto, tenantId?: bigint) {
    const code = dto.code.trim();
    const [exists] = await this.db.client.select().from(organization).where(eq(organization.code, code)).limit(1);
    if (exists) throw new BadRequestException('Organization code already exists');

    return this.db.client.transaction(async (tx) => {
      const [created] = await tx
        .insert(organization)
        .values({
          tenantId: tenantId ?? null,
          name: dto.name,
          code,
          organizationType: (dto.organization_type ?? 'venture') as OrganizationType,
          isActive: dto.is_active ?? true,
          parentOrganizationId: dto.parent_organization_id ? toBigInt(dto.parent_organization_id) : null,
          metadata: dto.metadata,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      if (tenantId) {
        await tx.insert(tenantOrganization).values({ tenantId, organizationId: created.id });
      }
      return created;
    });
  }

  async updateOrganization(id: string, dto: UpdateOrganizationDto, tenantId?: bigint) {
    const org = await this.findOrganization(toBigInt(id), tenantId);
    if (!org) throw new NotFoundException('Organization not found');

    if (dto.code && dto.code !== org.code) {
      const [codeExists] = await this.db.client.select().from(organization).where(eq(organization.code, dto.code)).limit(1);
      if (codeExists) throw new BadRequestException('Organization code already exists');
    }

    const [updated] = await this.db.client
      .update(organization)
      .set({
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
            ? dto.metadata
            : (org.metadata ?? null),
        updatedAt: new Date()
      })
      .where(eq(organization.id, org.id))
      .returning();
    return updated ?? null;
  }

  async deleteOrganization(id: string, tenantId?: bigint) {
    const org = await this.findOrganization(toBigInt(id), tenantId);
    if (!org) throw new NotFoundException('Organization not found');
    const children = await this.db.client
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.parentOrganizationId, org.id));
    if (children.length > 0) {
      throw new BadRequestException('Cannot delete organization with child organizations');
    }

    await this.db.client.delete(organization).where(eq(organization.id, org.id));
    return { success: true };
  }

  async getOrganization(id: string, tenantId?: bigint) {
    const org = await this.findOrganization(toBigInt(id), tenantId);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  private async findOrganization(id: bigint, tenantId?: bigint) {
    const conditions = [eq(organization.id, id)];
    if (tenantId) conditions.push(eq(organization.tenantId, tenantId));
    const [row] = await this.db.client
      .select()
      .from(organization)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }
}
