import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { toBigInt } from '$common/utils/ids';
import { CreatePolicyDto } from '$modules/requests/policies/dto/create-policy.dto';
import { ResolvePolicyDto } from '$modules/requests/policies/dto/resolve-policy.dto';
import { UpdatePolicyDto } from '$modules/requests/policies/dto/update-policy.dto';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { NewPolicy, Policy, policy } from './model';
import { document } from '$modules/requests/documents/model';

type PolicyContext = {
  organization_id?: string;
  team_id?: string;
  staff_type?: string;
  user_id?: string;
};

@Injectable()
export class PoliciesService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const conditions = this.policyReadConditions();
    if (query.modules && Array.isArray(query.modules)) {
      conditions.push(inArray(policy.module, query.modules.map((m: string) => m.trim().toLowerCase())));
    } else if (query.module) {
      conditions.push(eq(policy.module, String(query.module).trim().toLowerCase()));
    }
    if (query.policy_key) conditions.push(eq(policy.policyKey, String(query.policy_key).trim().toLowerCase()));
    if (query.scope_type) conditions.push(eq(policy.scopeType, String(query.scope_type).trim().toLowerCase()));
    if (query.scope_id) conditions.push(eq(policy.scopeId, String(query.scope_id)));
    if (query.is_active === 'true' || query.is_active === 'false') {
      conditions.push(eq(policy.isActive, query.is_active === 'true'));
    }
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db.client
        .select({ row: policy, document })
        .from(policy)
        .leftJoin(document, eq(policy.documentId, document.id))
        .where(where)
        .orderBy(asc(policy.module), asc(policy.policyKey), asc(policy.scopeType), desc(policy.priority))
        .offset((page - 1) * perPage)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(policy).where(where),
    ]);

    const data = rows.map(({ row, document: linkedDocument }) => ({
      ...row,
      document: linkedDocument
        ? {
            id: linkedDocument.id,
            title: linkedDocument.title,
            version: linkedDocument.version,
            status: linkedDocument.status,
          }
        : null,
    }));
    return paginatedResponse(data.map((row) => this.serialize(row)), {
      page,
      per_page: perPage,
      total: Number(totalRows[0]?.value ?? 0),
    });
  }

  async create(dto: CreatePolicyDto, actorId?: string) {
    const payload = await this.mapDtoToCreatePayload(dto, actorId);
    const [created] = await this.db.client.insert(policy).values(payload).returning();
    const row = await this.getPolicyWithDocument(created.id);
    return this.serialize(row);
  }

  async update(id: string, dto: UpdatePolicyDto, actorId?: string) {
    const existing = await this.findPolicyById(id);
    if (!existing) throw new NotFoundException('Policy not found');

    const payload: Partial<NewPolicy> = {};
    if (dto.module !== undefined) payload.module = dto.module.trim().toLowerCase();
    if (dto.policy_key !== undefined) payload.policyKey = dto.policy_key.trim().toLowerCase();
    if (dto.scope_type !== undefined) payload.scopeType = dto.scope_type.trim().toLowerCase();
    if (dto.scope_id !== undefined) payload.scopeId = dto.scope_id || null;
    if (dto.priority !== undefined) payload.priority = dto.priority;
    if (dto.config_json !== undefined) payload.configJson = dto.config_json;
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

    await this.db.client.update(policy).set(payload).where(and(eq(policy.id, id), ...this.policyWriteConditions()));
    const row = await this.getPolicyWithDocument(id);
    return this.serialize(row);
  }

  async resolve(dto: ResolvePolicyDto) {
    const module = dto.module.trim().toLowerCase();
    const policyKey = dto.policy_key.trim().toLowerCase();
    const context = dto.context ?? {};
    const now = new Date();

    const rows = await this.db.client
      .select({ row: policy, document })
      .from(policy)
      .leftJoin(document, eq(policy.documentId, document.id))
      .where(and(
        ...this.policyReadConditions(),
        eq(policy.module, module),
        eq(policy.policyKey, policyKey),
        eq(policy.isActive, true),
        or(isNull(policy.effectiveFrom), lte(policy.effectiveFrom, now)),
        or(isNull(policy.effectiveTo), gte(policy.effectiveTo, now)),
      ));

    const policies = rows.map(({ row, document: linkedDocument }) => ({
      ...row,
      document: linkedDocument
        ? {
            id: linkedDocument.id,
            title: linkedDocument.title,
            version: linkedDocument.version,
            status: linkedDocument.status,
          }
        : null,
    }));

    const matched = policies
      .filter((row) => this.matchesScope(row, context))
      .sort((a, b) => {
        const rankDelta = this.scopeRank(a.scopeType) - this.scopeRank(b.scopeType);
        if (rankDelta !== 0) return rankDelta;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    const mergedConfig = (matched as any[]).reduce((acc: Record<string, unknown>, row) => {
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
    const existing = await this.findPolicyById(id);
    if (!existing) throw new NotFoundException('Policy not found');
    await this.db.client.delete(policy).where(and(eq(policy.id, id), ...this.policyWriteConditions()));
    return { success: true };
  }

  private async mapDtoToCreatePayload(dto: CreatePolicyDto, actorId?: string): Promise<NewPolicy> {
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
      configJson: dto.config_json,
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
    const [exists] = await this.db.client
      .select({ value: count() })
      .from(document)
      .where(eq(document.id, documentId));
    if (!Number(exists?.value ?? 0)) throw new BadRequestException('Invalid document_id');
  }

  private currentTenantId() {
    const context = this.tenantContext.get();
    return context && context.scope !== 'system' ? context.tenantId : undefined;
  }

  private policyReadConditions(): SQL[] {
    const tenantId = this.currentTenantId();
    return tenantId ? [or(eq(policy.tenantId, tenantId), isNull(policy.tenantId)) as SQL] : [];
  }

  private policyWriteConditions(): SQL[] {
    const tenantId = this.currentTenantId();
    return tenantId ? [eq(policy.tenantId, tenantId)] : [];
  }

  private async findPolicyById(id: string) {
    const [row] = await this.db.client
      .select()
      .from(policy)
      .where(and(eq(policy.id, id), ...this.policyReadConditions()))
      .limit(1);
    return row ?? null;
  }

  private async getPolicyWithDocument(id: string) {
    const [row] = await this.db.client
      .select({ row: policy, document })
      .from(policy)
      .leftJoin(document, eq(policy.documentId, document.id))
      .where(and(eq(policy.id, id), ...this.policyReadConditions()))
      .limit(1);

    if (!row) throw new NotFoundException('Policy not found');
    return {
      ...row.row,
      document: row.document
        ? {
            id: row.document.id,
            title: row.document.title,
            version: row.document.version,
            status: row.document.status,
          }
        : null,
    };
  }
}
