import { Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { DbService } from '$common/db/db.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId } from '$common/utils/ids';
import { profile } from '$modules/identity/users/model';
import { crmContact } from '../contacts/model';
import { crmOpportunity } from '../opportunities/model';
import { UpsertCrmAccountDto } from './dto/upsert-account.dto';
import { crmAccount } from './model';

@Injectable()
export class CrmAccountsService {
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
}
