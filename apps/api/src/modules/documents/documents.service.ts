import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { AcknowledgeDocumentDto } from './dto/acknowledge-document.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { paginatedResponse } from '../../common/helpers/paginated-response';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(profileId: string, query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const where: Prisma.DocumentWhereInput = {};

    if (query.search) {
      const value = String(query.search).trim();
      if (value) {
        where.OR = [
          { title: { contains: value, mode: 'insensitive' } },
          { slug: { contains: value, mode: 'insensitive' } }
        ];
      }
    }
    if (query.status) where.status = String(query.status).toLowerCase();
    if (query.category) where.category = String(query.category).toLowerCase();
    if (query.organization_id) where.organizationId = toBigInt(String(query.organization_id));
    if (query.require_acknowledgement === 'true' || query.require_acknowledgement === 'false') {
      where.requireAcknowledgement = query.require_acknowledgement === 'true';
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        include: {
          file: true,
          organization: true,
          acknowledgements: {
            where: { userId: toBigInt(profileId) },
            orderBy: { acknowledgedAt: 'desc' },
            take: 1
          }
        },
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.prisma.document.count({ where })
    ]);

    return paginatedResponse(data.map((row) => this.serialize(row)), { page, per_page: perPage, total });
  }

  async get(profileId: string, id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: {
        file: true,
        organization: true,
        acknowledgements: {
          where: { userId: toBigInt(profileId) },
          orderBy: { acknowledgedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!document) throw new NotFoundException('Document not found');
    return this.serialize(document);
  }

  async create(dto: CreateDocumentDto, actorId?: string) {
    if (!dto.content_html && !dto.file_id && !dto.link_url) {
      throw new BadRequestException('Either content_html, file_id, or link_url is required');
    }

    const slug = dto.slug?.trim() || this.slugify(dto.title);
    const existing = await this.prisma.document.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('Slug already exists');

    if (dto.file_id) {
      const file = await this.prisma.fileAsset.findUnique({ where: { id: dto.file_id }, select: { id: true } });
      if (!file) throw new NotFoundException('File not found');
    }

    const row = await this.prisma.document.create({
      data: {
        title: dto.title.trim(),
        slug,
        category: (dto.category ?? 'policy').toLowerCase(),
        status: (dto.status ?? 'draft').toLowerCase(),
        version: dto.version ?? '1.0',
        effectiveDate: dto.effective_date ? new Date(dto.effective_date) : null,
        contentHtml: dto.content_html ?? null,
        fileId: dto.file_id ?? null,
        linkUrl: dto.link_url ?? null,
        requireAcknowledgement: Boolean(dto.require_acknowledgement),
        organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
        createdBy: actorId ? toBigInt(actorId) : null,
        updatedBy: actorId ? toBigInt(actorId) : null
      },
      include: { file: true, organization: true }
    });

    return this.serialize(row);
  }

  async update(id: string, dto: UpdateDocumentDto, actorId?: string) {
    const existing = await this.prisma.document.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Document not found');

    if (dto.slug && dto.slug !== existing.slug) {
      const slugCheck = await this.prisma.document.findUnique({ where: { slug: dto.slug } });
      if (slugCheck && slugCheck.id !== id) throw new BadRequestException('Slug already exists');
    }

    if (dto.file_id) {
      const file = await this.prisma.fileAsset.findUnique({ where: { id: dto.file_id }, select: { id: true } });
      if (!file) throw new NotFoundException('File not found');
    }

    const row = await this.prisma.document.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        slug: dto.slug,
        category: dto.category?.toLowerCase(),
        status: dto.status?.toLowerCase(),
        version: dto.version,
        effectiveDate: dto.effective_date ? new Date(dto.effective_date) : undefined,
        contentHtml: dto.content_html,
        fileId: dto.file_id,
        linkUrl: dto.link_url,
        requireAcknowledgement: dto.require_acknowledgement,
        organizationId: dto.organization_id ? toBigInt(dto.organization_id) : undefined,
        updatedBy: actorId ? toBigInt(actorId) : undefined
      },
      include: { file: true, organization: true }
    });

    return this.serialize(row);
  }

  async acknowledge(id: string, profileId: string, req: any, dto: AcknowledgeDocumentDto) {
    const userId = toBigInt(profileId);
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');

    const version = dto.version ?? document.version;
    const ip = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req?.ip ?? null;
    const ua = (req?.headers?.['user-agent'] as string) ?? null;

    const row = await this.prisma.documentAcknowledgement.upsert({
      where: {
        unique_document_ack: {
          documentId: id,
          userId,
          version
        }
      },
      update: {
        acknowledgedAt: new Date(),
        ipAddress: ip,
        userAgent: ua
      },
      create: {
        documentId: id,
        userId,
        version,
        acknowledgedAt: new Date(),
        ipAddress: ip,
        userAgent: ua
      }
    });

    return {
      id: row.id,
      document_id: row.documentId,
      user_id: row.userId.toString(),
      version: row.version,
      acknowledged_at: row.acknowledgedAt,
      ip_address: row.ipAddress,
      user_agent: row.userAgent
    };
  }

  async listAcknowledgements(id: string, query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const where: Prisma.DocumentAcknowledgementWhereInput = { documentId: id };
    if (query.version) where.version = String(query.version);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.documentAcknowledgement.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { acknowledgedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.prisma.documentAcknowledgement.count({ where })
    ]);

    return paginatedResponse(rows.map((row) => ({
      id: row.id,
      user_id: row.userId.toString(),
      user: {
        id: row.user.id.toString(),
        email: row.user.email,
        username: row.user.username,
        first_name: row.user.firstName,
        last_name: row.user.lastName
      },
      version: row.version,
      acknowledged_at: row.acknowledgedAt,
      ip_address: row.ipAddress,
      user_agent: row.userAgent
    })), { page, per_page: perPage, total });
  }

  private serialize(row: any) {
    const myAck = row.acknowledgements?.[0] ?? null;
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      category: row.category,
      status: row.status,
      version: row.version,
      effective_date: row.effectiveDate,
      content_html: row.contentHtml,
      link_url: row.linkUrl,
      file: row.file
        ? {
            id: row.file.id,
            file_name: row.file.fileName,
            public_url: row.file.publicUrl,
            storage_path: row.file.storagePath,
            mime_type: row.file.mimeType
          }
        : null,
      require_acknowledgement: row.requireAcknowledgement,
      organization: row.organization
        ? {
            id: row.organization.id.toString(),
            name: row.organization.name,
            code: row.organization.code
          }
        : null,
      my_acknowledgement: myAck
        ? {
            id: myAck.id,
            version: myAck.version,
            acknowledged_at: myAck.acknowledgedAt
          }
        : null,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 180);
  }
}
