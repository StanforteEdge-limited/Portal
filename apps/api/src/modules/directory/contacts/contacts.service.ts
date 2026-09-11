import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { toBigInt } from '$common/utils/ids';
import { CreateContactDto } from '$modules/directory/contacts/dto/create-contact.dto';
import { UpdateContactDto } from '$modules/directory/contacts/dto/update-contact.dto';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { Drizzle } from '$common/db/drizzle-compat';

@Injectable()
export class ContactsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const where: Drizzle.ProfileWhereInput = { type: 'contact' };
    if (query.search) {
      where.OR = [
        { username: { contains: String(query.search), mode: 'insensitive' } },
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { firstName: { contains: String(query.search), mode: 'insensitive' } },
        { lastName: { contains: String(query.search), mode: 'insensitive' } }
      ];
    }
    if (query.status) where.status = String(query.status);

    const [data, total] = await this.tenantContext.runSystem('contacts.list', () =>
      this.drizzle.$transaction([
        this.drizzle.profile.findMany({
          where,
          include: {
            organizations: {
              include: { organization: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * perPage,
          take: perPage
        }),
        this.drizzle.profile.count({ where })
      ])
    );

    return paginatedResponse(data, { page, per_page: perPage, total });
  }

  async get(id: string) {
    const profile = await this.tenantContext.runSystem('contacts.get', () =>
      this.drizzle.profile.findUnique({
        where: { id: this.parseId(id, 'contact id') },
        include: {
          organizations: {
            include: { organization: true }
          }
        }
      })
    );
    if (!profile || profile.type !== 'contact') throw new NotFoundException('Contact not found');
    return profile;
  }

  async create(dto: CreateContactDto) {
    const email = dto.email.trim().toLowerCase();

    const [emailExists, usernameExists] = await this.tenantContext.runSystem('contacts.create.check', () =>
      this.drizzle.$transaction([
        this.drizzle.profile.findUnique({ where: { email } }),
        this.drizzle.profile.findUnique({ where: { username: dto.username } })
      ])
    );

    if (emailExists) throw new BadRequestException('Email already exists');
    if (usernameExists) throw new BadRequestException('Username already exists');

    const contact = await this.drizzle.profile.create({
      data: {
        username: dto.username,
        email,
        type: 'contact',
        status: 'active',
        firstName: dto.first_name,
        lastName: dto.last_name,
        phone: dto.phone
      }
    });

    if (dto.organization_id) {
      const organizationId = this.parseId(dto.organization_id, 'organization id');
      const org = await this.drizzle.organization.findUnique({ where: { id: organizationId } });
      if (!org) throw new NotFoundException('Organization not found');

      await this.drizzle.profileOrganization.create({
        data: {
          profileId: contact.id,
          organizationId,
          isPrimary: true,
          createdAt: new Date()
        }
      });

      await this.tenantContext.runSystem('contacts.create.primaryOrg', () =>
        this.drizzle.profile.update({
          where: { id: contact.id },
          data: { primaryOrganizationId: organizationId }
        })
      );
    }

    return this.get(contact.id.toString());
  }

  async update(id: string, dto: UpdateContactDto) {
    const profileId = this.parseId(id, 'contact id');
    const existing = await this.tenantContext.runSystem('contacts.update.get', () =>
      this.drizzle.profile.findUnique({ where: { id: profileId } })
    );
    if (!existing || existing.type !== 'contact') throw new NotFoundException('Contact not found');

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const emailExists = await this.tenantContext.runSystem('contacts.update.email', () =>
          this.drizzle.profile.findUnique({ where: { email } })
        );
        if (emailExists) throw new BadRequestException('Email already exists');
      }
    }

    if (dto.username && dto.username !== existing.username) {
      const usernameExists = await this.tenantContext.runSystem('contacts.update.username', () =>
        this.drizzle.profile.findUnique({ where: { username: dto.username } })
      );
      if (usernameExists) throw new BadRequestException('Username already exists');
    }

    await this.tenantContext.runSystem('contacts.update.apply', () =>
      this.drizzle.profile.update({
        where: { id: profileId },
        data: {
          username: dto.username ?? existing.username,
          email: dto.email ? dto.email.trim().toLowerCase() : existing.email,
          firstName: dto.first_name ?? existing.firstName,
          lastName: dto.last_name ?? existing.lastName,
          phone: dto.phone ?? existing.phone,
          status: dto.status ?? existing.status
        }
      })
    );

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
