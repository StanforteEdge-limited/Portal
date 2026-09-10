import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import {
  CreateFormAssignmentDto,
  CreateFormDto,
  CreateFormFieldDto,
  UpdateFormDto,
  UpdateFormFieldDto
} from './dto/manage-forms.dto';
import { toBigInt } from '../../common/utils/ids';

@Injectable()
export class FormsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query?: Record<string, any>) {
    const where: Prisma.FormWhereInput = { isActive: true };
    if (query?.module) where.module = String(query.module);
    const items = await this.prisma.form.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async getFormById(id: string) {
    const form = await this.prisma.form.findUnique({
      where: { id },
      include: { fields: true }
    });

    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async listForManagement(query: Record<string, any>) {
    const where: Prisma.FormWhereInput = {};
    if (query.module) where.module = String(query.module);
    if (query.include_inactive !== 'true') where.isActive = true;
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { description: { contains: String(query.search), mode: 'insensitive' } }
      ];
    }

    const items = await this.prisma.form.findMany({
      where,
      include: {
        fields: { orderBy: { displayOrder: 'asc' } },
        assignments: true
      },
      orderBy: [{ module: 'asc' }, { createdAt: 'desc' }]
    });
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createForm(actorId: string, dto: CreateFormDto) {
    return this.prisma.form.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        module: dto.module ?? 'general',
        storageType: dto.storage_type ?? 'json',
        createdByProfileId: actorId ? this.parseBigInt(actorId, 'actor id') : null,
        isActive: dto.is_active ?? true
      }
    });
  }

  async updateForm(id: string, dto: UpdateFormDto) {
    const existing = await this.prisma.form.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Form not found');

    return this.prisma.form.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
        module: dto.module ?? existing.module,
        storageType: dto.storage_type ?? existing.storageType,
        isActive: dto.is_active ?? existing.isActive
      },
      include: {
        fields: { orderBy: { displayOrder: 'asc' } },
        assignments: true
      }
    });
  }

  async createField(formId: string, dto: CreateFormFieldDto) {
    await this.ensureForm(formId);
    return this.prisma.formField.create({
      data: {
        formId,
        fieldKey: dto.field_key,
        fieldLabel: dto.field_label,
        fieldType: dto.field_type,
        fieldOptions: (dto.field_options ?? null) as Prisma.InputJsonValue,
        isRequired: dto.is_required ?? false,
        validationRules: (dto.validation_rules ?? null) as Prisma.InputJsonValue,
        displayOrder: dto.display_order ?? 0
      }
    });
  }

  async updateField(formId: string, fieldId: string, dto: UpdateFormFieldDto) {
    const field = await this.prisma.formField.findFirst({ where: { id: fieldId, formId } });
    if (!field) throw new NotFoundException('Field not found');

    return this.prisma.formField.update({
      where: { id: field.id },
      data: {
        fieldLabel: dto.field_label ?? field.fieldLabel,
        fieldType: dto.field_type ?? field.fieldType,
        fieldOptions:
          dto.field_options !== undefined
            ? (dto.field_options as Prisma.InputJsonValue)
            : (field.fieldOptions ?? Prisma.JsonNull),
        isRequired: dto.is_required ?? field.isRequired,
        validationRules:
          dto.validation_rules !== undefined
            ? (dto.validation_rules as Prisma.InputJsonValue)
            : (field.validationRules ?? Prisma.JsonNull),
        displayOrder: dto.display_order ?? field.displayOrder
      }
    });
  }

  async deleteField(formId: string, fieldId: string) {
    const field = await this.prisma.formField.findFirst({ where: { id: fieldId, formId } });
    if (!field) throw new NotFoundException('Field not found');
    await this.prisma.formField.delete({ where: { id: field.id } });
    return { success: true };
  }

  async listAssignments(query: Record<string, any>) {
    const where: Prisma.FormAssignmentWhereInput = {};
    if (query.form_id) where.formId = String(query.form_id);

    const items = await this.prisma.formAssignment.findMany({
      where,
      include: {
        form: { select: { id: true, name: true, module: true } }
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }]
    });
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
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
      const profile = await this.prisma.profile.findUnique({ where: { id: assignedToProfileId } });
      if (!profile) throw new NotFoundException('Assigned profile not found');
    }

    return this.prisma.formAssignment.create({
      data: {
        formId: dto.form_id,
        assignedToRole: dto.assigned_to_role ?? null,
        assignedToProfileId,
        dueDate: dto.due_date ? new Date(dto.due_date) : null
      }
    });
  }

  async deleteAssignment(id: string) {
    const existing = await this.prisma.formAssignment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.prisma.formAssignment.delete({ where: { id } });
    return { success: true };
  }

  async validateRequestTypePayload(requestTypeId: string, data: Record<string, unknown>) {
    const requestType = await this.prisma.requestType.findUnique({
      where: { id: requestTypeId },
      select: { id: true, storageType: true, formId: true, isActive: true }
    });

    if (!requestType || !requestType.isActive) {
      throw new BadRequestException('Invalid request type');
    }

    if ((requestType.storageType ?? 'form') !== 'form') return;
    if (!requestType.formId) {
      throw new BadRequestException('Form-backed request type is missing form binding');
    }

    const form = await this.prisma.form.findUnique({
      where: { id: requestType.formId },
      include: { fields: true }
    });

    if (!form || !form.isActive) {
      throw new BadRequestException('Assigned form is inactive or missing');
    }

    const requiredFields = form.fields.filter((field) => field.isRequired);
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
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  private parseBigInt(value: string, label: string) {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}
