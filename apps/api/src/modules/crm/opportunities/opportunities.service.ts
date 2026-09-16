import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, ilike, inArray } from 'drizzle-orm';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { DbService } from '$common/db/db.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId } from '$common/utils/ids';
import { profile } from '$modules/identity/users/model';
import { crmAccount } from '../accounts/model';
import { crmActivity } from '../activities/model';
import { crmContact } from '../contacts/model';
import { crmPipeline, crmPipelineStage } from '../pipelines/model';
import { UpsertCrmOpportunityDto } from './dto/upsert-opportunity.dto';
import { crmOpportunity } from './model';

@Injectable()
export class CrmOpportunitiesService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private toPage(query: Record<string, any>) {
    return {
      page: Math.max(1, Number(query.page ?? 1)),
      perPage: Math.min(100, Math.max(1, Number(query.per_page ?? 20))),
    };
  }

  private async ownerMap(profileIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(profileIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const owners = await this.db.client.select().from(profile).where(inArray(profile.id, ids));
    return new Map(owners.map((owner) => [owner.id.toString(), owner]));
  }

  private async accountMap(accountIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(accountIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const tid = this.tenantContext.requireTenantId();
    const accounts = await this.db.client.select().from(crmAccount).where(and(inArray(crmAccount.id, ids), eq(crmAccount.tenantId, tid)));
    return new Map(accounts.map((account) => [account.id.toString(), account]));
  }

  private async contactMap(contactIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(contactIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const tid = this.tenantContext.requireTenantId();
    const contacts = await this.db.client.select().from(crmContact).where(and(inArray(crmContact.id, ids), eq(crmContact.tenantId, tid)));

  private async assertAccountExists(id?: string) {
    if (!id) return;
    const tid = this.tenantContext.requireTenantId();
    const accountId = parseBigIntId(id, 'account id');
    const [account] = await this.db.client
      .select({ id: crmAccount.id })
      .from(crmAccount)
      .where(and(eq(crmAccount.id, accountId), eq(crmAccount.tenantId, tid)))
      .limit(1);
    if (!account) throw new NotFoundException('Account not found');
  }

  private async defaultStages() {
    return [
      { name: 'New', position: 0, probability: 10, isWon: false, isLost: false },
      { name: 'Qualified', position: 1, probability: 40, isWon: false, isLost: false },
      { name: 'Proposal', position: 2, probability: 60, isWon: false, isLost: false },
      { name: 'Negotiation', position: 3, probability: 80, isWon: false, isLost: false },
      { name: 'Won', position: 4, probability: 100, isWon: true, isLost: false },
      { name: 'Lost', position: 5, probability: 0, isWon: false, isLost: true },
    ];
  }

  private async ensureDefaultPipeline() {
    const tid = this.tenantContext.requireTenantId();
    const [existing] = await this.db.client
      .select()
      .from(crmPipeline)
      .where(and(eq(crmPipeline.isDefault, true), eq(crmPipeline.tenantId, tid)))
      .limit(1);
    if (existing) return existing;
    const [first] = await this.db.client
      .select()
      .from(crmPipeline)
      .where(eq(crmPipeline.tenantId, tid))
      .limit(1);
    if (first) return first;

    return this.db.client.transaction(async (tx) => {
      const [pipeline] = await tx.insert(crmPipeline).values({
        tenantId: tid,
        name: 'Default Pipeline',
        description: 'Pipeline seeded by facity CRM',
        isDefault: true,
      }).returning();
      await tx.insert(crmPipelineStage).values(
        (await this.defaultStages()).map((stage) => ({ tenantId: tid, pipelineId: pipeline.id, ...stage })),
      );
      return pipeline;
    });
  }

  async listOpportunities(query: Record<string, any>) {
    const { page, perPage } = this.toPage(query);
    const tid = this.tenantContext.requireTenantId();
    const skip = (page - 1) * perPage;
    const conditions: SQL[] = [eq(crmOpportunity.tenantId, tid)];

    if (query.search) conditions.push(ilike(crmOpportunity.name, `%${String(query.search)}%`));
    if (query.account_id) conditions.push(eq(crmOpportunity.accountId, parseBigIntId(query.account_id, 'account id')));
    if (query.stage_id) conditions.push(eq(crmOpportunity.stageId, parseBigIntId(query.stage_id, 'stage id')));
    if (query.pipeline_id) conditions.push(eq(crmOpportunity.pipelineId, parseBigIntId(query.pipeline_id, 'pipeline id')));
    if (query.status) conditions.push(eq(crmOpportunity.status, String(query.status)));
    if (query.owner_profile_id) conditions.push(eq(crmOpportunity.ownerProfileId, parseBigIntId(query.owner_profile_id, 'owner profile id')));

    const where = and(...conditions);

    const [rows, totalResult] = await Promise.all([
      this.db.client.select().from(crmOpportunity).where(where).orderBy(desc(crmOpportunity.createdAt)).limit(perPage).offset(skip),
      this.db.client.select({ count: count() }).from(crmOpportunity).where(where),
    ]);
    const total = totalResult[0]?.count ?? 0;

    const data = await this.enrichOpportunities(rows);
    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  private async enrichOpportunities(rows: any[]) {
    const accounts = await this.accountMap(rows.map((row) => row.accountId));
    const contacts = await this.contactMap(rows.map((row) => row.contactId));
    const owners = await this.ownerMap(rows.map((row) => row.ownerProfileId));
    const stageIds = rows.map((row) => row.stageId).filter((id): id is bigint => id != null);
    const tid = this.tenantContext.requireTenantId();
    const stages = stageIds.length
      ? await this.db.client.select().from(crmPipelineStage).where(and(inArray(crmPipelineStage.id, stageIds), eq(crmPipelineStage.tenantId, tid)))
      : [];
    const stageById = new Map(stages.map((stage) => [stage.id.toString(), stage]));

    return rows.map((row) => ({
      ...row,
      account: row.accountId ? (accounts.get(row.accountId.toString()) ?? null) : null,
      contact: row.contactId ? (contacts.get(row.contactId.toString()) ?? null) : null,
      owner: row.ownerProfileId ? (owners.get(row.ownerProfileId.toString()) ?? null) : null,
      stage: row.stageId ? (stageById.get(row.stageId.toString()) ?? null) : null,
    }));
  }

  async getOpportunity(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const opportunityId = parseBigIntId(id, 'opportunity id');
    const [opportunity] = await this.db.client
      .select()
      .from(crmOpportunity)
      .where(and(eq(crmOpportunity.id, opportunityId), eq(crmOpportunity.tenantId, tid)))
      .limit(1);
    if (!opportunity) throw new NotFoundException('Opportunity not found');

    const activities = await this.db.client
      .select()
      .from(crmActivity)
      .where(and(eq(crmActivity.opportunityId, opportunityId), eq(crmActivity.tenantId, tid)))
      .orderBy(desc(crmActivity.createdAt));

    const data = await this.enrichOpportunities([opportunity]);
    return { ...data[0], activities };
  }

  async createOpportunity(dto: UpsertCrmOpportunityDto) {
    const tid = this.tenantContext.requireTenantId();
    const data = await this.opportunityData(dto);
    const [opportunity] = await this.db.client
      .insert(crmOpportunity)
      .values({ ...data, tenantId: tid })
      .returning();
    return this.getOpportunity(opportunity.id.toString());
  }

  async updateOpportunity(id: string, dto: UpsertCrmOpportunityDto) {
    const tid = this.tenantContext.requireTenantId();
    const opportunityId = parseBigIntId(id, 'opportunity id');
    const [existing] = await this.db.client
      .select({ id: crmOpportunity.id })
      .from(crmOpportunity)
      .where(and(eq(crmOpportunity.id, opportunityId), eq(crmOpportunity.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Opportunity not found');
    const data = await this.opportunityData(dto);
    await this.db.client
      .update(crmOpportunity)
      .set(data)
      .where(and(eq(crmOpportunity.id, opportunityId), eq(crmOpportunity.tenantId, tid)));
    return this.getOpportunity(id);
  }

  async deleteOpportunity(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const opportunityId = parseBigIntId(id, 'opportunity id');
    const [deleted] = await this.db.client
      .delete(crmOpportunity)
      .where(and(eq(crmOpportunity.id, opportunityId), eq(crmOpportunity.tenantId, tid)))
      .returning();
    if (!deleted) throw new NotFoundException('Opportunity not found');
    return { success: true };
  }

  private async opportunityData(dto: UpsertCrmOpportunityDto) {
    if (dto.account_id) await this.assertAccountExists(dto.account_id);

    let pipelineId = dto.pipeline_id ? parseBigIntId(dto.pipeline_id, 'pipeline id') : undefined;
    let stageId = dto.stage_id ? parseBigIntId(dto.stage_id, 'stage id') : undefined;

    if (stageId) {
      const tid = this.tenantContext.requireTenantId();
      const [stage] = await this.db.client
        .select()
        .from(crmPipelineStage)
        .where(and(eq(crmPipelineStage.id, stageId), eq(crmPipelineStage.tenantId, tid)))
        .limit(1);
      if (!stage) throw new NotFoundException('Stage not found');
      if (pipelineId && stage.pipelineId !== pipelineId) {
        throw new BadRequestException('Stage does not belong to the given pipeline');
      }
      pipelineId = stage.pipelineId;
    }

    if (!stageId) {
      const tid = this.tenantContext.requireTenantId();
      const pipeline = pipelineId
        ? (await this.db.client.select().from(crmPipeline).where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid))).limit(1))[0]
        : await this.ensureDefaultPipeline();
      if (!pipeline) throw new NotFoundException('Pipeline not found');
      const [firstStage] = await this.db.client
        .select()
        .from(crmPipelineStage)
        .where(and(eq(crmPipelineStage.pipelineId, pipeline.id), eq(crmPipelineStage.isActive, true), eq(crmPipelineStage.tenantId, tid)))
        .orderBy(asc(crmPipelineStage.position))
        .limit(1);
      if (firstStage) {
        stageId = firstStage.id;
        pipelineId = pipeline.id;
      }
    }

    return {
      name: dto.name,
      accountId: dto.account_id ? parseBigIntId(dto.account_id, 'account id') : undefined,
      contactId: dto.contact_id ? parseBigIntId(dto.contact_id, 'contact id') : undefined,
      pipelineId,
      stageId,
      ownerProfileId: dto.owner_profile_id ? parseBigIntId(dto.owner_profile_id, 'owner profile id') : undefined,
      amount: dto.amount != null ? String(dto.amount) : '0',
      currency: dto.currency,
      probability: dto.probability,
      expectedCloseDate: dto.expected_close_date ? new Date(dto.expected_close_date) : undefined,
      source: dto.source,
      status: dto.status,
    };
  }
}
