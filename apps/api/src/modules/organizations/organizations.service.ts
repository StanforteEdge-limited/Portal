import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { toBigInt } from '../../common/utils/ids';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrganizations(params: Record<string, any>) {
    const where: any = {};
    if (params.is_active !== undefined) where.isActive = params.is_active === 'true';
    if (params.organization_type) where.organizationType = params.organization_type;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const items = await this.prisma.organization.findMany({
      where,
      include: { childOrganizations: true },
      orderBy: { createdAt: 'desc' }
    });
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async getMyOrganizations(profileId: string) {
    const rows = await this.prisma.profileOrganization.findMany({
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

  async createOrganization(dto: CreateOrganizationDto) {
    const code = dto.code.trim();
    const exists = await this.prisma.organization.findUnique({ where: { code } });
    if (exists) throw new BadRequestException('Organization code already exists');

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        code,
        organizationType: (dto.organization_type ?? 'venture') as OrganizationType,
        isActive: dto.is_active ?? true,
        parentOrganizationId: dto.parent_organization_id ? toBigInt(dto.parent_organization_id) : null,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async updateOrganization(id: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findUnique({ where: { id: toBigInt(id) } });
    if (!org) throw new NotFoundException('Organization not found');

    if (dto.code && dto.code !== org.code) {
      const codeExists = await this.prisma.organization.findUnique({ where: { code: dto.code } });
      if (codeExists) throw new BadRequestException('Organization code already exists');
    }

    return this.prisma.organization.update({
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
            ? (dto.metadata as Prisma.InputJsonValue)
            : (org.metadata ?? Prisma.JsonNull),
        updatedAt: new Date()
      }
    });
  }

  async deleteOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: toBigInt(id) },
      include: { childOrganizations: { select: { id: true } } }
    });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.childOrganizations.length > 0) {
      throw new BadRequestException('Cannot delete organization with child organizations');
    }

    await this.prisma.organization.delete({ where: { id: org.id } });
    return { success: true };
  }

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: toBigInt(id) },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }
}
