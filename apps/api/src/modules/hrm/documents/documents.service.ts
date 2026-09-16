import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { toBigInt } from '$common/utils/ids';
import { AcknowledgeDocumentDto } from '$modules/hrm/documents/dto/acknowledge-document.dto';
import { CreateDocumentDto } from '$modules/hrm/documents/dto/create-document.dto';
import { UpdateDocumentDto } from '$modules/hrm/documents/dto/update-document.dto';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { document, documentAcknowledgement } from './model';
import { fileAsset } from '$modules/storage/model';
import { organization } from '$modules/hrm/organizations/model';
import { profile } from '$modules/identity/users/model';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list(profileId: string, query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const conditions = this.documentConditions();

    if (query.search) {
      const value = String(query.search).trim();
      if (value) {
        const search = `%${value}%`;
        conditions.push(or(ilike(document.title, search), ilike(document.slug, search)) as SQL);
      }
    }
    if (query.status) conditions.push(eq(document.status, String(query.status).toLowerCase()));
    if (query.category) conditions.push(eq(document.category, String(query.category).toLowerCase()));
    if (query.organization_id) conditions.push(eq(document.organizationId, toBigInt(String(query.organization_id))));
    if (query.require_acknowledgement === 'true' || query.require_acknowledgement === 'false') {
      conditions.push(eq(document.requireAcknowledgement, query.require_acknowledgement === 'true'));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db.client
        .select({ row: document, file: fileAsset, organization })
        .from(document)
        .leftJoin(fileAsset, eq(document.fileId, fileAsset.id))
        .leftJoin(organization, eq(document.organizationId, organization.id))
        .where(where)
        .orderBy(desc(document.effectiveDate), desc(document.createdAt))
        .offset((page - 1) * perPage)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(document).where(where),
    ]);

    const data = await Promise.all(
      rows.map(({ row, file, organization: org }) =>
        this.withAcknowledgement({ ...row, file, organization: org }, toBigInt(profileId)),
      ),
    );

    return paginatedResponse(data.map((row) => this.serialize(row)), {
      page,
      per_page: perPage,
      total: Number(totalRows[0]?.value ?? 0),
    });
  }

  async get(profileId: string, id: string) {
    const row = await this.findDocumentWithDetails(id);

    if (!row) throw new NotFoundException('Document not found');
    return this.serialize(await this.withAcknowledgement(row, toBigInt(profileId)));
  }

  async create(dto: CreateDocumentDto, actorId?: string) {
    if (!dto.content_html && !dto.file_id && !dto.link_url) {
      throw new BadRequestException('Either content_html, file_id, or link_url is required');
    }

    const slug = dto.slug?.trim() || this.slugify(dto.title);
    const existing = await this.findDocumentBySlug(slug);
    if (existing) throw new BadRequestException('Slug already exists');

    if (dto.file_id) {
      const file = await this.findFile(dto.file_id);
      if (!file) throw new NotFoundException('File not found');
    }

    const tenantId = this.tenantContext.currentTenantId();
    if (!tenantId) throw new BadRequestException('Tenant context is required to create a document');

    const [created] = await this.db.client
      .insert(document)
      .values({
        tenantId,
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
      })
      .returning();

    return this.serialize(await this.findDocumentWithDetails(created.id));
  }

  async update(id: string, dto: UpdateDocumentDto, actorId?: string) {
    const existing = await this.findDocument(id);
    if (!existing) throw new NotFoundException('Document not found');

    if (dto.slug && dto.slug !== existing.slug) {
      const slugCheck = await this.findDocumentBySlug(dto.slug);
      if (slugCheck && slugCheck.id !== id) throw new BadRequestException('Slug already exists');
    }

    if (dto.file_id) {
      const file = await this.findFile(dto.file_id);
      if (!file) throw new NotFoundException('File not found');
    }

    const data = this.cleanUpdate({
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
    });
    await this.db.client
      .update(document)
      .set(data)
      .where(and(eq(document.id, id), ...this.documentConditions()));

    return this.serialize(await this.findDocumentWithDetails(id));
  }

  async acknowledge(id: string, profileId: string, req: any, dto: AcknowledgeDocumentDto) {
    const userId = toBigInt(profileId);
    const existing = await this.findDocument(id);
    if (!existing) throw new NotFoundException('Document not found');

    const version = dto.version ?? existing.version;
    const ip = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req?.ip ?? null;
    const ua = (req?.headers?.['user-agent'] as string) ?? null;

    const [row] = await this.db.client
      .insert(documentAcknowledgement)
      .values({
        documentId: id,
        userId,
        version,
        acknowledgedAt: new Date(),
        ipAddress: ip,
        userAgent: ua,
      })
      .onConflictDoUpdate({
        target: [documentAcknowledgement.documentId, documentAcknowledgement.userId, documentAcknowledgement.version],
        set: {
          acknowledgedAt: new Date(),
          ipAddress: ip,
          userAgent: ua,
        },
      })
      .returning();

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
    const existing = await this.findDocument(id);
    if (!existing) throw new NotFoundException('Document not found');

    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const conditions = [eq(documentAcknowledgement.documentId, id)];
    if (query.version) conditions.push(eq(documentAcknowledgement.version, String(query.version)));
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db.client
        .select({
          row: documentAcknowledgement,
          user: {
            id: profile.id,
            email: profile.email,
            username: profile.username,
            firstName: profile.firstName,
            lastName: profile.lastName,
          },
        })
        .from(documentAcknowledgement)
        .leftJoin(profile, eq(documentAcknowledgement.userId, profile.id))
        .where(where)
        .orderBy(desc(documentAcknowledgement.acknowledgedAt))
        .offset((page - 1) * perPage)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(documentAcknowledgement).where(where),
    ]);

    return paginatedResponse(rows.map(({ row, user }) => ({
      id: row.id,
      user_id: row.userId.toString(),
      user: {
        id: user?.id.toString(),
        email: user?.email,
        username: user?.username,
        first_name: user?.firstName,
        last_name: user?.lastName
      },
      version: row.version,
      acknowledged_at: row.acknowledgedAt,
      ip_address: row.ipAddress,
      user_agent: row.userAgent
    })), { page, per_page: perPage, total: Number(totalRows[0]?.value ?? 0) });
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

