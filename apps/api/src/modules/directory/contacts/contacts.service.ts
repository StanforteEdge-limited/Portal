import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { parseBigIntId } from '$common/utils/ids';
import { CreateContactDto } from '$modules/directory/contacts/dto/create-contact.dto';
import { UpdateContactDto } from '$modules/directory/contacts/dto/update-contact.dto';
import { contact } from './model';
import { organization } from '$modules/directory/organizations/model';

@Injectable()
export class ContactsService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const conditions = this.contactConditions();
    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(contact.email, search), ilike(contact.firstName, search), ilike(contact.lastName, search)) as SQL);
    }
    if (query.status) conditions.push(eq(contact.status, String(query.status)));
    if (query.organization_id) conditions.push(eq(contact.organizationId, parseBigIntId(query.organization_id, 'organization id')));
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db.client
        .select({ row: contact, organization })
        .from(contact)
        .leftJoin(organization, eq(contact.organizationId, organization.id))
        .where(where)
        .orderBy(desc(contact.createdAt))
        .offset((page - 1) * perPage)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(contact).where(where),
    ]);

    const data = rows.map(({ row, organization: org }) => ({ ...row, organization: org }));
    return paginatedResponse(data, { page, per_page: perPage, total: Number(totalRows[0]?.value ?? 0) });
  }

  async get(id: string) {
    const row = await this.findContactWithOrganization(parseBigIntId(id, 'contact id'));
    if (!row) throw new NotFoundException('Contact not found');
    return row;
  }

  async create(dto: CreateContactDto) {
    const email = dto.email.trim().toLowerCase();

    const emailExists = await this.findContactByEmail(email);
    if (emailExists) throw new BadRequestException('Email already exists');

    const organizationId = dto.organization_id ? parseBigIntId(dto.organization_id, 'organization id') : null;
    if (organizationId) {
      const org = await this.findOrganization(organizationId);
      if (!org) throw new NotFoundException('Organization not found');
    }

    const tenantId = this.tenantContext.currentTenantId();
    if (!tenantId) throw new BadRequestException('Tenant context is required to create a contact');

    const [created] = await this.db.client
      .insert(contact)
      .values({
        tenantId,
        email,
        firstName: dto.first_name,
        lastName: dto.last_name,
        phone: dto.phone,
        status: 'active',
        organizationId
      })
      .returning();

    return this.get(created.id.toString());
  }

  async update(id: string, dto: UpdateContactDto) {
    const contactId = parseBigIntId(id, 'contact id');
    const existing = await this.findContact(contactId);
    if (!existing) throw new NotFoundException('Contact not found');

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const emailExists = await this.findContactByEmail(email);
        if (emailExists) throw new BadRequestException('Email already exists');
      }
    }

    await this.db.client
      .update(contact)
      .set({
        email: dto.email ? dto.email.trim().toLowerCase() : existing.email,
        firstName: dto.first_name ?? existing.firstName,
        lastName: dto.last_name ?? existing.lastName,
        phone: dto.phone ?? existing.phone,
        status: dto.status ?? existing.status
      })
      .where(and(eq(contact.id, contactId), ...this.contactConditions()));

    return this.get(id);
  }

  private contactConditions(): SQL[] {
    const tenantId = this.tenantContext.currentTenantId();
    return tenantId ? [eq(contact.tenantId, tenantId)] : [];
  }

  private async findContact(id: bigint) {
    const [row] = await this.db.client
      .select()
      .from(contact)
      .where(and(eq(contact.id, id), ...this.contactConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findContactByEmail(email: string) {
    const [row] = await this.db.client
      .select()
      .from(contact)
      .where(and(eq(contact.email, email), ...this.contactConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findContactWithOrganization(id: bigint) {
    const [row] = await this.db.client
      .select({ row: contact, organization })
      .from(contact)
      .leftJoin(organization, eq(contact.organizationId, organization.id))
      .where(and(eq(contact.id, id), ...this.contactConditions()))
      .limit(1);
    return row ? { ...row.row, organization: row.organization } : null;
  }

  private async findOrganization(id: bigint) {
    const [row] = await this.db.client
      .select()
      .from(organization)
      .where(eq(organization.id, id))
      .limit(1);
    return row ?? null;
  }
}
