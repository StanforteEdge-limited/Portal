import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { CreateTaxonomyDto } from '$modules/requests/taxonomy/dto/create-taxonomy.dto';
import { SyncTaxonomyTermsDto } from '$modules/requests/taxonomy/dto/sync-taxonomy-terms.dto';
import { UpdateTaxonomyDto } from '$modules/requests/taxonomy/dto/update-taxonomy.dto';
import { UpdateFieldOptionsDto } from '$modules/requests/taxonomy/dto/update-field-options.dto';
import { UpsertTagTermDto } from '$modules/requests/taxonomy/dto/upsert-tag-term.dto';
import { ReplaceEntityTagsDto } from '$modules/requests/taxonomy/dto/replace-entity-tags.dto';
import { taxonomy, taxonomyTagAssignment, taxonomyTerm } from './model';
import { form, formField } from '$modules/requests/forms/model';
import { requestCategory, requestGroup, requestType } from '$modules/requests/requests/model';

@Injectable()
export class TaxonomyService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list(query: Record<string, any>) {
    const includeInactive = query.include_inactive === 'true';

    const requestGroupConditions = this.requestGroupConditions();
    if (!includeInactive) requestGroupConditions.push(eq(requestGroup.isActive, true));

    const requestTypeConditions: SQL[] = [];
    if (!includeInactive) requestTypeConditions.push(eq(requestType.isActive, true));

    const formFieldConditions = [
      ...this.formFieldReadConditions(),
      inArray(formField.fieldType, ['select', 'radio', 'checkbox', 'multiselect']),
    ];

    const [requestGroups, requestTypes, formFields] = await Promise.all([
      this.db.client
        .select()
        .from(requestGroup)
        .where(requestGroupConditions.length ? and(...requestGroupConditions) : undefined)
        .orderBy(asc(requestGroup.name)),
      this.listRequestTypes(query.group_id ? String(query.group_id) : undefined, requestTypeConditions),
      this.db.client
        .select({
          row: formField,
          form: {
            id: form.id,
            name: form.name,
          },
        })
        .from(formField)
        .leftJoin(form, eq(formField.formId, form.id))
        .where(and(...formFieldConditions))
        .orderBy(asc(form.name), asc(formField.displayOrder)),
    ]);

