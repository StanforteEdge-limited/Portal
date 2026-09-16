import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { DbService } from '$common/db/db.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId } from '$common/utils/ids';
import { profile } from '$modules/identity/users/model';
import { crmAccount } from '../accounts/model';
import { crmContact } from '../contacts/model';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { UpsertCrmLeadDto } from './dto/upsert-lead.dto';
import { crmLead } from './model';

@Injectable()
export class CrmLeadsService {
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
}
