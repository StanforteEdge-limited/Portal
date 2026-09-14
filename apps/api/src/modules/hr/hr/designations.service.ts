import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { toBigInt } from '$common/utils/ids';
import { document } from '$modules/requests/documents/model';
import { hrDesignation } from './model';

@Injectable()
export class DesignationsService {
  constructor(private readonly db: DbService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async list() {
    const list = await this.findDesignationsWithDocuments();
    return list.map((item) => this.serialize(item));
  }

  async get(id: string) {
    const bigId = toBigInt(id);
    const item = await this.findDesignationWithDocument(bigId);
    if (!item) throw new NotFoundException('Designation not found');
    return this.serialize(item);
  }

  async create(dto: { name: string; code?: string; description?: string; job_description?: string }) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Designation name is required');
    }

    const name = dto.name.trim();
    const code = dto.code?.trim() || null;
    const description = dto.description?.trim() || null;

    const existing = await this.findDesignationByName(name);
    if (existing) throw new BadRequestException('Designation name already exists');

    return await this.db.client.transaction(async (tx) => {
      let documentId: string | null = null;

      if (dto.job_description !== undefined) {
        const slug = `jd-${this.slugify(name)}-${Date.now()}`;
        const [doc] = await tx.insert(document).values({
            title: `${name} Job Description`,
            slug,
            category: 'job_description',
            status: 'active',
            contentHtml: dto.job_description || '',
            requireAcknowledgement: false
          } as typeof document.$inferInsert)
          .returning();
        documentId = doc.id;
      }

      const [created] = await tx.insert(hrDesignation)
        .values({
          name,
          code,
          description,
          documentId
        })
        .returning();

      return this.serialize({ ...created, document: documentId ? await this.findDocument(documentId) : null });
    });
  }

  async update(id: string, dto: { name?: string; code?: string; description?: string; job_description?: string }) {
    const bigId = toBigInt(id);
    const existing = await this.findDesignationWithDocument(bigId);
    if (!existing) throw new NotFoundException('Designation not found');

    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const nameCheck = await this.findDesignationByName(dto.name.trim());
      if (nameCheck) throw new BadRequestException('Designation name already exists');
    }

    return await this.db.client.transaction(async (tx) => {
      let documentId = existing.documentId;

      if (dto.job_description !== undefined) {
        if (documentId) {
          await tx.update(document)
            .set({ contentHtml: dto.job_description || '' })
            .where(eq(document.id, documentId));
        } else {
          const slug = `jd-${this.slugify(dto.name || existing.name)}-${Date.now()}`;
          const [doc] = await tx.insert(document)
            .values({
              title: `${dto.name || existing.name} Job Description`,
              slug,
              category: 'job_description',
              status: 'active',
              contentHtml: dto.job_description || '',
              requireAcknowledgement: false
            } as typeof document.$inferInsert)
            .returning();
          documentId = doc.id;
        }
      }

      const [updated] = await tx.update(hrDesignation)
        .set({
          name: dto.name?.trim(),
          code: dto.code?.trim(),
          description: dto.description?.trim(),
          documentId
        })
        .where(eq(hrDesignation.id, bigId))
        .returning();

      return this.serialize({ ...updated, document: documentId ? await this.findDocument(documentId) : null });
    });
  }

  async delete(id: string) {
    const bigId = toBigInt(id);
    const [existing] = await this.db.client.select().from(hrDesignation).where(eq(hrDesignation.id, bigId)).limit(1);
    if (!existing) throw new NotFoundException('Designation not found');

    await this.db.client.delete(hrDesignation).where(eq(hrDesignation.id, bigId));
    if (existing.documentId) {
      try {
        await this.db.client.delete(document).where(eq(document.id, existing.documentId));
      } catch (err) {
        // ignore if already deleted
      }
    }
    return { success: true };
  }

  private serialize(item: any) {
    return {
      id: item.id.toString(),
      name: item.name,
      code: item.code,
      description: item.description,
      is_active: item.isActive,
      document_id: item.documentId,
      job_description: item.document?.contentHtml || '',
      created_at: item.createdAt,
      updated_at: item.updatedAt
    };
  }

  private async findDesignationsWithDocuments() {
    const rows = await this.db.client
      .select({ designation: hrDesignation, document })
      .from(hrDesignation)
      .leftJoin(document, eq(hrDesignation.documentId, document.id))
      .orderBy(asc(hrDesignation.name));
    return rows.map(({ designation, document }) => ({ ...designation, document }));
  }

  private async findDesignationWithDocument(id: bigint) {
    const [row] = await this.db.client
      .select({ designation: hrDesignation, document })
      .from(hrDesignation)
      .leftJoin(document, eq(hrDesignation.documentId, document.id))
      .where(eq(hrDesignation.id, id))
      .limit(1);
    return row ? { ...row.designation, document: row.document } : null;
  }

  private async findDesignationByName(name: string) {
    const [designation] = await this.db.client
      .select()
      .from(hrDesignation)
      .where(eq(sql<string>`lower(${hrDesignation.name})`, name.toLowerCase()))
      .limit(1);
    return designation ?? null;
  }

  private async findDocument(documentId: string) {
    const [doc] = await this.db.client
      .select()
      .from(document)
      .where(eq(document.id, documentId))
      .limit(1);
    return doc ?? null;
  }
}
