import { Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, count, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { DbService } from '$common/db/db.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId } from '$common/utils/ids';
import { crmAccount } from '../accounts/model';
import { crmContact } from '../contacts/model';
import { crmOpportunity } from '../opportunities/model';
import { UpsertCrmActivityDto } from './dto/upsert-activity.dto';
import { crmActivity } from './model';

@Injectable()
export class CrmActivitiesService {
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
