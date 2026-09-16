import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { paginatedResponse } from '$common/helpers/paginated-response';
import {
  CreateFormAssignmentDto,
  CreateFormDto,
  CreateFormFieldDto,
  UpdateFormDto,
  UpdateFormFieldDto
} from '$modules/requests/forms/dto/manage-forms.dto';
import { toBigInt } from '$common/utils/ids';
import { form, formAssignment, formField } from './model';
import { profile } from '$modules/identity/users/model';
import { requestType } from '$modules/requests/requests/model';

@Injectable()
export class FormsService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async list(query?: Record<string, any>) {
    const conditions = [...this.formReadConditions(), eq(form.isActive, true)];
    if (query?.module) conditions.push(eq(form.module, String(query.module)));
    const items = await this.db.client
      .select()
      .from(form)
      .where(and(...conditions))
      .orderBy(desc(form.createdAt));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async getFormById(id: string) {
    const row = await this.findFormById(id);

    if (!row) throw new NotFoundException('Form not found');
    return this.withFields(row);
  }

  async listForManagement(query: Record<string, any>) {
    const conditions = this.formReadConditions();
    if (query.module) conditions.push(eq(form.module, String(query.module)));
    if (query.include_inactive !== 'true') conditions.push(eq(form.isActive, true));
    if (query.search) {
      const search = `%${String(query.search)}%`;
      conditions.push(or(ilike(form.name, search), ilike(form.description, search)) as SQL);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const items = await this.db.client
      .select()
      .from(form)
      .where(where)
      .orderBy(asc(form.module), desc(form.createdAt));
    const hydrated = await Promise.all(items.map((item) => this.withFieldsAndAssignments(item)));
    return paginatedResponse(hydrated, { page: 1, per_page: items.length, total: items.length });
  }

  async createForm(actorId: string, dto: CreateFormDto) {
    const [created] = await this.db.client
      .insert(form)
      .values({
        tenantId: this.tenantContext.currentTenantId(),
        name: dto.name,
        description: dto.description ?? null,
        module: dto.module ?? 'general',
        storageType: dto.storage_type ?? 'json',
        createdByProfileId: actorId ? this.parseBigInt(actorId, 'actor id') : null,
        isActive: dto.is_active ?? true
      })
      .returning();
    return created ?? null;
  }

  async updateForm(id: string, dto: UpdateFormDto) {
    const existing = await this.findFormById(id);
    if (!existing) throw new NotFoundException('Form not found');

    const [updated] = await this.db.client
      .update(form)
      .set({
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        module: dto.module ?? existing.module,
        storageType: dto.storage_type ?? existing.storageType,
        isActive: dto.is_active ?? existing.isActive
      })
      .where(and(eq(form.id, id), ...this.formWriteConditions()))
      .returning();
    return this.withFieldsAndAssignments(updated);
  }

  async createField(formId: string, dto: CreateFormFieldDto) {
    await this.ensureForm(formId);
    const [created] = await this.db.client
      .insert(formField)
      .values({
        tenantId: this.tenantContext.currentTenantId(),
        formId,
        fieldKey: dto.field_key,
        fieldLabel: dto.field_label,
        fieldType: dto.field_type,
        fieldOptions: dto.field_options ?? null,
        isRequired: dto.is_required ?? false,
        validationRules: dto.validation_rules ?? null,
        displayOrder: dto.display_order ?? 0
      })
      .returning();
    return created ?? null;
  }

  async updateField(formId: string, fieldId: string, dto: UpdateFormFieldDto) {
    const existing = await this.findField(fieldId, formId);
    if (!existing) throw new NotFoundException('Field not found');

    const [updated] = await this.db.client
      .update(formField)
      .set({
        fieldLabel: dto.field_label ?? existing.fieldLabel,
        fieldType: dto.field_type ?? existing.fieldType,
        fieldOptions:
          dto.field_options !== undefined
            ? dto.field_options
            : (existing.fieldOptions ?? null),
        isRequired: dto.is_required ?? existing.isRequired,
        validationRules:
          dto.validation_rules !== undefined
            ? dto.validation_rules
            : (existing.validationRules ?? null),
        displayOrder: dto.display_order ?? existing.displayOrder
      })
      .where(eq(formField.id, existing.id))
      .returning();
    return updated ?? null;
  }

  async deleteField(formId: string, fieldId: string) {
    const existing = await this.findField(fieldId, formId);
    if (!existing) throw new NotFoundException('Field not found');
    await this.db.client.delete(formField).where(eq(formField.id, existing.id));
    return { success: true };
  }

  async listAssignments(query: Record<string, any>) {
    const conditions = this.formAssignmentConditions();
    if (query.form_id) conditions.push(eq(formAssignment.formId, String(query.form_id)));
    const where = conditions.length ? and(...conditions) : undefined;

    const items = await this.db.client
      .select({
        row: formAssignment,
        form: {
          id: form.id,
          name: form.name,
          module: form.module,
        },
      })
      .from(formAssignment)
      .leftJoin(form, eq(formAssignment.formId, form.id))
      .where(where)
      .orderBy(asc(formAssignment.dueDate), desc(formAssignment.createdAt));
    const rows = items.map(({ row, form: linkedForm }) => ({ ...row, form: linkedForm }));
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  async createAssignment(dto: CreateFormAssignmentDto) {
    await this.ensureForm(dto.form_id);
    if (!dto.assigned_to_role && !dto.assigned_to_profile_id) {
      throw new BadRequestException('Either assigned_to_role or assigned_to_profile_id is required');
    }
    const assignedToProfileId = dto.assigned_to_profile_id
      ? this.parseBigInt(dto.assigned_to_profile_id, 'assigned_to_profile_id')
      : null;

    if (assignedToProfileId) {
      const [assignedProfile] = await this.db.client
        .select({ id: profile.id })
        .from(profile)
        .where(eq(profile.id, assignedToProfileId))
        .limit(1);
      if (!assignedProfile) throw new NotFoundException('Assigned profile not found');
    }

    const [created] = await this.db.client
      .insert(formAssignment)
      .values({
        tenantId: this.tenantContext.currentTenantId(),
        formId: dto.form_id,
        assignedToRole: dto.assigned_to_role ?? null,
        assignedToProfileId,
        dueDate: dto.due_date ? new Date(dto.due_date) : null
      })
      .returning();
    return created ?? null;
  }

  async deleteAssignment(id: string) {
    const [existing] = await this.db.client
      .select()
      .from(formAssignment)
      .where(and(eq(formAssignment.id, id), ...this.formAssignmentConditions()))
      .limit(1);
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.db.client.delete(formAssignment).where(eq(formAssignment.id, id));
    return { success: true };
  }

  async validateRequestTypePayload(requestTypeId: string, data: Record<string, unknown>) {
    const [request] = await this.db.client
      .select({
        id: requestType.id,
        storageType: requestType.storageType,
        formId: requestType.formId,
        isActive: requestType.isActive,
      })
      .from(requestType)
      .where(eq(requestType.id, requestTypeId))
      .limit(1);

    if (!request || !request.isActive) {
      throw new BadRequestException('Invalid request type');
    }

    if ((request.storageType ?? 'form') !== 'form') return;
    if (!request.formId) {
      throw new BadRequestException('Form-backed request type is missing form binding');
    }

    const linkedForm = await this.getFormById(request.formId);

    if (!linkedForm || !linkedForm.isActive) {
      throw new BadRequestException('Assigned form is inactive or missing');
    }

    const requiredFields = linkedForm.fields.filter((field: any) => field.isRequired);
    const missing = requiredFields
      .filter((field) => {
        const value = data[field.fieldKey];
        if (value === undefined || value === null) return true;
        if (typeof value === 'string' && value.trim().length === 0) return true;
        return false;
      })
      .map((field) => field.fieldKey);

    if (missing.length > 0) {
      throw new BadRequestException(`Missing required form fields: ${missing.join(', ')}`);
    }
  }

  private async ensureForm(id: string) {
    const row = await this.findFormById(id);
    if (!row) throw new NotFoundException('Form not found');
    return row;
  }

  private parseBigInt(value: string, label: string) {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }

private formReadConditions(): SQL[] {
    const tenantId = this.tenantContext.currentTenantId();
    return tenantId ? [or(eq(form.tenantId, tenantId), isNull(form.tenantId)) as SQL] : [];
  }

  private formWriteConditions(): SQL[] {
    const tenantId = this.tenantContext.currentTenantId();
    return tenantId ? [eq(form.tenantId, tenantId)] : [];
  }

  private formFieldConditions(): SQL[] {
    const tenantId = this.tenantContext.currentTenantId();
    return tenantId ? [or(eq(formField.tenantId, tenantId), isNull(formField.tenantId)) as SQL] : [];
  }

  private formAssignmentConditions(): SQL[] {
    const tenantId = this.tenantContext.currentTenantId();
    return tenantId ? [eq(formAssignment.tenantId, tenantId)] : [];
  }

  private async findFormById(id: string) {
    const [row] = await this.db.client
      .select()
      .from(form)
      .where(and(eq(form.id, id), ...this.formReadConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findField(id: string, formId: string) {
    const [row] = await this.db.client
      .select()
      .from(formField)
      .where(and(eq(formField.id, id), eq(formField.formId, formId), ...this.formFieldConditions()))
      .limit(1);
    return row ?? null;
  }

  private async withFields(row: typeof form.$inferSelect) {
    const fields = await this.db.client
      .select()
      .from(formField)
      .where(and(eq(formField.formId, row.id), ...this.formFieldConditions()))
      .orderBy(asc(formField.displayOrder));
    return { ...row, fields };
  }

  private async withFieldsAndAssignments(row: typeof form.$inferSelect) {
    const [fields, assignments] = await Promise.all([
      this.db.client
        .select()
        .from(formField)
        .where(and(eq(formField.formId, row.id), ...this.formFieldConditions()))
        .orderBy(asc(formField.displayOrder)),
      this.db.client
        .select()
        .from(formAssignment)
        .where(and(eq(formAssignment.formId, row.id), ...this.formAssignmentConditions())),
    ]);
    return { ...row, fields, assignments };
  }
}
