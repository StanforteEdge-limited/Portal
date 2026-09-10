import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async list() {
    const list = await this.prisma.hrDesignation.findMany({
      include: { document: true },
      orderBy: { name: 'asc' }
    });
    return list.map((item) => this.serialize(item));
  }

  async get(id: string) {
    const bigId = toBigInt(id);
    const item = await this.prisma.hrDesignation.findUnique({
      where: { id: bigId },
      include: { document: true }
    });
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

    const existing = await this.prisma.hrDesignation.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });
    if (existing) throw new BadRequestException('Designation name already exists');

    return await this.prisma.$transaction(async (tx) => {
      let documentId: string | null = null;

      if (dto.job_description !== undefined) {
        const slug = `jd-${this.slugify(name)}-${Date.now()}`;
        const doc = await tx.document.create({
          data: {
            title: `${name} Job Description`,
            slug,
            category: 'job_description',
            status: 'active',
            contentHtml: dto.job_description || '',
            requireAcknowledgement: false
          }
        });
        documentId = doc.id;
      }

      const created = await tx.hrDesignation.create({
        data: {
          name,
          code,
          description,
          documentId
        },
        include: { document: true }
      });

      return this.serialize(created);
    });
  }

  async update(id: string, dto: { name?: string; code?: string; description?: string; job_description?: string }) {
    const bigId = toBigInt(id);
    const existing = await this.prisma.hrDesignation.findUnique({
      where: { id: bigId },
      include: { document: true }
    });
    if (!existing) throw new NotFoundException('Designation not found');

    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const nameCheck = await this.prisma.hrDesignation.findFirst({
        where: { name: { equals: dto.name.trim(), mode: 'insensitive' } }
      });
      if (nameCheck) throw new BadRequestException('Designation name already exists');
    }

    return await this.prisma.$transaction(async (tx) => {
      let documentId = existing.documentId;

      if (dto.job_description !== undefined) {
        if (documentId) {
          await tx.document.update({
            where: { id: documentId },
            data: {
              contentHtml: dto.job_description || ''
            }
          });
        } else {
          const slug = `jd-${this.slugify(dto.name || existing.name)}-${Date.now()}`;
          const doc = await tx.document.create({
            data: {
              title: `${dto.name || existing.name} Job Description`,
              slug,
              category: 'job_description',
              status: 'active',
              contentHtml: dto.job_description || '',
              requireAcknowledgement: false
            }
          });
          documentId = doc.id;
        }
      }

      const updated = await tx.hrDesignation.update({
        where: { id: bigId },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim(),
          description: dto.description?.trim(),
          documentId
        },
        include: { document: true }
      });

      return this.serialize(updated);
    });
  }

  async delete(id: string) {
    const bigId = toBigInt(id);
    const existing = await this.prisma.hrDesignation.findUnique({ where: { id: bigId } });
    if (!existing) throw new NotFoundException('Designation not found');

    await this.prisma.hrDesignation.delete({ where: { id: bigId } });
    if (existing.documentId) {
      try {
        await this.prisma.document.delete({ where: { id: existing.documentId } });
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
}
