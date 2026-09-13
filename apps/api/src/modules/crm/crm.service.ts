import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { toBigInt } from '$common/utils/ids';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { UpsertCrmAccountDto } from './dto/upsert-account.dto';
import { UpsertCrmActivityDto } from './dto/upsert-activity.dto';
import { UpsertCrmContactDto } from './dto/upsert-contact.dto';
import { UpsertCrmLeadDto } from './dto/upsert-lead.dto';
import { UpsertCrmOpportunityDto } from './dto/upsert-opportunity.dto';
import { ReplaceCrmPipelineStagesDto, UpsertCrmPipelineDto } from './dto/upsert-pipeline.dto';

@Injectable()
export class CrmService {
  constructor(private readonly drizzle: DrizzleService) {}

  private parseId(value: string, label: string): bigint {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

  private toPage(query: Record<string, any>) {
    return {
      page: Math.max(1, Number(query.page ?? 1)),
      perPage: Math.min(100, Math.max(1, Number(query.per_page ?? 20))),
    };
  }

  private async ownerMap(profileIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(profileIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const owners = await this.drizzle.profile.findMany({ where: { id: { in: ids } } });
    return new Map(owners.map((owner) => [owner.id.toString(), owner]));
  }

  private async accountMap(accountIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(accountIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const accounts = await this.drizzle.crmAccount.findMany({ where: { id: { in: ids } } });
    return new Map(accounts.map((account) => [account.id.toString(), account]));
  }

  private async contactMap(contactIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(contactIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const contacts = await this.drizzle.crmContact.findMany({ where: { id: { in: ids } } });
    return new Map(contacts.map((contact) => [contact.id.toString(), contact]));
  }

  async listAccounts(query: Record<string, any>) {
    const { page, perPage } = this.toPage(query);
    const where: Record<string, any> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { industry: { contains: String(query.search), mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = String(query.status);
    if (query.type) where.type = String(query.type);
    if (query.lifecycle_stage) where.lifecycleStage = String(query.lifecycle_stage);
    if (query.owner_profile_id) where.ownerProfileId = this.parseId(query.owner_profile_id, 'owner profile id');

    const [rows, total] = await this.drizzle.$transaction([
      this.drizzle.crmAccount.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.drizzle.crmAccount.count({ where }),
    ]);

    const accountIds = rows.map((row) => row.id);
    const counts = accountIds.length
      ? await this.drizzle.crmContact.groupBy({
          where: { accountId: { in: accountIds } },
          by: ['accountId'],
          _count: true,
        })
      : [];
    const countByAccount = new Map(counts.map((entry) => [entry.accountId.toString(), entry._count?._all ?? 0]));
    const owners = await this.ownerMap(rows.map((row) => row.ownerProfileId));

    const data = rows.map((row) => ({
      ...row,
      contactCount: countByAccount.get(row.id.toString()) ?? 0,
      owner: row.ownerProfileId ? (owners.get(row.ownerProfileId.toString()) ?? null) : null,
    }));

    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  async getAccount(id: string) {
    const accountId = this.parseId(id, 'account id');
    const account = await this.drizzle.crmAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');

    const [contacts, opportunities, owner] = await Promise.all([
      this.drizzle.crmContact.findMany({
        where: { accountId },
        orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
      }),
      this.drizzle.crmOpportunity.findMany({ where: { accountId }, orderBy: { createdAt: 'desc' } }),
      account.ownerProfileId ? this.drizzle.profile.findUnique({ where: { id: account.ownerProfileId } }) : null,
    ]);

    return { ...account, owner, contacts, opportunities };
  }

  async createAccount(dto: UpsertCrmAccountDto) {
    const data = this.accountData(dto);
    const account = await this.drizzle.crmAccount.create({ data });
    return this.getAccount(account.id.toString());
  }

  async updateAccount(id: string, dto: UpsertCrmAccountDto) {
    const accountId = this.parseId(id, 'account id');
    const existing = await this.drizzle.crmAccount.findUnique({ where: { id: accountId } });
    if (!existing) throw new NotFoundException('Account not found');
    await this.drizzle.crmAccount.update({ where: { id: accountId }, data: this.accountData(dto) });
    return this.getAccount(id);
  }

  async deleteAccount(id: string) {
    const accountId = this.parseId(id, 'account id');
    const deleted = await this.drizzle.crmAccount.delete({ where: { id: accountId } });
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
      ownerProfileId: dto.owner_profile_id ? this.parseId(dto.owner_profile_id, 'owner profile id') : undefined,
    };
  }

  async listContacts(query: Record<string, any>) {
    const { page, perPage } = this.toPage(query);
    const where: Record<string, any> = {};
    if (query.search) {
      where.OR = [
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { firstName: { contains: String(query.search), mode: 'insensitive' } },
        { lastName: { contains: String(query.search), mode: 'insensitive' } },
      ];
    }
    if (query.account_id) where.accountId = this.parseId(query.account_id, 'account id');
    if (query.is_primary === 'true' || query.is_primary === true) where.isPrimary = true;

    const [rows, total] = await this.drizzle.$transaction([
      this.drizzle.crmContact.findMany({
        where,
        orderBy: { firstName: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.drizzle.crmContact.count({ where }),
    ]);

    const accounts = await this.accountMap(rows.map((row) => row.accountId));

    const data = rows.map((row) => ({
      ...row,
      account: row.accountId ? (accounts.get(row.accountId.toString()) ?? null) : null,
    }));

    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  async getContact(id: string) {
    const contactId = this.parseId(id, 'contact id');
    const contact = await this.drizzle.crmContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contact not found');
    const account = contact.accountId
      ? await this.drizzle.crmAccount.findUnique({ where: { id: contact.accountId } })
      : null;
    return { ...contact, account };
  }

  async createContact(dto: UpsertCrmContactDto) {
    await this.assertAccountExists(dto.account_id);
    const contact = await this.drizzle.crmContact.create({
      data: {
        accountId: dto.account_id ? this.parseId(dto.account_id, 'account id') : undefined,
        firstName: dto.first_name,
        lastName: dto.last_name,
        email: dto.email ? dto.email.trim().toLowerCase() : undefined,
        phone: dto.phone,
        jobTitle: dto.job_title,
        isPrimary: dto.is_primary,
      },
    });
    return this.getContact(contact.id.toString());
  }

  async updateContact(id: string, dto: UpsertCrmContactDto) {
    const contactId = this.parseId(id, 'contact id');
    const existing = await this.drizzle.crmContact.findUnique({ where: { id: contactId } });
    if (!existing) throw new NotFoundException('Contact not found');
    await this.assertAccountExists(dto.account_id);
    await this.drizzle.crmContact.update({
      where: { id: contactId },
      data: {
        accountId: dto.account_id ? this.parseId(dto.account_id, 'account id') : undefined,
        firstName: dto.first_name,
        lastName: dto.last_name,
        email: dto.email ? dto.email.trim().toLowerCase() : undefined,
        phone: dto.phone,
        jobTitle: dto.job_title,
        isPrimary: dto.is_primary,
      },
    });
    return this.getContact(id);
  }

  async deleteContact(id: string) {
    const contactId = this.parseId(id, 'contact id');
    const deleted = await this.drizzle.crmContact.delete({ where: { id: contactId } });
    if (!deleted) throw new NotFoundException('Contact not found');
    return { success: true };
  }

  private async assertAccountExists(id?: string) {
    if (!id) return;
    const accountId = this.parseId(id, 'account id');
    const account = await this.drizzle.crmAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Account not found');
  }

  async listLeads(query: Record<string, any>) {
    const { page, perPage } = this.toPage(query);
    const where: Record<string, any> = {};
    if (query.search) {
      where.OR = [
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { firstName: { contains: String(query.search), mode: 'insensitive' } },
        { lastName: { contains: String(query.search), mode: 'insensitive' } },
        { company: { contains: String(query.search), mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = String(query.status);
    if (query.source) where.source = String(query.source);
    if (query.owner_profile_id) where.ownerProfileId = this.parseId(query.owner_profile_id, 'owner profile id');

    const [rows, total] = await this.drizzle.$transaction([
      this.drizzle.crmLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.drizzle.crmLead.count({ where }),
    ]);

    const owners = await this.ownerMap(rows.map((row) => row.ownerProfileId));

    const data = rows.map((row) => ({
      ...row,
      owner: row.ownerProfileId ? (owners.get(row.ownerProfileId.toString()) ?? null) : null,
    }));

    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  async getLead(id: string) {
    const leadId = this.parseId(id, 'lead id');
    const lead = await this.drizzle.crmLead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    const owner = lead.ownerProfileId
      ? await this.drizzle.profile.findUnique({ where: { id: lead.ownerProfileId } })
      : null;
    return { ...lead, owner };
  }

  async createLead(dto: UpsertCrmLeadDto) {
    const lead = await this.drizzle.crmLead.create({
      data: this.leadData(dto),
    });
    return this.getLead(lead.id.toString());
  }

  async updateLead(id: string, dto: UpsertCrmLeadDto) {
    const leadId = this.parseId(id, 'lead id');
    const existing = await this.drizzle.crmLead.findUnique({ where: { id: leadId } });
    if (!existing) throw new NotFoundException('Lead not found');
    await this.drizzle.crmLead.update({ where: { id: leadId }, data: this.leadData(dto) });
    return this.getLead(id);
  }

  async deleteLead(id: string) {
    const leadId = this.parseId(id, 'lead id');
    const deleted = await this.drizzle.crmLead.delete({ where: { id: leadId } });
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
      ownerProfileId: dto.owner_profile_id ? this.parseId(dto.owner_profile_id, 'owner profile id') : undefined,
    };
  }

  async convertLead(id: string, dto: ConvertLeadDto) {
    const leadId = this.parseId(id, 'lead id');

    return this.drizzle.$transaction(async (tx) => {
      const lead = await tx.crmLead.findUnique({ where: { id: leadId } });
      if (!lead) throw new NotFoundException('Lead not found');
      if (lead.convertedAccountId || lead.convertedContactId) {
        throw new BadRequestException('Lead has already been converted');
      }

      let accountId = dto.account_id ? this.parseId(dto.account_id, 'account id') : null;
      if (accountId) {
        const account = await tx.crmAccount.findUnique({ where: { id: accountId } });
        if (!account) throw new NotFoundException('Account not found');
      } else {
        const accountName = dto.account_name || lead.company || `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim();
        if (!accountName) throw new BadRequestException('An account name is required to convert the lead');
        const account = await tx.crmAccount.create({
          data: {
            name: accountName,
            industry: dto.industry,
            email: lead.email ?? undefined,
            phone: lead.phone ?? undefined,
            lifecycleStage: 'customer',
            ownerProfileId: lead.ownerProfileId ?? undefined,
          },
        });
        accountId = account.id;
      }

      const contact = await tx.crmContact.create({
        data: {
          accountId,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email ?? undefined,
          phone: lead.phone ?? undefined,
          isPrimary: true,
        },
      });

      await tx.crmLead.update({
        where: { id: leadId },
        data: { convertedAccountId: accountId, convertedContactId: contact.id, status: 'converted' },
      });

      return { success: true, accountId: accountId.toString(), contactId: contact.id.toString() };
    });
  }

  async listPipelines() {
    const pipelines = await this.drizzle.crmPipeline.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    if (!pipelines.length) {
      const seeded = await this.ensureDefaultPipeline();
      const stages = await this.drizzle.crmPipelineStage.findMany({
        where: { pipelineId: seeded.id },
        orderBy: { position: 'asc' },
      });
      return [{ ...seeded, stages }];
    }

    const pipelineIds = pipelines.map((pipeline) => pipeline.id);
    const stages = await this.drizzle.crmPipelineStage.findMany({
      where: { pipelineId: { in: pipelineIds } },
      orderBy: { position: 'asc' },
    });
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
    const pipelineId = id === 'default' ? (await this.ensureDefaultPipeline()).id : this.parseId(id, 'pipeline id');
    const pipeline = await this.drizzle.crmPipeline.findUnique({ where: { id: pipelineId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const [stages, opportunities] = await Promise.all([
      this.drizzle.crmPipelineStage.findMany({ where: { pipelineId }, orderBy: { position: 'asc' } }),
      this.drizzle.crmOpportunity.findMany({ where: { pipelineId }, orderBy: { createdAt: 'desc' } }),
    ]);

    return { ...pipeline, stages, opportunities };
  }

  async createPipeline(dto: UpsertCrmPipelineDto) {
    const isDefault = dto.is_default === true;
    if (isDefault) {
      await this.drizzle.crmPipeline.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const pipeline = await this.drizzle.crmPipeline.create({
      data: {
        name: dto.name,
        description: dto.description,
        isDefault,
      },
    });

    if (dto.stages?.length) {
      await this.drizzle.crmPipelineStage.createMany({
        data: dto.stages.map((stage, index) => ({
          pipelineId: pipeline.id,
          name: stage.name,
          position: stage.position ?? index,
          probability: stage.probability ?? 0,
          color: stage.color,
          isWon: stage.is_won ?? false,
          isLost: stage.is_lost ?? false,
        })),
      });
    }

    return this.getPipeline(pipeline.id.toString());
  }

  async updatePipeline(id: string, dto: UpsertCrmPipelineDto) {
    const pipelineId = this.parseId(id, 'pipeline id');
    const existing = await this.drizzle.crmPipeline.findUnique({ where: { id: pipelineId } });
    if (!existing) throw new NotFoundException('Pipeline not found');

    if (dto.is_default === true) {
      await this.drizzle.crmPipeline.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    await this.drizzle.crmPipeline.update({
      where: { id: pipelineId },
      data: {
        name: dto.name,
        description: dto.description,
        isDefault: dto.is_default,
      },
    });

    return this.getPipeline(id);
  }

  async replacePipelineStages(id: string, dto: ReplaceCrmPipelineStagesDto) {
    const pipelineId = this.parseId(id, 'pipeline id');
    const existing = await this.drizzle.crmPipeline.findUnique({ where: { id: pipelineId } });
    if (!existing) throw new NotFoundException('Pipeline not found');

    await this.drizzle.$transaction(async (tx) => {
      await tx.crmPipelineStage.deleteMany({ where: { pipelineId } });
      await tx.crmPipelineStage.createMany({
        data: dto.stages.map((stage, index) => ({
          pipelineId,
          name: stage.name,
          position: stage.position ?? index,
          probability: stage.probability ?? 0,
          color: stage.color,
          isWon: stage.is_won ?? false,
          isLost: stage.is_lost ?? false,
        })),
      });
    });

    return this.getPipeline(id);
  }

  async deletePipeline(id: string) {
    const pipelineId = this.parseId(id, 'pipeline id');
    const deleted = await this.drizzle.crmPipeline.delete({ where: { id: pipelineId } });
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
    const existing = await this.drizzle.crmPipeline.findFirst({ where: { isDefault: true } });
    if (existing) return existing;
    const first = await this.drizzle.crmPipeline.findFirst();
    if (first) return first;

    return this.drizzle.$transaction(async (tx) => {
      const pipeline = await tx.crmPipeline.create({
        data: { name: 'Default Pipeline', description: 'Pipeline seeded by facity CRM', isDefault: true },
      });
      await tx.crmPipelineStage.createMany({
        data: (await this.defaultStages()).map((stage) => ({ pipelineId: pipeline.id, ...stage })),
      });
      return pipeline;
    });
  }

  async listOpportunities(query: Record<string, any>) {
    const { page, perPage } = this.toPage(query);
    const where: Record<string, any> = {};
    if (query.search) where.name = { contains: String(query.search), mode: 'insensitive' };
    if (query.account_id) where.accountId = this.parseId(query.account_id, 'account id');
    if (query.stage_id) where.stageId = this.parseId(query.stage_id, 'stage id');
    if (query.pipeline_id) where.pipelineId = this.parseId(query.pipeline_id, 'pipeline id');
    if (query.status) where.status = String(query.status);
    if (query.owner_profile_id) where.ownerProfileId = this.parseId(query.owner_profile_id, 'owner profile id');

    const [rows, total] = await this.drizzle.$transaction([
      this.drizzle.crmOpportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.drizzle.crmOpportunity.count({ where }),
    ]);

    const data = await this.enrichOpportunities(rows);
    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  private async enrichOpportunities(rows: any[]) {
    const accounts = await this.accountMap(rows.map((row) => row.accountId));
    const contacts = await this.contactMap(rows.map((row) => row.contactId));
    const owners = await this.ownerMap(rows.map((row) => row.ownerProfileId));
    const stageIds = rows.map((row) => row.stageId).filter((id): id is bigint => id != null);
    const stages = stageIds.length
      ? await this.drizzle.crmPipelineStage.findMany({ where: { id: { in: stageIds } } })
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
    const opportunityId = this.parseId(id, 'opportunity id');
    const opportunity = await this.drizzle.crmOpportunity.findUnique({ where: { id: opportunityId } });
    if (!opportunity) throw new NotFoundException('Opportunity not found');

    const activities = await this.drizzle.crmActivity.findMany({
      where: { opportunityId },
      orderBy: { createdAt: 'desc' },
    });

    const data = await this.enrichOpportunities([opportunity]);
    return { ...data[0], activities };
  }

  async createOpportunity(dto: UpsertCrmOpportunityDto) {
    const data = await this.opportunityData(dto);
    const opportunity = await this.drizzle.crmOpportunity.create({ data });
    return this.getOpportunity(opportunity.id.toString());
  }

  async updateOpportunity(id: string, dto: UpsertCrmOpportunityDto) {
    const opportunityId = this.parseId(id, 'opportunity id');
    const existing = await this.drizzle.crmOpportunity.findUnique({ where: { id: opportunityId } });
    if (!existing) throw new NotFoundException('Opportunity not found');
    const data = await this.opportunityData(dto);
    await this.drizzle.crmOpportunity.update({ where: { id: opportunityId }, data });
    return this.getOpportunity(id);
  }

  async deleteOpportunity(id: string) {
    const opportunityId = this.parseId(id, 'opportunity id');
    const deleted = await this.drizzle.crmOpportunity.delete({ where: { id: opportunityId } });
    if (!deleted) throw new NotFoundException('Opportunity not found');
    return { success: true };
  }

  private async opportunityData(dto: UpsertCrmOpportunityDto) {
    if (dto.account_id) await this.assertAccountExists(dto.account_id);

    let pipelineId = dto.pipeline_id ? this.parseId(dto.pipeline_id, 'pipeline id') : undefined;
    let stageId = dto.stage_id ? this.parseId(dto.stage_id, 'stage id') : undefined;

    if (stageId) {
      const stage = await this.drizzle.crmPipelineStage.findUnique({ where: { id: stageId } });
      if (!stage) throw new NotFoundException('Stage not found');
      if (pipelineId && stage.pipelineId !== pipelineId) {
        throw new BadRequestException('Stage does not belong to the given pipeline');
      }
      pipelineId = stage.pipelineId;
    }

    if (!stageId) {
      const pipeline = pipelineId
        ? await this.drizzle.crmPipeline.findUnique({ where: { id: pipelineId } })
        : await this.ensureDefaultPipeline();
      if (!pipeline) throw new NotFoundException('Pipeline not found');
      const firstStage = await this.drizzle.crmPipelineStage.findFirst({
        where: { pipelineId: pipeline.id, isActive: true },
        orderBy: { position: 'asc' },
      });
      if (firstStage) {
        stageId = firstStage.id;
        pipelineId = pipeline.id;
      }
    }

    return {
      name: dto.name,
      accountId: dto.account_id ? this.parseId(dto.account_id, 'account id') : undefined,
      contactId: dto.contact_id ? this.parseId(dto.contact_id, 'contact id') : undefined,
      pipelineId,
      stageId,
      ownerProfileId: dto.owner_profile_id ? this.parseId(dto.owner_profile_id, 'owner profile id') : undefined,
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
    const where: Record<string, any> = {};
    if (query.account_id) where.accountId = this.parseId(query.account_id, 'account id');
    if (query.contact_id) where.contactId = this.parseId(query.contact_id, 'contact id');
    if (query.opportunity_id) where.opportunityId = this.parseId(query.opportunity_id, 'opportunity id');
    if (query.type) where.type = String(query.type);
    if (query.done === 'false') where.doneAt = null;
    if (query.done === 'true') where.doneAt = { not: null };

    const [rows, total] = await this.drizzle.$transaction([
      this.drizzle.crmActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.drizzle.crmActivity.count({ where }),
    ]);

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
    const opportunities = await this.drizzle.crmOpportunity.findMany({ where: { id: { in: ids } } });
    return new Map(opportunities.map((opportunity) => [opportunity.id.toString(), opportunity]));
  }

  async getActivity(id: string) {
    const activityId = this.parseId(id, 'activity id');
    const activity = await this.drizzle.crmActivity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');
    return (await this.enrichActivities([activity]))[0];
  }

  async createActivity(dto: UpsertCrmActivityDto, userId?: bigint) {
    if (dto.account_id) await this.assertAccountExists(dto.account_id);
    if (dto.contact_id) {
      const contact = await this.drizzle.crmContact.findUnique({ where: { id: this.parseId(dto.contact_id, 'contact id') } });
      if (!contact) throw new NotFoundException('Contact not found');
    }
    if (dto.opportunity_id) {
      const opportunity = await this.drizzle.crmOpportunity.findUnique({ where: { id: this.parseId(dto.opportunity_id, 'opportunity id') } });
      if (!opportunity) throw new NotFoundException('Opportunity not found');
    }

    const activity = await this.drizzle.crmActivity.create({
      data: {
        accountId: dto.account_id ? this.parseId(dto.account_id, 'account id') : undefined,
        contactId: dto.contact_id ? this.parseId(dto.contact_id, 'contact id') : undefined,
        opportunityId: dto.opportunity_id ? this.parseId(dto.opportunity_id, 'opportunity id') : undefined,
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        dueAt: dto.due_at ? new Date(dto.due_at) : undefined,
        doneAt: dto.done_at ? new Date(dto.done_at) : undefined,
        createdBy: userId,
      },
    });
    return this.getActivity(activity.id.toString());
  }

  async updateActivity(id: string, dto: UpsertCrmActivityDto) {
    const activityId = this.parseId(id, 'activity id');
    const existing = await this.drizzle.crmActivity.findUnique({ where: { id: activityId } });
    if (!existing) throw new NotFoundException('Activity not found');

    await this.drizzle.crmActivity.update({
      where: { id: activityId },
      data: {
        accountId: dto.account_id ? this.parseId(dto.account_id, 'account id') : undefined,
        contactId: dto.contact_id ? this.parseId(dto.contact_id, 'contact id') : undefined,
        opportunityId: dto.opportunity_id ? this.parseId(dto.opportunity_id, 'opportunity id') : undefined,
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        dueAt: dto.due_at ? new Date(dto.due_at) : undefined,
        doneAt: dto.done_at ? new Date(dto.done_at) : undefined,
      },
    });
    return this.getActivity(id);
  }

  async deleteActivity(id: string) {
    const activityId = this.parseId(id, 'activity id');
    const deleted = await this.drizzle.crmActivity.delete({ where: { id: activityId } });
    if (!deleted) throw new NotFoundException('Activity not found');
    return { success: true };
  }
}