private documentConditions(): SQL[] {
    const tenantId = this.tenantContext.currentTenantId();
    return tenantId ? [eq(document.tenantId, tenantId)] : [];
  }

  private cleanUpdate<T extends Record<string, unknown>>(data: T): Partial<T> {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;
  }

  private async findDocument(id: string) {
    const [row] = await this.db.client
      .select()
      .from(document)
      .where(and(eq(document.id, id), ...this.documentConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findDocumentBySlug(slug: string) {
    const [row] = await this.db.client
      .select()
      .from(document)
      .where(and(eq(document.slug, slug), ...this.documentConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findFile(id: string) {
    const conditions = [eq(fileAsset.id, id)];
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) conditions.push(eq(fileAsset.tenantId, tenantId));
    const [row] = await this.db.client
      .select({ id: fileAsset.id })
      .from(fileAsset)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  }

  private async findDocumentWithDetails(id: string) {
    const [row] = await this.db.client
      .select({ row: document, file: fileAsset, organization })
      .from(document)
      .leftJoin(fileAsset, eq(document.fileId, fileAsset.id))
      .leftJoin(organization, eq(document.organizationId, organization.id))
      .where(and(eq(document.id, id), ...this.documentConditions()))
      .limit(1);

    return row ? { ...row.row, file: row.file, organization: row.organization } : null;
  }

  private async withAcknowledgement<T extends Record<string, any>>(row: T, userId: bigint) {
    const acknowledgements = await this.db.client
      .select()
      .from(documentAcknowledgement)
      .where(and(eq(documentAcknowledgement.documentId, row.id), eq(documentAcknowledgement.userId, userId)))
      .orderBy(desc(documentAcknowledgement.acknowledgedAt))
      .limit(1);
    return { ...row, acknowledgements };
  }
}