    return {
      request_groups: requestGroups,
      request_types: requestTypes,
      form_field_taxonomies: formFields.map(({ row, form: linkedForm }) => ({
        id: row.id,
        form_id: linkedForm?.id,
        form_name: linkedForm?.name,
        field_key: row.fieldKey,
        field_label: row.fieldLabel,
        field_type: row.fieldType,
        options: this.normalizeOptions(row.fieldOptions)
      }))
    };
  }

  async listTaxonomies(query: Record<string, any>) {
    const includeInactive = query.include_inactive === 'true';
    const moduleFilter = query.module ? String(query.module) : undefined;

    const conditions = this.taxonomyReadConditions();
    if (!includeInactive) conditions.push(eq(taxonomy.isActive, true));
    if (moduleFilter) conditions.push(eq(taxonomy.module, moduleFilter));
    const rows = await this.db.client
      .select()
      .from(taxonomy)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(taxonomy.name));
    const items = await Promise.all(rows.map((row) => this.withTerms(row, includeInactive)));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createTaxonomy(dto: CreateTaxonomyDto) {
    const key = dto.key.trim().toLowerCase().replace(/\s+/g, '_');
    const [created] = await this.db.client
      .insert(taxonomy)
      .values({
        tenantId: this.currentTenantId(),
        key,
        name: dto.name.trim(),
        description: dto.description,
        module: dto.module,
        isActive: dto.is_active ?? true
      })
      .returning();
    return this.withTerms(created, true);
  }

  async updateTaxonomy(id: string, dto: UpdateTaxonomyDto) {
    const existing = await this.findTaxonomyById(id);
    if (!existing) throw new NotFoundException('Taxonomy not found');

    try {
      const nextKey = dto.key ? dto.key.trim().toLowerCase().replace(/\s+/g, '_') : undefined;
      if (nextKey && nextKey !== existing.key) {
        const duplicate = await this.findTaxonomyByKey(nextKey);
        if (duplicate && duplicate.id !== id) {
          throw new ConflictException('A taxonomy with this key already exists.');
        }
      }
      const [updated] = await this.db.client
        .update(taxonomy)
        .set(this.cleanUpdate({
          key: nextKey,
          name: dto.name?.trim(),
          description: dto.description,
          module: dto.module,
          renderType: dto.render_type,
          isActive: dto.is_active
        }))
        .where(and(eq(taxonomy.id, id), ...this.taxonomyWriteConditions()))
        .returning();
      return this.withTerms(updated, true);
    } catch (err) {
      if (err instanceof ConflictException) {
        throw new ConflictException('A taxonomy with this key already exists.');
      }
      throw err;
    }
  }

  async deleteTaxonomy(id: string) {
    const existing = await this.findTaxonomyById(id);
    if (!existing) throw new NotFoundException('Taxonomy not found');
    await this.db.client.delete(taxonomy).where(and(eq(taxonomy.id, id), ...this.taxonomyWriteConditions()));
    return { success: true };
  }

  async syncTerms(taxonomyId: string, dto: SyncTaxonomyTermsDto) {
    const existing = await this.findTaxonomyById(taxonomyId);
    if (!existing) throw new NotFoundException('Taxonomy not found');

    const terms = dto.terms
      .map((term) => term.trim())
      .filter((term, index, all) => term.length > 0 && all.indexOf(term) === index);

    await this.db.client.transaction(async (tx) => {
      await tx.delete(taxonomyTerm).where(and(eq(taxonomyTerm.taxonomyId, taxonomyId), ...this.taxonomyTermWriteConditions()));
      if (terms.length > 0) {
        await tx.insert(taxonomyTerm).values(
          terms.map((term, index) => ({
            tenantId: this.currentTenantId(),
            taxonomyId,
            value: term.toLowerCase().replace(/\s+/g, '_'),
            label: term,
            sortOrder: index,
            isActive: true
          })),
        );
      }
    });

    return this.withTerms(existing, true);
  }

  async updateFieldOptions(fieldId: string, dto: UpdateFieldOptionsDto) {
    const field = await this.findFormField(fieldId);
    if (!field) throw new NotFoundException('Form field not found');

    if (!['select', 'radio', 'checkbox', 'multiselect'].includes(field.fieldType)) {
      throw new BadRequestException('Field does not support options taxonomy');
    }

    const options = dto.options
      .map((option) => option.trim())
      .filter((option, index, arr) => option.length > 0 && arr.indexOf(option) === index);

    const [updated] = await this.db.client
      .update(formField)
      .set({
        fieldOptions: options
      })
      .where(and(eq(formField.id, fieldId), ...this.formFieldReadConditions()))
      .returning();
    const [linkedForm] = await this.db.client
      .select({ id: form.id, name: form.name })
      .from(form)
      .where(eq(form.id, updated.formId))
      .limit(1);

    return {
      id: updated.id,
      form_id: linkedForm?.id,
      form_name: linkedForm?.name,
      field_key: updated.fieldKey,
      field_label: updated.fieldLabel,
      field_type: updated.fieldType,
      options
    };
  }

  async suggestTagTerms(taxonomyKey: string, query?: string) {
    const existing = await this.findTaxonomyByKey(this.normalizeTaxonomyKey(taxonomyKey));
    if (!existing) throw new NotFoundException('Taxonomy not found');

    const termQuery = String(query ?? '').trim();
    const conditions = [
      ...this.taxonomyTermReadConditions(),
      eq(taxonomyTerm.taxonomyId, existing.id),
      eq(taxonomyTerm.isActive, true),
    ];
    if (termQuery) {
      conditions.push(or(
        ilike(taxonomyTerm.label, `%${termQuery}%`),
        ilike(taxonomyTerm.value, `%${this.slugify(termQuery)}%`),
      ) as SQL);
    }
    const items = await this.db.client
      .select()
      .from(taxonomyTerm)
      .where(and(...conditions))
      .orderBy(asc(taxonomyTerm.sortOrder), asc(taxonomyTerm.label))
      .limit(25);
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async upsertTagTerm(taxonomyKey: string, dto: UpsertTagTermDto, module?: string) {
    const existingTaxonomy = await this.resolveOrCreateTagTaxonomy(taxonomyKey, module);
    const label = dto.label.trim();
    if (!label) throw new BadRequestException('Tag label is required');

    const preferredValue = dto.value?.trim() || this.slugify(label);
    const value = preferredValue.slice(0, 120);
    const [existing] = await this.db.client
      .select()
      .from(taxonomyTerm)
      .where(and(
        ...this.taxonomyTermReadConditions(),
        eq(taxonomyTerm.taxonomyId, existingTaxonomy.id),
        or(ilike(taxonomyTerm.value, value), ilike(taxonomyTerm.label, label)),
      ))
      .limit(1);
    if (existing) return existing;

    const [sortAnchor] = await this.db.client
      .select({ value: count() })
      .from(taxonomyTerm)
      .where(and(eq(taxonomyTerm.taxonomyId, existingTaxonomy.id), ...this.taxonomyTermReadConditions()));

    const [created] = await this.db.client
      .insert(taxonomyTerm)
      .values({
        tenantId: this.currentTenantId(),
        taxonomyId: existingTaxonomy.id,
        value,
        label: label.slice(0, 120),
        sortOrder: Number(sortAnchor?.value ?? 0),
        isActive: true,
      })
      .returning();
    return created;
  }

  async listEntityTags(entityType: string, entityId: string, taxonomyKey: string) {
    const existing = await this.findTaxonomyByKey(this.normalizeTaxonomyKey(taxonomyKey));
    if (!existing) throw new NotFoundException('Taxonomy not found');

    const rows = await this.db.client
      .select({
        term: {
          id: taxonomyTerm.id,
          value: taxonomyTerm.value,
          label: taxonomyTerm.label,
          isActive: taxonomyTerm.isActive,
        },
      })
      .from(taxonomyTagAssignment)
      .innerJoin(taxonomyTerm, eq(taxonomyTagAssignment.termId, taxonomyTerm.id))
      .where(and(
        ...this.taxonomyTagAssignmentReadConditions(),
        eq(taxonomyTagAssignment.taxonomyId, existing.id),
        eq(taxonomyTagAssignment.entityType, this.normalizeEntityType(entityType)),
        eq(taxonomyTagAssignment.entityId, this.normalizeEntityId(entityId)),
      ))
      .orderBy(asc(taxonomyTerm.sortOrder), asc(taxonomyTerm.label));

    return {
      taxonomy: {
        id: existing.id,
        key: existing.key,
        name: existing.name,
        module: existing.module,
      },
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
    const existingTaxonomy = await this.resolveOrCreateTagTaxonomy(taxonomyKey, module);
    const normalizedEntityType = this.normalizeEntityType(entityType);
    const normalizedEntityId = this.normalizeEntityId(entityId);

    const termIds = Array.isArray(dto.term_ids)
      ? dto.term_ids.map((id) => id.trim()).filter((id) => id.length > 0)
      : [];
    const labels = Array.isArray(dto.labels)
      ? dto.labels.map((label) => label.trim()).filter((label) => label.length > 0)
      : [];

    const createdTerms = labels.length > 0
      ? await Promise.all(labels.map((label) => this.upsertTagTerm(existingTaxonomy.key, { label }, module)))
      : [];
    const wantedTermIds = Array.from(new Set([...termIds, ...createdTerms.map((term) => term.id)]));

    const existingTerms = wantedTermIds.length > 0
      ? await this.db.client
          .select({ id: taxonomyTerm.id })
          .from(taxonomyTerm)
          .where(and(
            ...this.taxonomyTermReadConditions(),
            eq(taxonomyTerm.taxonomyId, existingTaxonomy.id),
            inArray(taxonomyTerm.id, wantedTermIds),
          ))
      : [];
    const validTermIds = new Set(existingTerms.map((term) => term.id));
    const filteredTermIds = wantedTermIds.filter((id) => validTermIds.has(id));

    await this.db.client.transaction(async (tx) => {
      await tx.delete(taxonomyTagAssignment).where(and(
        ...this.taxonomyTagAssignmentWriteConditions(),
        eq(taxonomyTagAssignment.taxonomyId, existingTaxonomy.id),
        eq(taxonomyTagAssignment.entityType, normalizedEntityType),
        eq(taxonomyTagAssignment.entityId, normalizedEntityId),
      ));

      if (filteredTermIds.length > 0) {
        await tx
          .insert(taxonomyTagAssignment)
          .values(filteredTermIds.map((termId) => ({
            tenantId: this.currentTenantId(),
            taxonomyId: existingTaxonomy.id,
            termId,
            entityType: normalizedEntityType,
            entityId: normalizedEntityId,
            createdBy: this.toBigIntOrNull(userId),
          })))
          .onConflictDoNothing();
      }
    });

    return this.listEntityTags(normalizedEntityType, normalizedEntityId, existingTaxonomy.key);
  }

  private normalizeOptions(fieldOptions: unknown): string[] {
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
    const existing = await this.findTaxonomyByKey(key);
    if (existing) return existing;

    const [created] = await this.db.client
      .insert(taxonomy)
      .values({
        tenantId: this.currentTenantId(),
        key,
        name: key
          .split('_')
          .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
          .join(' '),
        module: module?.trim() || null,
        isActive: true,
      })
      .returning();
    return created;
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

  private currentTenantId() {
    const context = this.tenantContext.get();
    return context && context.scope !== 'system' ? context.tenantId : undefined;
  }

  private taxonomyReadConditions(): SQL[] {
    const tenantId = this.currentTenantId();
    return tenantId ? [or(eq(taxonomy.tenantId, tenantId), isNull(taxonomy.tenantId)) as SQL] : [];
  }

  private taxonomyWriteConditions(): SQL[] {
    const tenantId = this.currentTenantId();
    return tenantId ? [eq(taxonomy.tenantId, tenantId)] : [];
  }

  private taxonomyTermReadConditions(): SQL[] {
    const tenantId = this.currentTenantId();
    return tenantId ? [or(eq(taxonomyTerm.tenantId, tenantId), isNull(taxonomyTerm.tenantId)) as SQL] : [];
  }

  private taxonomyTermWriteConditions(): SQL[] {
    const tenantId = this.currentTenantId();
    return tenantId ? [eq(taxonomyTerm.tenantId, tenantId)] : [];
  }

  private taxonomyTagAssignmentReadConditions(): SQL[] {
    const tenantId = this.currentTenantId();
    return tenantId ? [eq(taxonomyTagAssignment.tenantId, tenantId)] : [];
  }

  private taxonomyTagAssignmentWriteConditions(): SQL[] {
    return this.taxonomyTagAssignmentReadConditions();
  }

  private formFieldReadConditions(): SQL[] {
    const tenantId = this.currentTenantId();
    return tenantId ? [or(eq(formField.tenantId, tenantId), isNull(formField.tenantId)) as SQL] : [];
  }

  private requestGroupConditions(): SQL[] {
    const tenantId = this.currentTenantId();
    return tenantId ? [eq(requestGroup.tenantId, tenantId)] : [];
  }

  private cleanUpdate<T extends Record<string, unknown>>(data: T): Partial<T> {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;
  }

  private async findTaxonomyById(id: string) {
    const [row] = await this.db.client
      .select()
      .from(taxonomy)
      .where(and(eq(taxonomy.id, id), ...this.taxonomyReadConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findTaxonomyByKey(key: string) {
    const [row] = await this.db.client
      .select()
      .from(taxonomy)
      .where(and(eq(taxonomy.key, key), ...this.taxonomyReadConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findFormField(fieldId: string) {
    const [row] = await this.db.client
      .select()
      .from(formField)
      .where(and(eq(formField.id, fieldId), ...this.formFieldReadConditions()))
      .limit(1);
    return row ?? null;
  }

  private async withTerms(row: typeof taxonomy.$inferSelect, includeInactive: boolean) {
    const conditions = [...this.taxonomyTermReadConditions(), eq(taxonomyTerm.taxonomyId, row.id)];
    if (!includeInactive) conditions.push(eq(taxonomyTerm.isActive, true));
    const terms = await this.db.client
      .select()
      .from(taxonomyTerm)
      .where(and(...conditions))
      .orderBy(asc(taxonomyTerm.sortOrder), asc(taxonomyTerm.label));
    return { ...row, terms };
  }

  private async listRequestTypes(groupId: string | undefined, conditions: SQL[]) {
    if (!groupId) {
      return this.db.client
        .select()
        .from(requestType)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(requestType.name));
    }

    const rows = await this.db.client
      .select({ row: requestType })
      .from(requestType)
      .innerJoin(requestCategory, eq(requestType.categoryId, requestCategory.id))
      .where(and(...conditions, eq(requestCategory.groupId, groupId)))
      .orderBy(asc(requestType.name));
    return rows.map((row) => row.row);
  }
}
