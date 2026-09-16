import { Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { DbService } from '$common/db/db.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId } from '$common/utils/ids';
import { crmAccount } from '../accounts/model';
import { UpsertCrmContactDto } from './dto/upsert-contact.dto';
import { crmContact } from './model';

@Injectable()
export class CrmContactsService {
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

  private async accountMap(accountIds: Array<bigint | null | undefined>) {
    const ids = Array.from(new Set(accountIds.filter((id): id is bigint => id != null)));
    if (!ids.length) return new Map<string, any>();
    const tid = this.tenantContext.requireTenantId();
    const accounts = await this.db.client.select().from(crmAccount).where(and(inArray(crmAccount.id, ids), eq(crmAccount.tenantId, tid)));
    return new Map(accounts.map((account) => [account.id.toString(), account]));
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
}
