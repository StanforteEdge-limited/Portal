import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { SyncTaxonomyTermsDto } from './dto/sync-taxonomy-terms.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { UpdateFieldOptionsDto } from './dto/update-field-options.dto';
import { UpsertTagTermDto } from './dto/upsert-tag-term.dto';
import { ReplaceEntityTagsDto } from './dto/replace-entity-tags.dto';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, any>) {
    const includeInactive = query.include_inactive === 'true';

    const [requestGroups, requestTypes, formFields] = await this.prisma.$transaction([
      this.prisma.requestGroup.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: { name: 'asc' }
      }),
      this.prisma.requestType.findMany({
        where: {
          ...(includeInactive ? {} : { isActive: true }),
          ...(query.group_id ? { groupId: String(query.group_id) } : {})
        },
        orderBy: { name: 'asc' }
      }),
      this.prisma.formField.findMany({
        where: {
          fieldType: { in: ['select', 'radio', 'checkbox', 'multiselect'] }
        },
        include: { form: { select: { id: true, name: true } } },
        orderBy: [{ form: { name: 'asc' } }, { displayOrder: 'asc' }]
      })
    ]);

    return {
      request_groups: requestGroups,
      request_types: requestTypes,
      form_field_taxonomies: formFields.map((field) => ({
        id: field.id,
        form_id: field.form.id,
        form_name: field.form.name,
        field_key: field.fieldKey,
        field_label: field.fieldLabel,
        field_type: field.fieldType,
        options: this.normalizeOptions(field.fieldOptions)
      }))
    };
  }

  async listTaxonomies(query: Record<string, any>) {
    const includeInactive = query.include_inactive === 'true';
    const moduleFilter = query.module ? String(query.module) : undefined;

    const items = await this.prisma.taxonomy.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(moduleFilter ? { module: moduleFilter } : {})
      },
      include: {
        terms: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }]
        }
      },
      orderBy: { name: 'asc' }
    });
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createTaxonomy(dto: CreateTaxonomyDto) {
    const key = dto.key.trim().toLowerCase().replace(/\s+/g, '_');
    return this.prisma.taxonomy.create({
      data: {
        key,
        name: dto.name.trim(),
        description: dto.description,
        module: dto.module,
        isActive: dto.is_active ?? true
      },
      include: { terms: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] } }
    });
  }

  async updateTaxonomy(id: string, dto: UpdateTaxonomyDto) {
    const existing = await this.prisma.taxonomy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Taxonomy not found');

    try {
      return await this.prisma.taxonomy.update({
        where: { id },
        data: {
          key: dto.key ? dto.key.trim().toLowerCase().replace(/\s+/g, '_') : undefined,
          name: dto.name?.trim(),
          description: dto.description,
          module: dto.module,
          renderType: dto.render_type,
          isActive: dto.is_active
        },
        include: { terms: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] } }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A taxonomy with this key already exists.');
      }
      throw err;
    }
  }

  async deleteTaxonomy(id: string) {
    const existing = await this.prisma.taxonomy.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Taxonomy not found');
    await this.prisma.taxonomy.delete({ where: { id } });
    return { success: true };
  }

  async syncTerms(taxonomyId: string, dto: SyncTaxonomyTermsDto) {
    const taxonomy = await this.prisma.taxonomy.findUnique({ where: { id: taxonomyId } });
    if (!taxonomy) throw new NotFoundException('Taxonomy not found');

    const terms = dto.terms
      .map((term) => term.trim())
      .filter((term, index, all) => term.length > 0 && all.indexOf(term) === index);

    await this.prisma.$transaction(async (tx) => {
      await tx.taxonomyTerm.deleteMany({ where: { taxonomyId } });
      if (terms.length > 0) {
        await tx.taxonomyTerm.createMany({
          data: terms.map((term, index) => ({
            taxonomyId,
            value: term.toLowerCase().replace(/\s+/g, '_'),
            label: term,
            sortOrder: index,
            isActive: true
          }))
        });
      }
    });

    return this.prisma.taxonomy.findUnique({
      where: { id: taxonomyId },
      include: { terms: { orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] } }
    });
  }

  async updateFieldOptions(fieldId: string, dto: UpdateFieldOptionsDto) {
    const field = await this.prisma.formField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException('Form field not found');

    if (!['select', 'radio', 'checkbox', 'multiselect'].includes(field.fieldType)) {
      throw new BadRequestException('Field does not support options taxonomy');
    }

    const options = dto.options
      .map((option) => option.trim())
      .filter((option, index, arr) => option.length > 0 && arr.indexOf(option) === index);

    const updated = await this.prisma.formField.update({
      where: { id: fieldId },
      data: {
        fieldOptions: options as Prisma.InputJsonValue
      },
      include: {
        form: { select: { id: true, name: true } }
      }
    });

    return {
      id: updated.id,
      form_id: updated.form.id,
      form_name: updated.form.name,
      field_key: updated.fieldKey,
      field_label: updated.fieldLabel,
      field_type: updated.fieldType,
      options
    };
  }

  async suggestTagTerms(taxonomyKey: string, query?: string) {
    const taxonomy = await this.prisma.taxonomy.findUnique({
      where: { key: this.normalizeTaxonomyKey(taxonomyKey) },
      select: { id: true },
    });
    if (!taxonomy) throw new NotFoundException('Taxonomy not found');

    const termQuery = String(query ?? '').trim();
    const items = await this.prisma.taxonomyTerm.findMany({
      where: {
        taxonomyId: taxonomy.id,
        isActive: true,
        ...(termQuery
          ? {
              OR: [
                { label: { contains: termQuery, mode: 'insensitive' } },
                { value: { contains: this.slugify(termQuery), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      take: 25,
    });
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertTagTerm(taxonomyKey: string, dto: UpsertTagTermDto, module?: string) {
    const taxonomy = await this.resolveOrCreateTagTaxonomy(taxonomyKey, module);
    const label = dto.label.trim();
    if (!label) throw new BadRequestException('Tag label is required');

    const preferredValue = dto.value?.trim() || this.slugify(label);
    const value = preferredValue.slice(0, 120);
    const existing = await this.prisma.taxonomyTerm.findFirst({
      where: {
        taxonomyId: taxonomy.id,
        OR: [
          { value: { equals: value, mode: 'insensitive' } },
          { label: { equals: label, mode: 'insensitive' } },
        ],
      },
    });
    if (existing) return existing;

    const sortAnchor = await this.prisma.taxonomyTerm.count({
      where: { taxonomyId: taxonomy.id },
    });

    return this.prisma.taxonomyTerm.create({
      data: {
        taxonomyId: taxonomy.id,
        value,
        label: label.slice(0, 120),
        sortOrder: sortAnchor,
        isActive: true,
      },
    });
  }

  async listEntityTags(entityType: string, entityId: string, taxonomyKey: string) {
    const taxonomy = await this.prisma.taxonomy.findUnique({
      where: { key: this.normalizeTaxonomyKey(taxonomyKey) },
      select: { id: true, key: true, name: true, module: true },
    });
    if (!taxonomy) throw new NotFoundException('Taxonomy not found');

    const rows = await this.prisma.taxonomyTagAssignment.findMany({
      where: {
        taxonomyId: taxonomy.id,
        entityType: this.normalizeEntityType(entityType),
        entityId: this.normalizeEntityId(entityId),
      },
      include: {
        term: {
          select: { id: true, value: true, label: true, isActive: true },
        },
      },
      orderBy: [{ term: { sortOrder: 'asc' } }, { term: { label: 'asc' } }],
    });

    return {
      taxonomy,
      tags: rows.map((row) => row.term),
    };
  }

  async replaceEntityTags(
    entityType: string,
    entityId: string,
    taxonomyKey: string,
    dto: ReplaceEntityTagsDto,
    module?: string,
    userId?: string | number
  ) {
    const taxonomy = await this.resolveOrCreateTagTaxonomy(taxonomyKey, module);
    const normalizedEntityType = this.normalizeEntityType(entityType);
    const normalizedEntityId = this.normalizeEntityId(entityId);

    const termIds = Array.isArray(dto.term_ids)
      ? dto.term_ids.map((id) => id.trim()).filter((id) => id.length > 0)
      : [];
    const labels = Array.isArray(dto.labels)
      ? dto.labels.map((label) => label.trim()).filter((label) => label.length > 0)
      : [];

    const createdTerms = labels.length > 0
      ? await Promise.all(labels.map((label) => this.upsertTagTerm(taxonomy.key, { label }, module)))
      : [];
    const wantedTermIds = Array.from(new Set([...termIds, ...createdTerms.map((term) => term.id)]));

    const existingTerms = wantedTermIds.length > 0
      ? await this.prisma.taxonomyTerm.findMany({
          where: {
            taxonomyId: taxonomy.id,
            id: { in: wantedTermIds },
          },
          select: { id: true },
        })
      : [];
    const validTermIds = new Set(existingTerms.map((term) => term.id));
    const filteredTermIds = wantedTermIds.filter((id) => validTermIds.has(id));

    await this.prisma.$transaction(async (tx) => {
      await tx.taxonomyTagAssignment.deleteMany({
        where: {
          taxonomyId: taxonomy.id,
          entityType: normalizedEntityType,
          entityId: normalizedEntityId,
        },
      });

      if (filteredTermIds.length > 0) {
        await tx.taxonomyTagAssignment.createMany({
          data: filteredTermIds.map((termId) => ({
            taxonomyId: taxonomy.id,
            termId,
            entityType: normalizedEntityType,
            entityId: normalizedEntityId,
            createdBy: this.toBigIntOrNull(userId),
          })),
          skipDuplicates: true,
        });
      }
    });

    return this.listEntityTags(normalizedEntityType, normalizedEntityId, taxonomy.key);
  }

  private normalizeOptions(fieldOptions: Prisma.JsonValue | null): string[] {
    if (Array.isArray(fieldOptions)) {
      return fieldOptions.filter((value): value is string => typeof value === 'string');
    }

    if (fieldOptions && typeof fieldOptions === 'object') {
      const values = (fieldOptions as Record<string, unknown>).options;
      if (Array.isArray(values)) {
        return values.filter((value): value is string => typeof value === 'string');
      }
    }

    return [];
  }

  private normalizeTaxonomyKey(value: string): string {
    const key = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) throw new BadRequestException('Taxonomy key is required');
    return key;
  }

  private normalizeEntityType(value: string): string {
    const entityType = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!entityType) throw new BadRequestException('Entity type is required');
    return entityType;
  }

  private normalizeEntityId(value: string): string {
    const entityId = String(value || '').trim();
    if (!entityId) throw new BadRequestException('Entity id is required');
    return entityId;
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'tag';
  }

  private async resolveOrCreateTagTaxonomy(taxonomyKey: string, module?: string) {
    const key = this.normalizeTaxonomyKey(taxonomyKey);
    const existing = await this.prisma.taxonomy.findUnique({ where: { key } });
    if (existing) return existing;

    return this.prisma.taxonomy.create({
      data: {
        key,
        name: key
          .split('_')
          .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
          .join(' '),
        module: module?.trim() || null,
        isActive: true,
      },
    });
  }

  private toBigIntOrNull(value: string | number | undefined): bigint | null {
    if (value === undefined || value === null) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    try {
      return BigInt(raw);
    } catch {
      return null;
    }
  }
}
