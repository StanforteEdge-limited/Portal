import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Policy } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { ResolvePolicyDto } from './dto/resolve-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { paginatedResponse } from '../../common/helpers/paginated-response';

type PolicyContext = {
  organization_id?: string;
  team_id?: string;
  staff_type?: string;
  user_id?: string;
};

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const where: Prisma.PolicyWhereInput = {};
    if (query.modules && Array.isArray(query.modules)) {
      where.module = { in: query.modules.map((m: string) => m.trim().toLowerCase()) };
    } else if (query.module) {
      where.module = String(query.module).trim().toLowerCase();
    }
    if (query.policy_key) where.policyKey = String(query.policy_key).trim().toLowerCase();
    if (query.scope_type) where.scopeType = String(query.scope_type).trim().toLowerCase();
    if (query.scope_id) where.scopeId = String(query.scope_id);
    if (query.is_active === 'true' || query.is_active === 'false') {
      where.isActive = query.is_active === 'true';
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.policy.findMany({
        where,
        include: {
          document: {
            select: { id: true, title: true, version: true, status: true }
          }
        },
        orderBy: [{ module: 'asc' }, { policyKey: 'asc' }, { scopeType: 'asc' }, { priority: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.prisma.policy.count({ where })
    ]);

    return paginatedResponse(rows.map((row) => this.serialize(row)), { page, per_page: perPage, total });
  }

  async create(dto: CreatePolicyDto, actorId?: string) {
    const payload = await this.mapDtoToCreatePayload(dto, actorId);
    const row = await this.prisma.policy.create({
      data: payload,
      include: {
        document: { select: { id: true, title: true, version: true, status: true } }
      }
    });
    return this.serialize(row);
  }

  async update(id: string, dto: UpdatePolicyDto, actorId?: string) {
    const existing = await this.prisma.policy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Policy not found');

    const payload: Prisma.PolicyUncheckedUpdateInput = {};
    if (dto.module !== undefined) payload.module = dto.module.trim().toLowerCase();
    if (dto.policy_key !== undefined) payload.policyKey = dto.policy_key.trim().toLowerCase();
    if (dto.scope_type !== undefined) payload.scopeType = dto.scope_type.trim().toLowerCase();
    if (dto.scope_id !== undefined) payload.scopeId = dto.scope_id || null;
    if (dto.priority !== undefined) payload.priority = dto.priority;
    if (dto.config_json !== undefined) payload.configJson = dto.config_json as Prisma.InputJsonValue;
    if (dto.effective_from !== undefined) payload.effectiveFrom = dto.effective_from ? new Date(dto.effective_from) : null;
    if (dto.effective_to !== undefined) payload.effectiveTo = dto.effective_to ? new Date(dto.effective_to) : null;
    if (dto.is_active !== undefined) payload.isActive = dto.is_active;
    if (dto.document_id !== undefined) payload.documentId = dto.document_id || null;
    if (dto.document_version !== undefined) payload.documentVersion = dto.document_version || null;
    if (dto.require_acknowledgement !== undefined) payload.requireAcknowledgement = dto.require_acknowledgement;
    if (actorId) payload.updatedBy = toBigInt(actorId);

    if (dto.document_id) {
      await this.ensureDocument(dto.document_id);
    }

    const row = await this.prisma.policy.update({
      where: { id },
      data: payload,
      include: {
        document: { select: { id: true, title: true, version: true, status: true } }
      }
    });
    return this.serialize(row);
  }

  async resolve(dto: ResolvePolicyDto) {
    const module = dto.module.trim().toLowerCase();
    const policyKey = dto.policy_key.trim().toLowerCase();
    const context = dto.context ?? {};
    const now = new Date();

    const rows = await this.prisma.policy.findMany({
      where: {
        module,
        policyKey,
        isActive: true,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }]
      },
      include: {
        document: { select: { id: true, title: true, version: true, status: true } }
      }
    });

    const matched = rows
      .filter((row) => this.matchesScope(row, context))
      .sort((a, b) => {
        const rankDelta = this.scopeRank(a.scopeType) - this.scopeRank(b.scopeType);
        if (rankDelta !== 0) return rankDelta;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    const mergedConfig = matched.reduce<Record<string, unknown>>((acc, row) => {
      const cfg =
        row.configJson && typeof row.configJson === 'object' && !Array.isArray(row.configJson)
          ? (row.configJson as Record<string, unknown>)
          : {};
      return { ...acc, ...cfg };
    }, {});

    return {
      module,
      policy_key: policyKey,
      context,
      resolved: matched.length > 0 ? this.serialize(matched[matched.length - 1]) : null,
      merged_config: mergedConfig,
      applied: matched.map((row) => this.serialize(row))
    };
  }

  async delete(id: string) {
    const existing = await this.prisma.policy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Policy not found');
    await this.prisma.policy.delete({ where: { id } });
    return { success: true };
  }

  private async mapDtoToCreatePayload(dto: CreatePolicyDto, actorId?: string): Promise<Prisma.PolicyUncheckedCreateInput> {
    if (dto.document_id) {
      await this.ensureDocument(dto.document_id);
    }

    const module = dto.module.trim().toLowerCase();
    const policyKey = dto.policy_key.trim().toLowerCase();
    const scopeType = (dto.scope_type ?? 'global').trim().toLowerCase();
    const scopeId = dto.scope_id?.trim() || null;

    if (scopeType !== 'global' && !scopeId) {
      throw new BadRequestException('scope_id is required for non-global scope');
    }

    return {
      module,
      policyKey,
      scopeType,
      scopeId,
      priority: dto.priority ?? 100,
      configJson: dto.config_json as Prisma.InputJsonValue,
      effectiveFrom: dto.effective_from ? new Date(dto.effective_from) : null,
      effectiveTo: dto.effective_to ? new Date(dto.effective_to) : null,
      isActive: dto.is_active ?? true,
      documentId: dto.document_id ?? null,
      documentVersion: dto.document_version ?? null,
      requireAcknowledgement: dto.require_acknowledgement ?? false,
      createdBy: actorId ? toBigInt(actorId) : null,
      updatedBy: actorId ? toBigInt(actorId) : null
    };
  }

  private serialize(row: Policy & { document?: { id: string; title: string; version: string; status: string } | null }) {
    return {
      id: row.id,
      module: row.module,
      policy_key: row.policyKey,
      scope_type: row.scopeType,
      scope_id: row.scopeId,
      priority: row.priority,
      config_json: row.configJson,
      effective_from: row.effectiveFrom,
      effective_to: row.effectiveTo,
      is_active: row.isActive,
      document_id: row.documentId,
      document_version: row.documentVersion,
      require_acknowledgement: row.requireAcknowledgement,
      document: row.document
        ? {
            id: row.document.id,
            title: row.document.title,
            version: row.document.version,
            status: row.document.status
          }
        : null,
      created_by: row.createdBy?.toString() ?? null,
      updated_by: row.updatedBy?.toString() ?? null,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private matchesScope(row: Policy, context: PolicyContext) {
    if (row.scopeType === 'global') return true;
    if (!row.scopeId) return false;
    if (row.scopeType === 'organization') return context.organization_id === row.scopeId;
    if (row.scopeType === 'team') return context.team_id === row.scopeId;
    if (row.scopeType === 'staff_type') return context.staff_type === row.scopeId;
    if (row.scopeType === 'user') return context.user_id === row.scopeId;
    return false;
  }

  private scopeRank(scopeType: string) {
    if (scopeType === 'global') return 0;
    if (scopeType === 'organization') return 1;
    if (scopeType === 'team') return 2;
    if (scopeType === 'staff_type') return 3;
    if (scopeType === 'user') return 4;
    return 99;
  }

  private async ensureDocument(documentId: string) {
    const exists = await this.prisma.document.count({ where: { id: documentId } });
    if (!exists) throw new BadRequestException('Invalid document_id');
  }
}
