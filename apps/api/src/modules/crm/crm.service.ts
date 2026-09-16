import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, ilike, inArray, isNull, isNotNull, or, sql } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId } from '$common/utils/ids';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { UpsertCrmAccountDto } from './dto/upsert-account.dto';
import { UpsertCrmActivityDto } from './dto/upsert-activity.dto';
import { UpsertCrmContactDto } from './dto/upsert-contact.dto';
import { UpsertCrmLeadDto } from './dto/upsert-lead.dto';
import { UpsertCrmOpportunityDto } from './dto/upsert-opportunity.dto';
import { ReplaceCrmPipelineStagesDto, UpsertCrmPipelineDto } from './dto/upsert-pipeline.dto';
import { crmAccount, crmContact, crmLead, crmPipeline, crmPipelineStage, crmOpportunity, crmActivity } from './model';
import { profile } from '$modules/identity/users/model';

@Injectable()
export class CrmService {
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
    return new Map(contacts.map((contact) => [contact.id.toString(), contact]));
  }

  async listAccounts(query: Record<string, any>) {
    const { page, perPage } = this.toPage(query);
    const tid = this.tenantContext.requireTenantId();
    const skip = (page - 1) * perPage;
    const conditions: SQL[] = [eq(crmAccount.tenantId, tid)];

    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(crmAccount.name, search), ilike(crmAccount.email, search), ilike(crmAccount.industry, search)) as SQL);
    }
    if (query.status) conditions.push(eq(crmAccount.status, String(query.status)));
    if (query.type) conditions.push(eq(crmAccount.type, String(query.type)));
    if (query.lifecycle_stage) conditions.push(eq(crmAccount.lifecycleStage, String(query.lifecycle_stage)));
    if (query.owner_profile_id) conditions.push(eq(crmAccount.ownerProfileId, parseBigIntId(query.owner_profile_id, 'owner profile id')));

    const where = and(...conditions);

    const [rows, totalResult] = await Promise.all([
      this.db.client.select().from(crmAccount).where(where).orderBy(asc(crmAccount.name)).limit(perPage).offset(skip),
      this.db.client.select({ count: count() }).from(crmAccount).where(where),
    ]);
    const total = totalResult[0]?.count ?? 0;

    const accountIds = rows.map((row) => row.id);
    const counts = accountIds.length
      ? await this.db.client
          .select({ accountId: crmContact.accountId, count: count() })
          .from(crmContact)
          .where(inArray(crmContact.accountId, accountIds))
          .groupBy(crmContact.accountId)
      : [];
    const countByAccount = new Map(counts.map((entry) => [entry.accountId.toString(), entry.count ?? 0]));
    const owners = await this.ownerMap(rows.map((row) => row.ownerProfileId));

    const data = rows.map((row) => ({
      ...row,
      contactCount: countByAccount.get(row.id.toString()) ?? 0,
      owner: row.ownerProfileId ? (owners.get(row.ownerProfileId.toString()) ?? null) : null,
    }));

    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  async getAccount(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const accountId = parseBigIntId(id, 'account id');
    const [account] = await this.db.client
      .select()
      .from(crmAccount)
      .where(and(eq(crmAccount.id, accountId), eq(crmAccount.tenantId, tid)))
      .limit(1);
    if (!account) throw new NotFoundException('Account not found');

    const [contacts, opportunities, owner] = await Promise.all([
      this.db.client
        .select()
        .from(crmContact)
        .where(and(eq(crmContact.accountId, accountId), eq(crmContact.tenantId, tid)))
        .orderBy(desc(crmContact.isPrimary), asc(crmContact.firstName)),
      this.db.client
        .select()
        .from(crmOpportunity)
        .where(and(eq(crmOpportunity.accountId, accountId), eq(crmOpportunity.tenantId, tid)))
        .orderBy(desc(crmOpportunity.createdAt)),
      account.ownerProfileId
        ? this.db.client.select().from(profile).where(eq(profile.id, account.ownerProfileId)).limit(1).then((r) => r[0] ?? null)
        : Promise.resolve(null),
    ]);

    return { ...account, owner, contacts, opportunities };
  }

  async createAccount(dto: UpsertCrmAccountDto) {
    const tid = this.tenantContext.requireTenantId();
    const data = this.accountData(dto);
    const [account] = await this.db.client
      .insert(crmAccount)
      .values({ ...data, tenantId: tid })
      .returning();
    return this.getAccount(account.id.toString());
  }

  async updateAccount(id: string, dto: UpsertCrmAccountDto) {
    const tid = this.tenantContext.requireTenantId();
    const accountId = parseBigIntId(id, 'account id');
    const [existing] = await this.db.client
      .select({ id: crmAccount.id })
      .from(crmAccount)
      .where(and(eq(crmAccount.id, accountId), eq(crmAccount.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Account not found');
    await this.db.client
      .update(crmAccount)
      .set(this.accountData(dto))
      .where(and(eq(crmAccount.id, accountId), eq(crmAccount.tenantId, tid)));
    return this.getAccount(id);
  }

  async deleteAccount(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const accountId = parseBigIntId(id, 'account id');
    const [deleted] = await this.db.client
      .delete(crmAccount)
      .where(and(eq(crmAccount.id, accountId), eq(crmAccount.tenantId, tid)))
      .returning();
    if (!deleted) throw new NotFoundException('Account not found');
    return { success: true };
  }

  private accountData(dto: UpsertCrmAccountDto) {
    return {
      name: dto.name,
      industry: dto.industry,
      website: dto.website,
      phone: dto.phone,
      email: dto.email ? dto.email.trim().toLowerCase() : undefined,
      type: dto.type,
      lifecycleStage: dto.lifecycle_stage,
      status: dto.status,
      ownerProfileId: dto.owner_profile_id ? parseBigIntId(dto.owner_profile_id, 'owner profile id') : undefined,
    };
  }

  async listContacts(query: Record<string, any>) {
    const { page, perPage } = this.toPage(query);
    const tid = this.tenantContext.requireTenantId();
    const skip = (page - 1) * perPage;
    const conditions: SQL[] = [eq(crmContact.tenantId, tid)];

    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(crmContact.email, search), ilike(crmContact.firstName, search), ilike(crmContact.lastName, search)) as SQL);
    }
    if (query.account_id) conditions.push(eq(crmContact.accountId, parseBigIntId(query.account_id, 'account id')));
    if (query.is_primary === 'true' || query.is_primary === true) conditions.push(eq(crmContact.isPrimary, true));

    const where = and(...conditions);

    const [rows, totalResult] = await Promise.all([
      this.db.client.select().from(crmContact).where(where).orderBy(asc(crmContact.firstName)).limit(perPage).offset(skip),
      this.db.client.select({ count: count() }).from(crmContact).where(where),
    ]);
    const total = totalResult[0]?.count ?? 0;

    const accounts = await this.accountMap(rows.map((row) => row.accountId));

    const data = rows.map((row) => ({
      ...row,
      account: row.accountId ? (accounts.get(row.accountId.toString()) ?? null) : null,
    }));

    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  async getContact(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const contactId = parseBigIntId(id, 'contact id');
    const [contact] = await this.db.client
      .select()
      .from(crmContact)
      .where(and(eq(crmContact.id, contactId), eq(crmContact.tenantId, tid)))
      .limit(1);
    if (!contact) throw new NotFoundException('Contact not found');
    const account = contact.accountId
      ? (await this.db.client.select().from(crmAccount).where(and(eq(crmAccount.id, contact.accountId), eq(crmAccount.tenantId, tid))).limit(1))[0] ?? null
      : null;
    return { ...contact, account };
  }

  async createContact(dto: UpsertCrmContactDto) {
    const tid = this.tenantContext.requireTenantId();
    await this.assertAccountExists(dto.account_id);
    const [contact] = await this.db.client
      .insert(crmContact)
      .values({
        tenantId: tid,
        accountId: dto.account_id ? parseBigIntId(dto.account_id, 'account id') : undefined,
        firstName: dto.first_name,
        lastName: dto.last_name,
        email: dto.email ? dto.email.trim().toLowerCase() : undefined,
        phone: dto.phone,
        jobTitle: dto.job_title,
        isPrimary: dto.is_primary,
      })
      .returning();
    return this.getContact(contact.id.toString());
  }

  async updateContact(id: string, dto: UpsertCrmContactDto) {
    const tid = this.tenantContext.requireTenantId();
    const contactId = parseBigIntId(id, 'contact id');
    const [existing] = await this.db.client
      .select({ id: crmContact.id })
      .from(crmContact)
      .where(and(eq(crmContact.id, contactId), eq(crmContact.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Contact not found');
    await this.assertAccountExists(dto.account_id);
    await this.db.client
      .update(crmContact)
      .set({
        accountId: dto.account_id ? parseBigIntId(dto.account_id, 'account id') : undefined,
        firstName: dto.first_name,
        lastName: dto.last_name,
        email: dto.email ? dto.email.trim().toLowerCase() : undefined,
        phone: dto.phone,
        jobTitle: dto.job_title,
        isPrimary: dto.is_primary,
      })
      .where(and(eq(crmContact.id, contactId), eq(crmContact.tenantId, tid)));
    return this.getContact(id);
  }

  async deleteContact(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const contactId = parseBigIntId(id, 'contact id');
    const [deleted] = await this.db.client
      .delete(crmContact)
      .where(and(eq(crmContact.id, contactId), eq(crmContact.tenantId, tid)))
      .returning();
    if (!deleted) throw new NotFoundException('Contact not found');
    return { success: true };
  }

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

  async listLeads(query: Record<string, any>) {
    const { page, perPage } = this.toPage(query);
    const tid = this.tenantContext.requireTenantId();
    const skip = (page - 1) * perPage;
    const conditions: SQL[] = [eq(crmLead.tenantId, tid)];

    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(crmLead.email, search), ilike(crmLead.firstName, search), ilike(crmLead.lastName, search), ilike(crmLead.company, search)) as SQL);
    }
    if (query.status) conditions.push(eq(crmLead.status, String(query.status)));
    if (query.source) conditions.push(eq(crmLead.source, String(query.source)));
    if (query.owner_profile_id) conditions.push(eq(crmLead.ownerProfileId, parseBigIntId(query.owner_profile_id, 'owner profile id')));

    const where = and(...conditions);

    const [rows, totalResult] = await Promise.all([
      this.db.client.select().from(crmLead).where(where).orderBy(desc(crmLead.createdAt)).limit(perPage).offset(skip),
      this.db.client.select({ count: count() }).from(crmLead).where(where),
    ]);
    const total = totalResult[0]?.count ?? 0;

    const owners = await this.ownerMap(rows.map((row) => row.ownerProfileId));

    const data = rows.map((row) => ({
      ...row,
      owner: row.ownerProfileId ? (owners.get(row.ownerProfileId.toString()) ?? null) : null,
    }));

    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  async getLead(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const leadId = parseBigIntId(id, 'lead id');
    const [lead] = await this.db.client
      .select()
      .from(crmLead)
      .where(and(eq(crmLead.id, leadId), eq(crmLead.tenantId, tid)))
      .limit(1);
    if (!lead) throw new NotFoundException('Lead not found');
    const owner = lead.ownerProfileId
      ? (await this.db.client.select().from(profile).where(eq(profile.id, lead.ownerProfileId)).limit(1))[0] ?? null
      : null;
    return { ...lead, owner };
  }

  async createLead(dto: UpsertCrmLeadDto) {
    const tid = this.tenantContext.requireTenantId();
    const [lead] = await this.db.client
      .insert(crmLead)
      .values({ ...this.leadData(dto), tenantId: tid })
      .returning();
    return this.getLead(lead.id.toString());
  }

  async updateLead(id: string, dto: UpsertCrmLeadDto) {
    const tid = this.tenantContext.requireTenantId();
    const leadId = parseBigIntId(id, 'lead id');
    const [existing] = await this.db.client
      .select({ id: crmLead.id })
      .from(crmLead)
      .where(and(eq(crmLead.id, leadId), eq(crmLead.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Lead not found');
    await this.db.client
      .update(crmLead)
      .set(this.leadData(dto))
      .where(and(eq(crmLead.id, leadId), eq(crmLead.tenantId, tid)));
    return this.getLead(id);
  }

  async deleteLead(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const leadId = parseBigIntId(id, 'lead id');
    const [deleted] = await this.db.client
      .delete(crmLead)
      .where(and(eq(crmLead.id, leadId), eq(crmLead.tenantId, tid)))
      .returning();
    if (!deleted) throw new NotFoundException('Lead not found');
    return { success: true };
  }

  private leadData(dto: UpsertCrmLeadDto) {
    return {
      firstName: dto.first_name,
      lastName: dto.last_name,
      email: dto.email ? dto.email.trim().toLowerCase() : undefined,
      phone: dto.phone,
      company: dto.company,
      source: dto.source,
      status: dto.status,
      score: dto.score,
      ownerProfileId: dto.owner_profile_id ? parseBigIntId(dto.owner_profile_id, 'owner profile id') : undefined,
    };
  }

  async convertLead(id: string, dto: ConvertLeadDto) {
    const tid = this.tenantContext.requireTenantId();
    const leadId = parseBigIntId(id, 'lead id');

    return this.db.client.transaction(async (tx) => {
      const [lead] = await tx.select().from(crmLead).where(and(eq(crmLead.id, leadId), eq(crmLead.tenantId, tid))).limit(1);
      if (!lead) throw new NotFoundException('Lead not found');
      if (lead.convertedAccountId || lead.convertedContactId) {
        throw new BadRequestException('Lead has already been converted');
      }

      let accountId = dto.account_id ? parseBigIntId(dto.account_id, 'account id') : null;
      if (accountId) {
        const [account] = await tx.select({ id: crmAccount.id }).from(crmAccount).where(and(eq(crmAccount.id, accountId), eq(crmAccount.tenantId, tid))).limit(1);
        if (!account) throw new NotFoundException('Account not found');
      } else {
        const accountName = dto.account_name || lead.company || `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim();
        if (!accountName) throw new BadRequestException('An account name is required to convert the lead');
        const [account] = await tx.insert(crmAccount).values({
          tenantId: tid,
          name: accountName,
          industry: dto.industry,
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          lifecycleStage: 'customer',
          ownerProfileId: lead.ownerProfileId ?? undefined,
        }).returning();
        accountId = account.id;
      }

      const [contact] = await tx.insert(crmContact).values({
        tenantId: tid,
        accountId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        isPrimary: true,
      }).returning();

      await tx.update(crmLead).set({ convertedAccountId: accountId, convertedContactId: contact.id, status: 'converted' }).where(eq(crmLead.id, leadId));

      return { success: true, accountId: accountId.toString(), contactId: contact.id.toString() };
    });
  }

  async listPipelines() {
    const tid = this.tenantContext.requireTenantId();
    const pipelines = await this.db.client
      .select()
      .from(crmPipeline)
      .where(eq(crmPipeline.tenantId, tid))
      .orderBy(desc(crmPipeline.isDefault), asc(crmPipeline.createdAt));
    if (!pipelines.length) {
      const seeded = await this.ensureDefaultPipeline();
      const stages = await this.db.client
        .select()
        .from(crmPipelineStage)
        .where(and(eq(crmPipelineStage.pipelineId, seeded.id), eq(crmPipelineStage.tenantId, tid)))
        .orderBy(asc(crmPipelineStage.position));
      return [{ ...seeded, stages }];
    }

    const pipelineIds = pipelines.map((pipeline) => pipeline.id);
    const stages = await this.db.client
      .select()
      .from(crmPipelineStage)
      .where(and(inArray(crmPipelineStage.pipelineId, pipelineIds), eq(crmPipelineStage.tenantId, tid)))
      .orderBy(asc(crmPipelineStage.position));
    const byPipeline = new Map<string, any[]>();
    for (const stage of stages) {
      const key = stage.pipelineId.toString();
      const bucket = byPipeline.get(key);
      if (bucket) bucket.push(stage);
      else byPipeline.set(key, [stage]);
    }

    return pipelines.map((pipeline) => ({
      ...pipeline,
      stages: byPipeline.get(pipeline.id.toString()) ?? [],
    }));
  }

  async getPipeline(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const pipelineId = id === 'default' ? (await this.ensureDefaultPipeline()).id : parseBigIntId(id, 'pipeline id');
    const [pipeline] = await this.db.client
      .select()
      .from(crmPipeline)
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)))
      .limit(1);
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const [stages, opportunities] = await Promise.all([
      this.db.client
        .select()
        .from(crmPipelineStage)
        .where(and(eq(crmPipelineStage.pipelineId, pipelineId), eq(crmPipelineStage.tenantId, tid)))
        .orderBy(asc(crmPipelineStage.position)),
      this.db.client
        .select()
        .from(crmOpportunity)
        .where(and(eq(crmOpportunity.pipelineId, pipelineId), eq(crmOpportunity.tenantId, tid)))
        .orderBy(desc(crmOpportunity.createdAt)),
    ]);

    return { ...pipeline, stages, opportunities };
  }

  async createPipeline(dto: UpsertCrmPipelineDto) {
    const tid = this.tenantContext.requireTenantId();
    const isDefault = dto.is_default === true;
    if (isDefault) {
      await this.db.client
        .update(crmPipeline)
        .set({ isDefault: false })
        .where(and(eq(crmPipeline.isDefault, true), eq(crmPipeline.tenantId, tid)));
    }

    const [pipeline] = await this.db.client
      .insert(crmPipeline)
      .values({
        tenantId: tid,
        name: dto.name,
        description: dto.description,
        isDefault,
      })
      .returning();

    if (dto.stages?.length) {
      await this.db.client.insert(crmPipelineStage).values(
        dto.stages.map((stage, index) => ({
          tenantId: tid,
          pipelineId: pipeline.id,
          name: stage.name,
          position: stage.position ?? index,
          probability: stage.probability ?? 0,
          color: stage.color,
          isWon: stage.is_won ?? false,
          isLost: stage.is_lost ?? false,
        })),
      );
    }

    return this.getPipeline(pipeline.id.toString());
  }

  async updatePipeline(id: string, dto: UpsertCrmPipelineDto) {
    const tid = this.tenantContext.requireTenantId();
    const pipelineId = parseBigIntId(id, 'pipeline id');
    const [existing] = await this.db.client
      .select({ id: crmPipeline.id })
      .from(crmPipeline)
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Pipeline not found');

    if (dto.is_default === true) {
      await this.db.client
        .update(crmPipeline)
        .set({ isDefault: false })
        .where(and(eq(crmPipeline.isDefault, true), eq(crmPipeline.tenantId, tid)));
    }

    await this.db.client
      .update(crmPipeline)
      .set({
        name: dto.name,
        description: dto.description,
        isDefault: dto.is_default,
      })
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)));

    return this.getPipeline(id);
  }

  async replacePipelineStages(id: string, dto: ReplaceCrmPipelineStagesDto) {
    const tid = this.tenantContext.requireTenantId();
    const pipelineId = parseBigIntId(id, 'pipeline id');
    const [existing] = await this.db.client
      .select({ id: crmPipeline.id })
      .from(crmPipeline)
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Pipeline not found');

    await this.db.client.transaction(async (tx) => {
      await tx.delete(crmPipelineStage).where(and(eq(crmPipelineStage.pipelineId, pipelineId), eq(crmPipelineStage.tenantId, tid)));
      await tx.insert(crmPipelineStage).values(
        dto.stages.map((stage, index) => ({
          tenantId: tid,
          pipelineId,
          name: stage.name,
          position: stage.position ?? index,
          probability: stage.probability ?? 0,
          color: stage.color,
          isWon: stage.is_won ?? false,
          isLost: stage.is_lost ?? false,
        })),
      );
    });

    return this.getPipeline(id);
  }

  async deletePipeline(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const pipelineId = parseBigIntId(id, 'pipeline id');
    const [deleted] = await this.db.client
      .delete(crmPipeline)
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)))
      .returning();
    if (!deleted) throw new NotFoundException('Pipeline not found');
    return { success: true };
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

  async listActivities(query: Record<string, any>) {
    const { page, perPage } = this.toPage(query);
    const tid = this.tenantContext.requireTenantId();
    const skip = (page - 1) * perPage;
    const conditions: SQL[] = [eq(crmActivity.tenantId, tid)];

    if (query.account_id) conditions.push(eq(crmActivity.accountId, parseBigIntId(query.account_id, 'account id')));
    if (query.contact_id) conditions.push(eq(crmActivity.contactId, parseBigIntId(query.contact_id, 'contact id')));
    if (query.opportunity_id) conditions.push(eq(crmActivity.opportunityId, parseBigIntId(query.opportunity_id, 'opportunity id')));
    if (query.type) conditions.push(eq(crmActivity.type, String(query.type)));
    if (query.done === 'false') conditions.push(isNull(crmActivity.doneAt));
    if (query.done === 'true') conditions.push(isNotNull(crmActivity.doneAt));

    const where = and(...conditions);

    const [rows, totalResult] = await Promise.all([
      this.db.client.select().from(crmActivity).where(where).orderBy(desc(crmActivity.createdAt)).limit(perPage).offset(skip),
      this.db.client.select({ count: count() }).from(crmActivity).where(where),
    ]);
    const total = totalResult[0]?.count ?? 0;

    const data = await this.enrichActivities(rows);
    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  private async enrichActivities(rows: any[]) {
    const accounts = await this.accountMap(rows.map((row) => row.accountId));
    const contacts = await this.contactMap(rows.map((row) => row.contactId));
    const opportunities = await this.accountOpportunityMap(rows.map((row) => row.opportunityId));

    return rows.map((row) => ({
      ...row,
      account: row.accountId ? (accounts.get(row.accountId.toString()) ?? null) : null,
      contact: row.contactId ? (contacts.get(row.contactId.toString()) ?? null) : null,
      opportunity: row.opportunityId ? (opportunities.get(row.opportunityId.toString()) ?? null) : null,
    }));
  }

  private async accountOpportunityMap(opportunityIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(opportunityIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const tid = this.tenantContext.requireTenantId();
    const opportunities = await this.db.client.select().from(crmOpportunity).where(and(inArray(crmOpportunity.id, ids), eq(crmOpportunity.tenantId, tid)));
    return new Map(opportunities.map((opportunity) => [opportunity.id.toString(), opportunity]));
  }

  async getActivity(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const activityId = parseBigIntId(id, 'activity id');
    const [activity] = await this.db.client
      .select()
      .from(crmActivity)
      .where(and(eq(crmActivity.id, activityId), eq(crmActivity.tenantId, tid)))
      .limit(1);
    if (!activity) throw new NotFoundException('Activity not found');
    return (await this.enrichActivities([activity]))[0];
  }

  async createActivity(dto: UpsertCrmActivityDto, userId?: bigint) {
    const tid = this.tenantContext.requireTenantId();
    if (dto.account_id) await this.assertAccountExists(dto.account_id);
    if (dto.contact_id) {
      const contactId = parseBigIntId(dto.contact_id, 'contact id');
      const [contact] = await this.db.client
        .select({ id: crmContact.id })
        .from(crmContact)
        .where(and(eq(crmContact.id, contactId), eq(crmContact.tenantId, tid)))
        .limit(1);
      if (!contact) throw new NotFoundException('Contact not found');
    }
    if (dto.opportunity_id) {
      const opportunityId = parseBigIntId(dto.opportunity_id, 'opportunity id');
      const [opportunity] = await this.db.client
        .select({ id: crmOpportunity.id })
        .from(crmOpportunity)
        .where(and(eq(crmOpportunity.id, opportunityId), eq(crmOpportunity.tenantId, tid)))
        .limit(1);
      if (!opportunity) throw new NotFoundException('Opportunity not found');
    }

    const [activity] = await this.db.client
      .insert(crmActivity)
      .values({
        tenantId: tid,
        accountId: dto.account_id ? parseBigIntId(dto.account_id, 'account id') : undefined,
        contactId: dto.contact_id ? parseBigIntId(dto.contact_id, 'contact id') : undefined,
        opportunityId: dto.opportunity_id ? parseBigIntId(dto.opportunity_id, 'opportunity id') : undefined,
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        dueAt: dto.due_at ? new Date(dto.due_at) : undefined,
        doneAt: dto.done_at ? new Date(dto.done_at) : undefined,
        createdBy: userId,
      })
      .returning();
    return this.getActivity(activity.id.toString());
  }

  async updateActivity(id: string, dto: UpsertCrmActivityDto) {
    const tid = this.tenantContext.requireTenantId();
    const activityId = parseBigIntId(id, 'activity id');
    const [existing] = await this.db.client
      .select({ id: crmActivity.id })
      .from(crmActivity)
      .where(and(eq(crmActivity.id, activityId), eq(crmActivity.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Activity not found');

    await this.db.client
      .update(crmActivity)
      .set({
        accountId: dto.account_id ? parseBigIntId(dto.account_id, 'account id') : undefined,
        contactId: dto.contact_id ? parseBigIntId(dto.contact_id, 'contact id') : undefined,
        opportunityId: dto.opportunity_id ? parseBigIntId(dto.opportunity_id, 'opportunity id') : undefined,
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        dueAt: dto.due_at ? new Date(dto.due_at) : undefined,
        doneAt: dto.done_at ? new Date(dto.done_at) : undefined,
      })
      .where(and(eq(crmActivity.id, activityId), eq(crmActivity.tenantId, tid)));
    return this.getActivity(id);
  }

  async deleteActivity(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const activityId = parseBigIntId(id, 'activity id');
    const [deleted] = await this.db.client
      .delete(crmActivity)
      .where(and(eq(crmActivity.id, activityId), eq(crmActivity.tenantId, tid)))
      .returning();
    if (!deleted) throw new NotFoundException('Activity not found');
    return { success: true };
  }
}
