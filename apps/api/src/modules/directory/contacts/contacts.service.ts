import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Drizzle } from '$common/db/drizzle-compat';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { toBigInt } from '$common/utils/ids';
import { CreateContactDto } from '$modules/directory/contacts/dto/create-contact.dto';
import { UpdateContactDto } from '$modules/directory/contacts/dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async list(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const where: Drizzle.ContactWhereInput = {};
    if (query.search) {
      where.OR = [
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { firstName: { contains: String(query.search), mode: 'insensitive' } },
        { lastName: { contains: String(query.search), mode: 'insensitive' } }
      ];
    }
    if (query.status) where.status = String(query.status);
    if (query.organization_id) where.organizationId = this.parseId(query.organization_id, 'organization id');

    const [data, total] = await this.drizzle.$transaction([
      this.drizzle.contact.findMany({
        where,
        include: { organization: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.drizzle.contact.count({ where })
    ]);

    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  async get(id: string) {
    const contact = await this.drizzle.contact.findUnique({
      where: { id: this.parseId(id, 'contact id') },
      include: { organization: true }
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(dto: CreateContactDto) {
    const email = dto.email.trim().toLowerCase();

    const emailExists = await this.drizzle.contact.findUnique({ where: { email } });
    if (emailExists) throw new BadRequestException('Email already exists');

    const organizationId = dto.organization_id ? this.parseId(dto.organization_id, 'organization id') : null;
    if (organizationId) {
      const org = await this.drizzle.organization.findUnique({ where: { id: organizationId } });
      if (!org) throw new NotFoundException('Organization not found');
    }

    const contact = await this.drizzle.contact.create({
      data: {
        email,
        firstName: dto.first_name,
        lastName: dto.last_name,
        phone: dto.phone,
        status: 'active',
        organizationId
      }
    });

    return this.get(contact.id.toString());
  }

  async update(id: string, dto: UpdateContactDto) {
    const contactId = this.parseId(id, 'contact id');
    const existing = await this.drizzle.contact.findUnique({ where: { id: contactId } });
    if (!existing) throw new NotFoundException('Contact not found');

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const emailExists = await this.drizzle.contact.findUnique({ where: { email } });
        if (emailExists) throw new BadRequestException('Email already exists');
      }
    }

    await this.drizzle.contact.update({
      where: { id: contactId },
      data: {
        email: dto.email ? dto.email.trim().toLowerCase() : existing.email,
        firstName: dto.first_name ?? existing.firstName,
        lastName: dto.last_name ?? existing.lastName,
        phone: dto.phone ?? existing.phone,
        status: dto.status ?? existing.status
      }
    });

    return this.get(id);
  }

  private parseId(value: string, label: string): bigint {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}