import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DocumentGeneratorService } from '../../common/documents/document-generator.service';
import { DocumentIds } from '../../common/documents/document.types';
import { RequestPdfDocument } from './documents/request-pdf.document';
import { PaymentVoucherDocument } from './documents/payment-voucher.document';
import { CertificateOfHonorDocument } from './documents/certificate-of-honor.document';
import { RequestWithAttachmentsDocument } from './documents/request-with-attachments.document';
import { FullPackageDocument } from './documents/full-package.document';
import { FullDocumentDocument } from './documents/full-document.document';
import { PVWithAttachmentsDocument } from './documents/pv-with-attachments.document';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateTypeDto } from './dto/create-type.dto';
import { UpdateTypeDto } from './dto/update-type.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { SubmitRequestDto } from './dto/submit-request.dto';
import { ActionRequestDto } from './dto/action-request.dto';
import { RequestResponseDto } from './dto/request-response.dto';
import { RetireRequestDto } from './dto/retire-request.dto';
import { CreateManualRequestDto } from './dto/create-manual-request.dto';
import { DownloadRequestDto } from './dto/download-request.dto';
import { toBigInt } from '../../common/utils/ids';
import { WorkflowService } from '../workflow/workflow.service';
import { normalizeWorkflowStepApprover } from '../workflow/workflow-approvers';
import { FormsService } from '../forms/forms.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GroupUserRole, Prisma } from '@prisma/client';

const MANUAL_REQUEST_ID_MIN = BigInt(1);
const MANUAL_REQUEST_ID_MAX = BigInt(99999);
const STAFF_REQUEST_ID_MIN = BigInt(3001);
const STAFF_REQUEST_SEQUENCE_START = BigInt(3050);

type RequestNotificationAudience = 'requester' | 'approver';

type RequestNotificationSummary = {
  requestNumber: string;
  requestTypeName: string;
  requesterName: string;
  requesterEmail: string | null;
  primaryMetricLabel: string;
  primaryMetricValue: string;
};

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly formsService: FormsService,
    private readonly notificationsService: NotificationsService,
    private readonly documentGenerator: DocumentGeneratorService,
  ) {}

  async listGroups() {
    const rows = await this.prisma.requestGroup.findMany({ where: { isActive: true } });
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  async createGroup(dto: CreateGroupDto) {
    if (!dto.code) throw new BadRequestException('code is required');
    return this.prisma.requestGroup.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description
      }
    });
  }

  async updateGroup(id: string, dto: UpdateGroupDto) {
    return this.prisma.requestGroup.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description
      }
    });
  }

  async deleteGroup(id: string) {
    await this.prisma.requestGroup.delete({ where: { id } });
    return { success: true };
  }

  async listCategories(groupId?: string) {
    const where = groupId ? { groupId } : {};
    const rows = await this.prisma.requestCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { group: { select: { name: true } } },
    });
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.prisma.requestCategory.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Category code "${dto.code}" already exists`);
    return this.prisma.requestCategory.create({
      data: {
        groupId: dto.group_id,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        sortOrder: dto.sort_order ?? 0,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.prisma.requestCategory.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.is_active,
        sortOrder: dto.sort_order,
      },
    });
  }

  async deleteCategory(id: string) {
    await this.prisma.requestCategory.delete({ where: { id } });
    return { success: true };
  }

  async listTypes(groupId?: string, categoryId?: string, includeInactive?: boolean, actorId?: string) {
    const typeWhere: any = {
      ...(includeInactive ? {} : { isActive: true })
    };
    if (categoryId) {
      typeWhere.categoryId = categoryId;
    } else if (groupId) {
      const categoryIds = (
        await this.prisma.requestCategory.findMany({
          where: { groupId },
          select: { id: true }
        })
      ).map((c) => c.id);
      typeWhere.categoryId = { in: categoryIds };
    }
    let rows = await this.prisma.requestType.findMany({
      where: typeWhere,
      include: { category: true }
    });

    if (actorId) {
      const userRoles = await this.getActorRoleSlugs(actorId);
      if (!userRoles.has('admin')) {
        rows = rows.filter((t) => {
          if (!t.visibleToRoles || !Array.isArray(t.visibleToRoles) || t.visibleToRoles.length === 0) return true;
          return (t.visibleToRoles as string[]).some((role) => userRoles.has(role));
        });
      }
    }

    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  async getType(id: string) {
    const type = await this.prisma.requestType.findUnique({ where: { id } });
    if (!type) throw new NotFoundException('Request type not found');
    return type;
  }

  async createType(dto: CreateTypeDto, actorId?: string) {
    const category = await this.prisma.requestCategory.findUnique({
      where: { id: dto.category_id },
      select: { groupId: true }
    });
    if (!category) throw new NotFoundException('Category not found');

    await this.assertRequestTypeGroupAccess(category.groupId, actorId);
    const group = await this.prisma.requestGroup.findUnique({
      where: { id: category.groupId },
      select: { code: true, name: true }
    });
    const requiresCooApproval = this.requestTypeRequiresCooApproval({
      groupCode: group?.code ?? null,
      groupName: group?.name ?? null,
      name: dto.name,
      codePrefix: dto.code_prefix,
      taxonomyKeys: dto.taxonomy_keys,
      formSchema: dto.form_schema
    });

    const approvalFlowJson = requiresCooApproval
      ? this.ensureApproverInApprovalFlow(dto.approval_flow_json, 'coo')
      : dto.approval_flow_json;

    return this.prisma.requestType.create({
      data: {
        categoryId: dto.category_id,
        name: dto.name,
        codePrefix: dto.code_prefix,
        taxonomyKeys: dto.taxonomy_keys as Prisma.InputJsonValue | undefined,
        formSchema: dto.form_schema as Prisma.InputJsonValue | undefined,
        description: dto.description,
        storageType: dto.storage_type ?? 'json',
        formId: dto.form_id,
        approvalFlowJson: approvalFlowJson as Prisma.InputJsonValue | undefined,
        approvalLimit: dto.approval_limit,
        workflowType: dto.workflow_type ?? null,
        handlerRoleLabel: dto.handler_role_label ?? null,
        visibleToRoles: dto.visible_to_roles as Prisma.InputJsonValue | undefined,
        isActive: dto.is_active ?? true,
      }
    });
  }

  async updateType(id: string, dto: UpdateTypeDto, actorId?: string) {
    const existing = await this.prisma.requestType.findUnique({
      where: { id },
      select: {
        categoryId: true,
        name: true,
        codePrefix: true,
        taxonomyKeys: true,
        formSchema: true,
        approvalFlowJson: true
      }
    });
    if (!existing) throw new NotFoundException('Request type not found');

    const resolvedCategoryId = dto.category_id ?? existing.categoryId;
    const category = await this.prisma.requestCategory.findUnique({
      where: { id: resolvedCategoryId },
      select: { groupId: true }
    });
    if (!category) throw new NotFoundException('Category not found');

    await this.assertRequestTypeGroupAccess(category.groupId, actorId);
    const group = await this.prisma.requestGroup.findUnique({
      where: { id: category.groupId },
      select: { code: true, name: true }
    });

    const mergedName = dto.name ?? existing.name;
    const mergedCodePrefix = dto.code_prefix ?? existing.codePrefix;
    const mergedTaxonomyKeys = dto.taxonomy_keys ?? (existing.taxonomyKeys as string[] | undefined) ?? undefined;
    const mergedFormSchema = dto.form_schema ?? (existing.formSchema as Record<string, unknown> | undefined);
    const mergedApprovalFlow = dto.approval_flow_json ?? (existing.approvalFlowJson as Record<string, unknown> | undefined);
    const requiresCooApproval = this.requestTypeRequiresCooApproval({
      groupCode: group?.code ?? null,
      groupName: group?.name ?? null,
      name: mergedName,
      codePrefix: mergedCodePrefix,
      taxonomyKeys: mergedTaxonomyKeys,
      formSchema: mergedFormSchema
    });

    const normalizedApprovalFlow = requiresCooApproval
      ? this.ensureApproverInApprovalFlow(mergedApprovalFlow, 'coo')
      : dto.approval_flow_json;

    return this.prisma.requestType.update({
      where: { id },
      data: {
        name: dto.name,
        categoryId: dto.category_id,
        codePrefix: dto.code_prefix,
        taxonomyKeys: dto.taxonomy_keys as Prisma.InputJsonValue | undefined,
        formSchema:
          dto.form_schema !== undefined
            ? (dto.form_schema as Prisma.InputJsonValue)
            : undefined,
        description: dto.description,
        storageType: dto.storage_type,
        formId: dto.form_id,
        approvalFlowJson:
          normalizedApprovalFlow !== undefined
            ? (normalizedApprovalFlow as Prisma.InputJsonValue)
            : undefined,
        approvalLimit: dto.approval_limit,
        isActive: dto.is_active,
        ...(dto.workflow_type !== undefined && { workflowType: dto.workflow_type }),
        ...(dto.handler_role_label !== undefined && { handlerRoleLabel: dto.handler_role_label }),
        visibleToRoles: dto.visible_to_roles !== undefined ? (dto.visible_to_roles as Prisma.InputJsonValue) : undefined,
      }
    });
  }

  async deleteType(id: string, actorId?: string) {
    const existing = await this.prisma.requestType.findUnique({
      where: { id },
      select: { id: true, categoryId: true }
    });
    if (!existing) throw new NotFoundException('Request type not found');

    const category = await this.prisma.requestCategory.findUnique({
      where: { id: existing.categoryId },
      select: { groupId: true }
    });
    if (!category) throw new NotFoundException('Category not found');
    await this.assertRequestTypeGroupAccess(category.groupId, actorId);

    const usageCount = await this.prisma.requestInstance.count({
      where: { requestTypeId: existing.id }
    });
    if (usageCount > 0) {
      throw new BadRequestException('Cannot delete request type with existing requests. Set it inactive instead.');
    }

    await this.prisma.requestType.delete({ where: { id: existing.id } });
    return { success: true };
  }

  private async assertRequestTypeGroupAccess(_groupId: string, _actorId?: string) {
    // Access is already gated by @Permissions('requests.manage') at the controller level.
  }

  private requestTypeRequiresCooApproval(input: {
    groupCode?: string | null;
    groupName?: string | null;
    name?: string | null;
    codePrefix?: string | null;
    taxonomyKeys?: string[] | null;
    formSchema?: Record<string, unknown> | null;
  }) {
    const marker = `${String(input.groupCode ?? '').toLowerCase()} ${String(input.groupName ?? '').toLowerCase()}`;
    const isFinanceOrHrGroup = /(^|[\s_-])(fin|finance|financial|hr|human\s*resources|people)([\s_-]|$)/.test(marker);
    if (!isFinanceOrHrGroup) return false;

    const text = [
      String(input.name ?? '').toLowerCase(),
      String(input.codePrefix ?? '').toLowerCase(),
      String(input.taxonomyKeys?.[0] ?? '').toLowerCase(),
      String(input.formSchema?.workflow_kind ?? '').toLowerCase(),
      String(input.formSchema?.request_kind ?? '').toLowerCase()
    ].join(' ');

    const isSalary = /(salary|payroll|wages|compensation|pay_run|payrun)/.test(text);
    const isTransfer = /(transfer|treasury|cash_move|internal_transfer|fund_move|xfer|trf)/.test(text);
    return isSalary || isTransfer;
  }

  private ensureApproverInApprovalFlow(
    approvalFlowJson: Record<string, unknown> | null | undefined,
    requiredRoleSlug: string
  ) {
    const base =
      approvalFlowJson && typeof approvalFlowJson === 'object' && !Array.isArray(approvalFlowJson)
        ? { ...(approvalFlowJson as Record<string, unknown>) }
        : {};

    const rawSteps = Array.isArray(base.steps) ? base.steps : [];
    const normalizedSteps = rawSteps
      .filter((step) => step && typeof step === 'object' && !Array.isArray(step))
      .map((step) => ({ ...(step as Record<string, unknown>) }));

    const targetApprover =
      requiredRoleSlug.toLowerCase() === 'coo'
        ? { approverType: 'office', approverId: 'coo' }
        : normalizeWorkflowStepApprover({ role: requiredRoleSlug });

    const hasRequiredRole = normalizedSteps.some((step) => {
      const approver = normalizeWorkflowStepApprover(step);
      return approver.approverType === targetApprover.approverType && approver.approverId === targetApprover.approverId;
    });
    if (!hasRequiredRole) {
      if (targetApprover.approverType === 'office' || targetApprover.approverType === 'permission' || targetApprover.approverType === 'relation') {
        normalizedSteps.push({
          approver: {
            type: targetApprover.approverType,
            value: targetApprover.approverId,
          },
        });
      } else {
        normalizedSteps.push({ role: requiredRoleSlug });
      }
    }

    return {
      ...base,
      steps: normalizedSteps
    };
  }

  private async getActorRoleSlugs(actorId: string) {
    const roles = await this.prisma.userRole.findMany({
      where: { profileId: toBigInt(actorId) },
      select: { role: { select: { slug: true } } }
    });
    return new Set(roles.map((item) => String(item.role.slug || '').toLowerCase()));
  }

  private normalizeItemFileIds(item: { file_id?: string | null; file_ids?: string[] | null }) {
    return Array.from(
      new Set([item.file_id ?? null, ...(item.file_ids ?? [])].filter((id): id is string => Boolean(id)))
    );
  }

  private normalizeVoucherEvidenceFileIds(voucher: { evidence_file_id?: string | null; evidence_file_ids?: string[] | null }) {
    return Array.from(
      new Set([voucher.evidence_file_id ?? null, ...(voucher.evidence_file_ids ?? [])].filter((id): id is string => Boolean(id)))
    );
  }

  async createRequest(userId: string, dto: CreateRequestDto) {
    const requestType = await this.prisma.requestType.findUnique({ where: { id: dto.request_type_id }, include: { category: true } });
    if (!requestType || !requestType.isActive) throw new BadRequestException('Invalid request type');
    await this.formsService.validateRequestTypePayload(requestType.id, dto.data);
    await this.validateLeaveRequestPayload(
      {
        name: requestType.name,
        taxonomyKeys: requestType.taxonomyKeys as string[] | null | undefined,
        formSchema: requestType.formSchema
      },
      dto.data,
      userId
    );
    const budgetSelection = await this.validateBudgetSelection(dto.data ?? {}, {
      team_id: dto.team_id,
      organization_id: dto.organization_id,
      project_id: dto.data?.project_id ? String(dto.data.project_id) : undefined,
    });
    const normalizedData = this.withBudgetSelection(dto.data ?? {}, budgetSelection);

    const createdBy = toBigInt(userId);

    if (dto.items) {
      const invalid = dto.items.find((item) => item.amount <= 0 || (item.quantity ?? 1) <= 0);
      if (invalid) throw new BadRequestException('Invalid item amount or quantity');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await this.ensureStaffRequestSequenceFloor(tx);

      const computedTotal = dto.items && dto.items.length
        ? dto.items.reduce((sum, item) => sum + (item.amount * (item.quantity ?? 1)), 0)
        : dto.total_amount;

      const fileIds = dto.items
        ? Array.from(new Set(dto.items.flatMap((item) => this.normalizeItemFileIds(item))))
        : [];
      if (fileIds.length > 0) {
        await this.ensureFileAssetsExist(tx, fileIds);
      }

      const request = await tx.requestInstance.create({
        data: {
          requestTypeId: requestType.id,
          groupId: requestType.category.groupId,
          createdBy,
          organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
          teamId: dto.team_id ? toBigInt(dto.team_id) : null,
          status: 'draft',
          data: normalizedData,
          totalAmount: computedTotal ?? dto.total_amount,
          currency: dto.currency || 'NGN'
        }
      });
      if (request.id < STAFF_REQUEST_ID_MIN) {
        throw new BadRequestException(
          `Automatic request ids must start from ${STAFF_REQUEST_ID_MIN.toString()}. Set request sequence before creating staff requests.`
        );
      }

      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          const fileIds = this.normalizeItemFileIds(item);
          const createdItem = await tx.requestItem.create({
            data: {
              requestId: request.id,
              fileId: fileIds[0] ?? null,
              description: item.description,
              amount: item.amount,
              quantity: item.quantity ?? 1,
              categoryId: item.category_id ?? null,
              subcategoryId: item.subcategory_id ?? null,
              dueDate: item.due_date ? new Date(item.due_date) : null,
              notes: item.notes ?? null,
              bankName: item.bank_name ?? null,
              accountNumber: item.account_number ?? null,
              accountName: item.account_name ?? null
            }
          });
          if (fileIds.length > 0) {
            await tx.requestItemFile.createMany({
              data: fileIds.map((fileId, index) => ({
                requestItemId: createdItem.id,
                fileId,
                sortOrder: index
              }))
            });
          }
        }
      }

      return request;
    });

    await this.syncBudgetCommitmentForRequest(created);

    return this.getRequest(created.id.toString(), userId);
  }

  async createManualEntry(userId: string, dto: CreateManualRequestDto) {
    const requestType = await this.prisma.requestType.findUnique({ where: { id: dto.request_type_id }, include: { category: true } });
    if (!requestType || !requestType.isActive) throw new BadRequestException('Invalid request type');

    const staff = await this.prisma.profile.findUnique({
      where: { id: toBigInt(dto.staff_id) },
      select: { id: true, email: true, username: true, firstName: true, lastName: true }
    });
    if (!staff) throw new BadRequestException('Invalid staff_id');

    if (dto.team_id) {
      const team = await this.prisma.group.findUnique({ where: { id: toBigInt(dto.team_id) }, select: { id: true } });
      if (!team) throw new BadRequestException('Invalid team_id');
    }
    if (dto.organization_id) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: toBigInt(dto.organization_id) },
        select: { id: true }
      });
      if (!organization) throw new BadRequestException('Invalid organization_id');
    }

    const itemFileIds = (dto.items ?? []).flatMap((i) => this.normalizeItemFileIds(i));
    const voucherEvidenceIds = (dto.disbursements ?? []).flatMap((x) => this.normalizeVoucherEvidenceFileIds(x));
    const retirementIds = (dto.disbursements ?? [])
      .flatMap((x) => x.retirement_file_ids ?? [])
      .filter((x): x is string => Boolean(x));
    const allFileIds = Array.from(new Set([...itemFileIds, ...voucherEvidenceIds, ...retirementIds]));
    if (allFileIds.length) await this.ensureFileAssetsExist(this.prisma, allFileIds);
    const paidFromAccountIds = Array.from(
      new Set(
        (dto.disbursements ?? [])
          .map((x) => x.paid_from_account_id)
          .filter((x): x is string => Boolean(x))
      )
    );
    if (paidFromAccountIds.length > 0) {
      const count = await this.prisma.financeAccount.count({
        where: { id: { in: paidFromAccountIds }, isActive: true }
      });
      if (count !== paidFromAccountIds.length) throw new BadRequestException('Invalid paid_from_account_id');
    }
    const itemsTotal = (dto.items ?? []).reduce(
      (sum, item) => sum + Number(item.amount) * Number(item.quantity ?? 1),
      0
    );
    const totalAmount = dto.total_amount ?? itemsTotal;
    const createdAt = dto.created_at ? new Date(dto.created_at) : new Date();
    if (Number.isNaN(createdAt.getTime())) throw new BadRequestException('Invalid created_at');

    const explicitRequestId = dto.request_id ? toBigInt(dto.request_id) : null;
    if (explicitRequestId) {
      this.assertManualRequestIdRange(explicitRequestId);
      const taken = await this.prisma.requestInstance.findUnique({ where: { id: explicitRequestId }, select: { id: true } });
      if (taken) throw new BadRequestException(`request_id ${dto.request_id} already exists`);
    }

    // Pre-generate PV numbers for disbursements that don't have one
    let pvSeqOffset = 0;
    const resolvedDisbursements: NonNullable<typeof dto.disbursements> = [];
    for (const row of (dto.disbursements ?? [])) {
      const vn = (row.voucher_number ?? '').trim();
      if (vn) {
        resolvedDisbursements.push(row);
      } else {
        const disbDate = row.disbursed_at ? new Date(row.disbursed_at) : createdAt;
        const year = disbDate.getFullYear();
        const count = await this.prisma.financePaymentVoucher.count({
          where: { disbursedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
        });
        resolvedDisbursements.push({ ...row, voucher_number: `PV/${year}/${String(count + 1 + pvSeqOffset++).padStart(3, '0')}` });
      }
    }

    const baseData: Record<string, unknown> = {
      ...(dto.data ?? {}),
      manual_import: true,
      manual_approvals: (dto.approvals ?? []).map((row) => ({
        role: row.role,
        name: row.name ?? null,
        date: row.date ?? null,
        done: row.done ?? true,
        comment: row.comment ?? null
      })),
      imported_at: new Date().toISOString(),
      imported_by: userId
    };
    const status = (dto.status ?? 'completed') as any;
    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.requestInstance.create({
        data: {
          ...(explicitRequestId ? { id: explicitRequestId } : {}),
          requestTypeId: requestType.id,
          groupId: requestType.category.groupId,
          createdBy: staff.id,
          teamId: dto.team_id ? toBigInt(dto.team_id) : null,
          organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
          status,
          data: baseData as Prisma.InputJsonValue,
          totalAmount,
          currency: dto.currency || 'NGN',
          createdAt,
          updatedAt: createdAt
        }
      });

      if (dto.items?.length) {
        for (const item of dto.items) {
          const fileIds = this.normalizeItemFileIds(item);
          const createdItem = await tx.requestItem.create({
            data: {
              requestId: request.id,
              description: item.description,
              amount: item.amount,
              quantity: item.quantity ?? 1,
              notes: item.notes ?? null,
              fileId: fileIds[0] ?? null,
              bankName: item.bank_name ?? null,
              accountNumber: item.account_number ?? null,
              accountName: item.account_name ?? null
            }
          });
          if (fileIds.length > 0) {
            await tx.requestItemFile.createMany({
              data: fileIds.map((fileId, index) => ({
                requestItemId: createdItem.id,
                fileId,
                sortOrder: index
              }))
            });
          }
        }
      }

      if (resolvedDisbursements.length) {
        for (const row of resolvedDisbursements) {
          const amount = Number(row.amount);
          const retiredAmount = Number(row.retired_amount ?? 0);
          const disbursedAt = row.disbursed_at ? new Date(row.disbursed_at) : createdAt;
          if (Number.isNaN(disbursedAt.getTime())) throw new BadRequestException('Invalid disbursement date');
          const evidenceFileIds = this.normalizeVoucherEvidenceFileIds(row);
          const deductions = row.deductions ?? [];
          const totalDeducted = deductions.reduce((s, d) => s + Number(d.deduction_amount), 0);
          const grossAmt = row.gross_amount != null ? Number(row.gross_amount) : amount;
          const netAmt = row.net_amount != null ? Number(row.net_amount) : (deductions.length > 0 ? grossAmt - totalDeducted : null);
          const createdVoucher = await tx.financePaymentVoucher.create({
            data: {
              requestId: request.id,
              voucherNumber: row.voucher_number!,
              amount,
              retiredAmount,
              retirementStatus: row.retirement_status ?? (retiredAmount > 0 ? (retiredAmount >= amount ? 'retired' : 'partial') : 'not_retired'),
              method: row.method ?? null,
              transactionRef: row.transaction_ref ?? null,
              note: row.note ?? null,
              paidFromAccountId: row.paid_from_account_id ?? null,
              evidenceFileId: evidenceFileIds[0] ?? null,
              disbursedAt,
              retiredAt: retiredAmount > 0 ? disbursedAt : null,
              verifiedAt: row.retirement_status === 'verified' ? disbursedAt : null,
              contactId: row.contact_id ?? null,
              grossAmount: deductions.length > 0 ? grossAmt : null,
              netAmount: netAmt,
              metadata: {
                retirement_file_ids: row.retirement_file_ids ?? [],
                ...(row.refund_amount != null || row.refund_method || row.refund_reference ? {
                  refund: {
                    refund_amount: row.refund_amount ?? null,
                    refund_method: row.refund_method ?? null,
                    refund_reference: row.refund_reference ?? null,
                    refund_date: row.refund_date ?? null,
                  }
                } : {})
              } as Prisma.InputJsonValue
            }
          });
          if (evidenceFileIds.length > 0) {
            await tx.financePaymentVoucherFile.createMany({
              data: evidenceFileIds.map((fileId, index) => ({
                voucherId: createdVoucher.id,
                fileId,
                fileKind: 'evidence',
                sortOrder: index
              }))
            });
          }
          if (deductions.length > 0) {
            await tx.financePVDeduction.createMany({
              data: deductions.map((d) => ({
                paymentVoucherId: createdVoucher.id,
                deductionTypeId: d.deduction_type_id,
                rate: d.rate,
                grossAmount: Number(d.gross_amount),
                deductionAmount: d.deduction_amount,
                createdBy: toBigInt(userId),
              }))
            });
            await tx.financeRequestDeduction.createMany({
              data: deductions.map((d) => ({
                requestId: request.id,
                deductionTypeId: d.deduction_type_id,
                amount: Number(d.deduction_amount),
                rate: d.rate,
                grossAmount: Number(d.gross_amount),
                status: 'pending',
                createdBy: toBigInt(userId),
                updatedAt: new Date(),
              }))
            });
          }
        }
      }

      if (explicitRequestId) {
        await this.ensureStaffRequestSequenceFloor(tx);
      }

      return request;
    });

    return this.getRequest(created.id.toString(), userId);
  }

  async updateManualEntry(id: string, userId: string, dto: CreateManualRequestDto) {
    const requestType = await this.prisma.requestType.findUnique({ where: { id: dto.request_type_id }, include: { category: true } });
    if (!requestType || !requestType.isActive) throw new BadRequestException('Invalid request type');

    const existing = await this.getRequestOrThrow(id);

    const staff = await this.prisma.profile.findUnique({
      where: { id: toBigInt(dto.staff_id) },
      select: { id: true }
    });
    if (!staff) throw new BadRequestException('Invalid staff_id');

    if (dto.team_id) {
      const team = await this.prisma.group.findUnique({ where: { id: toBigInt(dto.team_id) }, select: { id: true } });
      if (!team) throw new BadRequestException('Invalid team_id');
    }
    if (dto.organization_id) {
      const organization = await this.prisma.organization.findUnique({
        where: { id: toBigInt(dto.organization_id) },
        select: { id: true }
      });
      if (!organization) throw new BadRequestException('Invalid organization_id');
    }

    const itemFileIds = (dto.items ?? []).flatMap((i) => this.normalizeItemFileIds(i));
    const voucherEvidenceIds = (dto.disbursements ?? []).flatMap((x) => this.normalizeVoucherEvidenceFileIds(x));
    const retirementIds = (dto.disbursements ?? [])
      .flatMap((x) => x.retirement_file_ids ?? [])
      .filter((x): x is string => Boolean(x));
    const allFileIds = Array.from(new Set([...itemFileIds, ...voucherEvidenceIds, ...retirementIds]));
    if (allFileIds.length) await this.ensureFileAssetsExist(this.prisma, allFileIds);
    const paidFromAccountIds = Array.from(
      new Set(
        (dto.disbursements ?? [])
          .map((x) => x.paid_from_account_id)
          .filter((x): x is string => Boolean(x))
      )
    );
    if (paidFromAccountIds.length > 0) {
      const count = await this.prisma.financeAccount.count({
        where: { id: { in: paidFromAccountIds }, isActive: true }
      });
      if (count !== paidFromAccountIds.length) throw new BadRequestException('Invalid paid_from_account_id');
    }
    const itemsTotal = (dto.items ?? []).reduce(
      (sum, item) => sum + Number(item.amount) * Number(item.quantity ?? 1),
      0
    );
    const totalAmount = dto.total_amount ?? itemsTotal;
    const createdAt = dto.created_at ? new Date(dto.created_at) : existing.createdAt;
    if (Number.isNaN(createdAt.getTime())) throw new BadRequestException('Invalid created_at');
    const desiredRequestId = dto.request_id ? toBigInt(dto.request_id) : existing.id;
    const isRequestIdChanged = desiredRequestId !== existing.id;
    if (isRequestIdChanged) {
      this.assertManualRequestIdRange(desiredRequestId);
    }
    if (isRequestIdChanged) {
      const taken = await this.prisma.requestInstance.findUnique({
        where: { id: desiredRequestId },
        select: { id: true }
      });
      if (taken) throw new BadRequestException(`request_id ${dto.request_id} already exists`);
    }

    // Pre-generate PV numbers for disbursements that don't have one
    let pvSeqOffsetU = 0;
    const resolvedDisbursements: NonNullable<typeof dto.disbursements> = [];
    for (const row of (dto.disbursements ?? [])) {
      const vn = (row.voucher_number ?? '').trim();
      if (vn) {
        resolvedDisbursements.push(row);
      } else {
        const disbDate = row.disbursed_at ? new Date(row.disbursed_at) : createdAt;
        const year = disbDate.getFullYear();
        const count = await this.prisma.financePaymentVoucher.count({
          where: { disbursedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } }
        });
        resolvedDisbursements.push({ ...row, voucher_number: `PV/${year}/${String(count + 1 + pvSeqOffsetU++).padStart(3, '0')}` });
      }
    }

    const baseData: Record<string, unknown> = {
      ...(dto.data ?? {}),
      manual_import: true,
      manual_approvals: (dto.approvals ?? []).map((row) => ({
        role: row.role,
        name: row.name ?? null,
        date: row.date ?? null,
        done: row.done ?? true,
        comment: row.comment ?? null
      })),
      imported_at: new Date().toISOString(),
      imported_by: userId
    };
    const status = (dto.status ?? existing.status) as any;
    await this.prisma.$transaction(async (tx) => {
      if (isRequestIdChanged) {
        await tx.requestInstance.create({
          data: {
            id: desiredRequestId,
            requestTypeId: requestType.id,
            groupId: requestType.category.groupId,
            createdBy: staff.id,
            teamId: dto.team_id ? toBigInt(dto.team_id) : null,
            organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
            workflowInstanceId: null,
            status,
            data: baseData as Prisma.InputJsonValue,
            totalAmount,
            currency: dto.currency || existing.currency || 'NGN',
            createdAt,
            updatedAt: new Date()
          }
        });
      } else {
        await tx.requestInstance.update({
          where: { id: existing.id },
          data: {
            requestTypeId: requestType.id,
            groupId: requestType.category.groupId,
            createdBy: staff.id,
            teamId: dto.team_id ? toBigInt(dto.team_id) : null,
            organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
            status,
            data: baseData as Prisma.InputJsonValue,
            totalAmount,
            currency: dto.currency || existing.currency || 'NGN',
            createdAt,
            updatedAt: new Date()
          }
        });
      }

      await tx.requestItem.deleteMany({ where: { requestId: existing.id } });
      if (dto.items?.length) {
        for (const item of dto.items) {
          const fileIds = this.normalizeItemFileIds(item);
          const createdItem = await tx.requestItem.create({
            data: {
              requestId: desiredRequestId,
              description: item.description,
              amount: item.amount,
              quantity: item.quantity ?? 1,
              notes: item.notes ?? null,
              fileId: fileIds[0] ?? null,
              bankName: item.bank_name ?? null,
              accountNumber: item.account_number ?? null,
              accountName: item.account_name ?? null
            }
          });
          if (fileIds.length > 0) {
            await tx.requestItemFile.createMany({
              data: fileIds.map((fileId, index) => ({
                requestItemId: createdItem.id,
                fileId,
                sortOrder: index
              }))
            });
          }
        }
      }

      await tx.financePaymentVoucher.deleteMany({ where: { requestId: existing.id } });
      await tx.financeRequestDeduction.deleteMany({ where: { requestId: existing.id } });
      if (resolvedDisbursements.length) {
        for (const row of resolvedDisbursements) {
          const amount = Number(row.amount);
          const retiredAmount = Number(row.retired_amount ?? 0);
          const disbursedAt = row.disbursed_at ? new Date(row.disbursed_at) : createdAt;
          if (Number.isNaN(disbursedAt.getTime())) throw new BadRequestException('Invalid disbursement date');
          const evidenceFileIds = this.normalizeVoucherEvidenceFileIds(row);
          const deductions = row.deductions ?? [];
          const totalDeducted = deductions.reduce((s, d) => s + Number(d.deduction_amount), 0);
          const grossAmt = row.gross_amount != null ? Number(row.gross_amount) : amount;
          const netAmt = row.net_amount != null ? Number(row.net_amount) : (deductions.length > 0 ? grossAmt - totalDeducted : null);
          const createdVoucher = await tx.financePaymentVoucher.create({
            data: {
              requestId: desiredRequestId,
              voucherNumber: row.voucher_number!,
              amount,
              retiredAmount,
              retirementStatus: row.retirement_status ?? (retiredAmount > 0 ? (retiredAmount >= amount ? 'retired' : 'partial') : 'not_retired'),
              method: row.method ?? null,
              transactionRef: row.transaction_ref ?? null,
              note: row.note ?? null,
              paidFromAccountId: row.paid_from_account_id ?? null,
              evidenceFileId: evidenceFileIds[0] ?? null,
              disbursedAt,
              retiredAt: retiredAmount > 0 ? disbursedAt : null,
              verifiedAt: row.retirement_status === 'verified' ? disbursedAt : null,
              contactId: row.contact_id ?? null,
              grossAmount: deductions.length > 0 ? grossAmt : null,
              netAmount: netAmt,
              metadata: {
                retirement_file_ids: row.retirement_file_ids ?? [],
                ...(row.refund_amount != null || row.refund_method || row.refund_reference ? {
                  refund: {
                    refund_amount: row.refund_amount ?? null,
                    refund_method: row.refund_method ?? null,
                    refund_reference: row.refund_reference ?? null,
                    refund_date: row.refund_date ?? null,
                  }
                } : {})
              } as Prisma.InputJsonValue
            }
          });
          if (evidenceFileIds.length > 0) {
            await tx.financePaymentVoucherFile.createMany({
              data: evidenceFileIds.map((fileId, index) => ({
                voucherId: createdVoucher.id,
                fileId,
                fileKind: 'evidence',
                sortOrder: index
              }))
            });
          }
          if (deductions.length > 0) {
            await tx.financePVDeduction.createMany({
              data: deductions.map((d) => ({
                paymentVoucherId: createdVoucher.id,
                deductionTypeId: d.deduction_type_id,
                rate: d.rate,
                grossAmount: Number(d.gross_amount),
                deductionAmount: d.deduction_amount,
                createdBy: toBigInt(userId),
              }))
            });
            await tx.financeRequestDeduction.createMany({
              data: deductions.map((d) => ({
                requestId: desiredRequestId,
                deductionTypeId: d.deduction_type_id,
                amount: Number(d.deduction_amount),
                rate: d.rate,
                grossAmount: Number(d.gross_amount),
                status: 'pending',
                createdBy: toBigInt(userId),
                updatedAt: new Date(),
              }))
            });
          }
        }
      }

      if (isRequestIdChanged) {
        await tx.requestInstance.delete({ where: { id: existing.id } });
        await this.ensureStaffRequestSequenceFloor(tx);
      }
    });

    return this.getRequest(desiredRequestId.toString(), userId);
  }

  async deleteManualEntry(id: string, userId: string) {
    const existing = await this.getRequestOrThrow(id);
    const existingData =
      existing.data && typeof existing.data === 'object' && !Array.isArray(existing.data)
        ? (existing.data as Record<string, unknown>)
        : {};
    if (!existingData.manual_import) {
      throw new BadRequestException('Only manual-import requests can be deleted from manual entry');
    }

    await this.prisma.requestInstance.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async checkManualRequestNumber(requestId?: string, requestTypeId?: string, excludeId?: string) {
    const raw = String(requestId || '').trim();
    if (!raw) {
      return { exists: false };
    }
    if (!/^\d+$/.test(raw)) {
      return { exists: false };
    }

    const where: Prisma.RequestInstanceWhereInput = {
      ...(requestTypeId ? { requestTypeId } : {}),
      ...(excludeId ? { id: { not: toBigInt(excludeId) } } : {}),
      id: toBigInt(raw)
    };

    const found = await this.prisma.requestInstance.findFirst({
      where,
      select: { id: true }
    });
    return { exists: Boolean(found), request_id: found?.id?.toString() ?? null };
  }

  async checkManualVoucherNumber(voucherNumber?: string, excludeRequestId?: string) {
    const raw = String(voucherNumber || '').trim();
    if (!raw) {
      return { exists: false };
    }
    if (!/^\d+$/.test(raw)) {
      return { exists: false };
    }

    const found = await this.prisma.financePaymentVoucher.findFirst({
      where: {
        voucherNumber: raw,
        ...(excludeRequestId ? { requestId: { not: toBigInt(excludeRequestId) } } : {})
      },
      select: {
        id: true,
        requestId: true,
        voucherNumber: true
      }
    });

    return {
      exists: Boolean(found),
      voucher_number: found?.voucherNumber ?? null,
      request_id: found?.requestId?.toString() ?? null
    };
  }

  async submitRequest(id: string, userId: string, dto: SubmitRequestDto) {
    const request = await this.getRequestOrThrow(id);
    if (request.createdBy !== toBigInt(userId)) {
      throw new BadRequestException('Only owner can submit request');
    }
    if (!['draft', 'returned'].includes(request.status)) {
      throw new BadRequestException('Request is not editable for submission');
    }

    const submitAction = request.status === 'returned' ? 'resubmit' : 'submit';
    const updated = await this.transitionRequestStatus(request, 'sent', userId, {
      action: submitAction,
      comment: dto.comment
    });

    const workflowStart = await this.workflowService.startForRequest({
      requestId: request.id,
      requestTypeId: request.requestTypeId,
      initiatedBy: userId,
      amount: request.totalAmount ? Number(request.totalAmount) : undefined
    });

    // If workflow exists, request is now in generic approval stage.
    if (workflowStart.instanceId) {
      const nextStatus = workflowStart.workflowStatus === 'approved' ? 'cleared' : 'approval';
      await this.prisma.requestInstance.update({
        where: { id: request.id },
        data: {
          status: nextStatus as any,
          data: this.withStateEvent(request.data, {
            from: 'sent',
            to: nextStatus,
            action: workflowStart.workflowStatus === 'approved' ? 'workflow_auto_approved' : 'workflow_start',
            by: userId
          })
        }
      });
    }

    const submittedRequest = await this.getRequestOrThrow(id);
    await this.syncBudgetCommitmentForRequest(submittedRequest);

    try {
      const formattedRequestNumber = await this.getFormattedRequestNumber(request.id);
      const submissionMessage =
        request.status === 'returned'
          ? `Request #${request.id.toString()} resubmitted for approval.`
          : `Request #${request.id.toString()} submitted for approval.`;
      const requesterNotificationChannels = await this.buildRequestNotificationChannels({
        requestId: request.id,
        audience: 'requester',
        message: submissionMessage,
        comment: dto.comment
      });
      await this.notificationsService.create({
        userId,
        type: 'action',
        title: request.status === 'returned' ? 'Request resubmitted' : 'Request submitted',
        message: submissionMessage,
        ...requesterNotificationChannels,
        data: { requestId: request.id.toString(), comment: dto.comment },
        notifiableType: 'request',
        notifiableId: request.id,
        emailSubject:
          request.status === 'returned'
            ? `Request resubmitted (${formattedRequestNumber})`
            : `Request submitted (${formattedRequestNumber})`,
        emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
      });

      if (workflowStart.instanceId && workflowStart.workflowStatus !== 'approved') {
        await this.notifyCurrentApprovers(
          request.id,
          `Request ${formattedRequestNumber} has been sent to you for approval.`,
          `Request pending approval (${formattedRequestNumber})`,
          userId,
          dto.comment
        );
      }
    } catch (error) {
      // Do not fail request submission because notification/email delivery failed.
      console.error('submitRequest notification failed', error);
    }

    return this.getRequest(updated.id.toString(), userId);
  }

  async approveRequest(id: string, userId: string, dto: ActionRequestDto) {
    const request = await this.getRequestOrThrow(id);
    if (!['sent', 'approval'].includes(request.status)) {
      if (['cleared', 'disbursed', 'confirmed', 'retired', 'completed'].includes(request.status)) {
        return this.getRequest(request.id.toString(), userId);
      }
      throw new BadRequestException('Request is not pending approval');
    }

    const effectiveComment = dto.comment?.trim() || 'Approved.';

    if (request.workflowInstanceId) {
      let stepResult: { status: string; completed: boolean; currentStepId?: string };
      try {
        stepResult = await this.workflowService.processDecision({
          instanceId: request.workflowInstanceId,
          action: 'approve',
          performedBy: userId,
          comment: effectiveComment
        });
      } catch (error) {
        if (!this.isWorkflowInactiveError(error)) {
          throw error;
        }

        const currentInstance = await this.prisma.workflowInstance.findUnique({
          where: { id: request.workflowInstanceId },
          select: { status: true }
        });

        if (currentInstance?.status === 'rejected' || currentInstance?.status === 'cancelled') {
          throw new BadRequestException('Workflow is already closed and cannot be approved');
        }

        stepResult = { status: 'approved', completed: true };
      }

      if (stepResult.status === 'pending') {
        await this.prisma.requestInstance.update({
          where: { id: request.id },
          data: { status: 'approval' }
        });
        const formattedRequestNumber = await this.getFormattedRequestNumber(request.id);
        await this.notifyCurrentApprovers(
          request.id,
          `Request ${formattedRequestNumber} has been sent to you for approval.`,
          `Request pending approval (${formattedRequestNumber})`,
          userId
        );
        await this.notifyPreviousApprovers(
          request.id,
          `Request #${request.id.toString()} has been approved/cleared and moved to the next step.`,
          `Request Update (${formattedRequestNumber})`,
          userId,
          effectiveComment
        );
        return this.getRequest(request.id.toString(), userId);
      }
    }

    await this.ensureLeaveBalanceForApproval(request.id);

    const updated = await this.transitionRequestStatus(request, 'cleared', userId, {
      action: 'approve',
      comment: effectiveComment
    });

    await this.syncBudgetCommitmentForRequest(updated);

    await this.applyLeaveDebitIfNeeded(request.id, userId);

    try {
      const formattedRequestNumber = await this.getFormattedRequestNumber(request.id);
      const approvalMessage = `Request #${request.id.toString()} has been approved.`;
      const requesterNotificationChannels = await this.buildRequestNotificationChannels({
        requestId: request.id,
        audience: 'requester',
        message: approvalMessage,
        comment: effectiveComment
      });
      await this.notificationsService.create({
        userId: request.createdBy,
        type: 'success',
        title: 'Request approved',
        message: approvalMessage,
        ...requesterNotificationChannels,
        data: { requestId: request.id.toString(), comment: effectiveComment },
        notifiableType: 'request',
        notifiableId: request.id,
        emailSubject: `Request approved (${formattedRequestNumber})`,
        emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
      });

      await this.notifyPreviousApprovers(
        request.id,
        approvalMessage,
        `Request Update (${formattedRequestNumber})`,
        userId,
        effectiveComment
      );
    } catch (error) {
      console.error('approveRequest notification failed', error);
    }

    return this.getRequest(updated.id.toString(), userId);
  }

  async rejectRequest(id: string, userId: string, dto: ActionRequestDto) {
    const request = await this.getRequestOrThrow(id);
    if (!['sent', 'approval'].includes(request.status)) {
      if (['rejected', 'cancelled'].includes(request.status)) {
        return this.getRequest(request.id.toString(), userId);
      }
      throw new BadRequestException('Request is not pending approval');
    }

    if (request.workflowInstanceId) {
      try {
        await this.workflowService.processDecision({
          instanceId: request.workflowInstanceId,
          action: 'reject',
          performedBy: userId,
          comment: dto.comment
        });
      } catch (error) {
        if (!this.isWorkflowInactiveError(error)) {
          throw error;
        }

        const currentInstance = await this.prisma.workflowInstance.findUnique({
          where: { id: request.workflowInstanceId },
          select: { status: true }
        });

        if (currentInstance?.status === 'approved') {
          throw new BadRequestException('Workflow is already approved and cannot be rejected');
        }
      }
    }

    const updated = await this.transitionRequestStatus(request, 'rejected', userId, {
      action: 'reject',
      comment: dto.comment
    });

    await this.syncBudgetCommitmentForRequest(updated);

    await this.revertLeaveDebitIfNeeded(request.id, userId, 'rejected');

    try {
      const formattedRequestNumber = await this.getFormattedRequestNumber(request.id);
      const rejectionMessage = `Request #${request.id.toString()} has been rejected.`;
      const requesterNotificationChannels = await this.buildRequestNotificationChannels({
        requestId: request.id,
        audience: 'requester',
        message: rejectionMessage,
        comment: dto.comment
      });
      await this.notificationsService.create({
        userId: request.createdBy,
        type: 'warning',
        title: 'Request rejected',
        message: rejectionMessage,
        ...requesterNotificationChannels,
        data: { requestId: request.id.toString(), comment: dto.comment },
        notifiableType: 'request',
        notifiableId: request.id,
        emailSubject: `Request rejected (${formattedRequestNumber})`,
        emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
      });

      await this.notifyPreviousApprovers(
        request.id,
        rejectionMessage,
        `Request Update (${formattedRequestNumber})`,
        userId,
        dto.comment
      );
    } catch (error) {
      console.error('rejectRequest notification failed', error);
    }

    return this.getRequest(updated.id.toString(), userId);
  }

  async returnRequest(id: string, userId: string, dto: ActionRequestDto) {
    const request = await this.getRequestOrThrow(id);
    if (!['sent', 'approval'].includes(request.status)) {
      if (['returned', 'draft'].includes(request.status)) {
        return this.getRequest(request.id.toString(), userId);
      }
      throw new BadRequestException('Request is not pending approval');
    }
    const reason = String(dto.comment ?? '').trim();
    if (!reason) {
      throw new BadRequestException('Return comment is required');
    }

    try {
      if (request.workflowInstanceId) {
        try {
          await this.workflowService.cancelWorkflow(
            request.workflowInstanceId,
            userId,
            `Returned for edit: ${reason}`,
          );
        } catch (error) {
          const message = String((error as Error)?.message ?? '').toLowerCase();
          const alreadyClosed = message.includes('workflow is already closed');
          if (!this.isWorkflowInactiveError(error) && !alreadyClosed) {
            throw error;
          }

          const currentInstance = await this.prisma.workflowInstance.findUnique({
            where: { id: request.workflowInstanceId },
            select: { status: true }
          });

          if (currentInstance?.status === 'approved') {
            throw new BadRequestException('Workflow is already approved and cannot be returned for edit');
          }
        }
      }

      const updated = await this.prisma.requestInstance.update({
        where: { id: request.id },
        data: {
          status: 'returned',
          workflowInstanceId: null,
          data: this.withStateEvent(request.data, {
            from: request.status,
            to: 'returned',
            by: userId,
            action: 'return',
            comment: reason
          })
        }
      });

      await this.syncBudgetCommitmentForRequest(updated);

      try {
        const formattedRequestNumber = await this.getFormattedRequestNumber(request.id);
        const returnedMessage = `Request #${request.id.toString()} was returned for correction and resubmission.`;
        const requesterNotificationChannels = await this.buildRequestNotificationChannels({
          requestId: request.id,
          audience: 'requester',
          message: returnedMessage,
          comment: reason
        });
        await this.notificationsService.create({
          userId: request.createdBy,
          type: 'warning',
          title: 'Request returned for edit',
          message: returnedMessage,
          ...requesterNotificationChannels,
          data: { requestId: request.id.toString(), comment: reason },
          notifiableType: 'request',
          notifiableId: request.id,
          emailSubject: `Request returned for edit (${formattedRequestNumber})`,
          emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
        });
      } catch (error) {
        console.error('returnRequest notification failed', error);
      }

      return this.getRequest(updated.id.toString(), userId);
    } catch (error) {
      console.error('returnRequest failed after transition attempt', {
        requestId: request.id.toString(),
        actorId: userId,
        error,
      });

      const current = await this.prisma.requestInstance.findUnique({
        where: { id: request.id },
        include: this.documentGenerator.getRequestInclude()
      });

      if (current?.status === 'returned') {
        const serialized = this.serializeRequest(current);
        serialized.approvals = { done: [], pending: [], required_steps: [] };
        return serialized;
      }

      throw error;
    }
  }

  async listRequests(filters: Record<string, any>, userId: string) {
    const page = filters.page ? Math.max(1, parseInt(String(filters.page), 10)) : 1;
    const limit = filters.per_page ? Math.max(1, parseInt(String(filters.per_page), 10)) : 1000;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.id) where.id = toBigInt(filters.id);
    if (filters.group_id) where.groupId = filters.group_id;
    if (filters.type_id || filters.request_type_id) where.requestTypeId = filters.type_id || filters.request_type_id;
    if (filters.status) {
      if (typeof filters.status === 'string' && filters.status.includes(',')) {
        where.status = { in: filters.status.split(',') };
      } else {
        where.status = filters.status;
      }
    }
    if (filters.created_by) where.createdBy = toBigInt(filters.created_by);
    if (filters.request_number) {
      const raw = String(filters.request_number).trim();
      if (/^\d+$/.test(raw)) where.id = toBigInt(raw);
    }
    
    if (filters.family) {
      where.requestType = { workflowType: filters.family };
    }

    // If no view-all permission, restrict to current user (handled by PermissionsGuard upstream)
    if (filters.only_mine === 'true') {
      where.createdBy = toBigInt(userId);
    }

    const [total, data] = await Promise.all([
      this.prisma.requestInstance.count({ where }),
      this.prisma.requestInstance.findMany({
        where,
        include: this.documentGenerator.getRequestInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      })
    ]);

    const items = await Promise.all(
      data.map(async (item) => {
        const ser = this.serializeRequest(item);
        if (item.workflowInstanceId) {
          ser.approvals = await this.getApprovalSummary(item.workflowInstanceId);
        } else {
          ser.approvals = { done: [], pending: [], required_steps: [] };
        }
        return ser;
      })
    );
    return paginatedResponse(items, { page, per_page: limit, total });
  }

  async getRequest(id: string, _userId: string): Promise<RequestResponseDto> {
    const request = await this.prisma.requestInstance.findUnique({
      where: { id: toBigInt(id) },
      include: this.documentGenerator.getRequestInclude()
    });
    if (!request) throw new NotFoundException('Request not found');
    const serialized = this.serializeRequest(request);
    if (request.workflowInstanceId) {
      serialized.approvals = await this.getApprovalSummary(request.workflowInstanceId);
    } else {
      const approvals: any = { done: [], pending: [], required_steps: [] };
      const data = request.data as Record<string, any>;
      if (data?.manual_approvals && Array.isArray(data.manual_approvals)) {
        approvals.done = data.manual_approvals.map((m: any) => ({
          action: m.done ? 'approve' : 'pending',
          step: m.role || 'Unknown',
          performed_by_name: m.name ?? null,
          performed_by_email: null,
          comment: m.comment ?? null,
          at: m.date ?? request.createdAt.toISOString()
        }));
        approvals.required_steps = data.manual_approvals.map((m: any) => ({
          step: m.role || 'Unknown',
          role: m.role || null,
          approver: null
        }));
      }
      serialized.approvals = approvals;
    }
    return serialized;
  }

  async updateRequest(id: string, userId: string, dto: UpdateRequestDto) {
    const request = await this.getRequestOrThrow(id);
    if (request.createdBy !== toBigInt(userId)) {
      throw new BadRequestException('Only owner can update request');
    }
    if (!['draft', 'returned'].includes(request.status)) {
      throw new BadRequestException('Only draft or returned requests can be updated');
    }

    if (dto.items) {
      const invalid = dto.items.find((item) => item.amount <= 0 || (item.quantity ?? 1) <= 0);
      if (invalid) throw new BadRequestException('Invalid item amount or quantity');
    }

    if (dto.data) {
      await this.formsService.validateRequestTypePayload(request.requestTypeId, dto.data);
      const requestType = await this.prisma.requestType.findUnique({
        where: { id: request.requestTypeId },
        select: { name: true, taxonomyKeys: true, formSchema: true }
      });
      await this.validateLeaveRequestPayload(
        {
          name: requestType?.name ?? null,
          taxonomyKeys: requestType?.taxonomyKeys as string[] | null | undefined,
          formSchema: requestType?.formSchema ?? null
        },
        dto.data,
        userId
      );
    }

    const nextDataSource = dto.data !== undefined
      ? dto.data
      : (request.data && typeof request.data === 'object' && !Array.isArray(request.data)
          ? (request.data as Record<string, any>)
          : {});
    const budgetSelection = await this.validateBudgetSelection(nextDataSource ?? {}, {
      team_id: dto.team_id ?? (request.teamId ? request.teamId.toString() : undefined),
      organization_id: dto.organization_id ?? (request.organizationId ? request.organizationId.toString() : undefined),
      project_id: nextDataSource?.project_id ? String(nextDataSource.project_id) : undefined,
    });
    const normalizedData = this.withBudgetSelection(nextDataSource ?? {}, budgetSelection);

    const updated = await this.prisma.$transaction(async (tx) => {
      const computedTotal = dto.items && dto.items.length
        ? dto.items.reduce((sum, item) => sum + (item.amount * (item.quantity ?? 1)), 0)
        : undefined;

      const fileIds = dto.items
        ? Array.from(new Set(dto.items.flatMap((item) => this.normalizeItemFileIds(item))))
        : [];
      if (fileIds.length > 0) {
        await this.ensureFileAssetsExist(tx, fileIds);
      }

        const updated = await tx.requestInstance.update({
          where: { id: request.id },
          data: {
            data: normalizedData,
            teamId: dto.team_id ? toBigInt(dto.team_id) : request.teamId,
            organizationId: dto.organization_id ? toBigInt(dto.organization_id) : request.organizationId,
            totalAmount: computedTotal ?? dto.total_amount ?? request.totalAmount,
            currency: dto.currency ?? request.currency
          }
      });

      if (dto.items) {
        await tx.requestItem.deleteMany({ where: { requestId: request.id } });
        if (dto.items.length > 0) {
          for (const item of dto.items) {
            const fileIds = this.normalizeItemFileIds(item);
            const createdItem = await tx.requestItem.create({
              data: {
                requestId: request.id,
                fileId: fileIds[0] ?? null,
                description: item.description,
                amount: item.amount,
                quantity: item.quantity ?? 1,
                categoryId: item.category_id ?? null,
                subcategoryId: item.subcategory_id ?? null,
                dueDate: item.due_date ? new Date(item.due_date) : null,
                notes: item.notes ?? null,
                bankName: item.bank_name ?? null,
                accountNumber: item.account_number ?? null,
                accountName: item.account_name ?? null
              }
            });
            if (fileIds.length > 0) {
              await tx.requestItemFile.createMany({
                data: fileIds.map((fileId, index) => ({
                  requestItemId: createdItem.id,
                  fileId,
                  sortOrder: index
                }))
              });
            }
          }
        }
      }

      return updated;
    });

    await this.syncBudgetCommitmentForRequest(updated);

    return this.getRequest(updated.id.toString(), userId);
  }

  async deleteRequest(id: string, userId: string) {
    const request = await this.getRequestOrThrow(id);
    if (request.createdBy !== toBigInt(userId)) {
      throw new BadRequestException('Only owner can delete request');
    }
    if (request.status !== 'draft') {
      throw new BadRequestException('Only draft requests can be deleted');
    }

    await this.prisma.requestInstance.delete({ where: { id: request.id } });
    return { success: true };
  }

  async getApprovals(userId: string, filters: Record<string, any>) {
    const page = Math.max(1, Number(filters.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(filters.per_page) || 20));

    const data = await this.prisma.requestInstance.findMany({
      where: {
        workflowInstanceId: { not: null }
      },
      include: this.documentGenerator.getRequestInclude(),
      orderBy: { createdAt: 'desc' }
    });

    const userIdBigInt = toBigInt(userId);
    const instanceIds = data
      .map((item) => item.workflowInstanceId)
      .filter((id): id is string => Boolean(id));
    const myHistory =
      instanceIds.length > 0
        ? await this.prisma.workflowHistory.findMany({
            where: {
              instanceId: { in: instanceIds },
              performedBy: userIdBigInt,
              action: { in: ['approve', 'reject'] }
            },
            orderBy: { createdAt: 'desc' }
          })
        : [];
    const myActionByInstance = new Map<string, 'approve' | 'reject'>();
    for (const row of myHistory) {
      if (!myActionByInstance.has(row.instanceId) && (row.action === 'approve' || row.action === 'reject')) {
        myActionByInstance.set(row.instanceId, row.action);
      }
    }

    const serialized = await Promise.all(
      data.map(async (item) => {
        const ser = this.serializeRequest(item);
        if (item.workflowInstanceId) {
          ser.approvals = await this.getApprovalSummary(item.workflowInstanceId);
        } else {
          ser.approvals = { done: [], pending: [], required_steps: [] };
        }
        return ser;
      })
    );
    const decorated = await Promise.all(
      serialized.map(async (item) => {
        const instanceId = data.find((row) => row.id.toString() === item.id)?.workflowInstanceId ?? null;
        const myAction = instanceId ? myActionByInstance.get(instanceId) : undefined;
        const done = ((item.approvals as any)?.done ?? []) as Array<{ performed_by?: string | null; action?: string }>;
        const acted = done.find((entry) => String(entry.performed_by || '') === String(userId))?.action;
        const pendingForMe = await this.isPendingApprovalForUser(item.id, userId);
        const approvalViewStatus = pendingForMe
          ? 'pending'
          : (myAction || acted) === 'approve'
            ? 'approved'
            : (myAction || acted) === 'reject'
              ? 'rejected'
              : 'none';
        return {
          ...item,
          approval_view_status: approvalViewStatus
        };
      })
    );

    let filtered = decorated.filter((item) => item.approval_view_status !== 'none');
    if (filters.status) {
      const status = String(filters.status).toLowerCase();
      filtered = filtered.filter((item) => String(item.approval_view_status).toLowerCase() === status);
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const items = filtered.slice(start, start + perPage);

    return paginatedResponse(items, { page, per_page: perPage, total });
  }

  async getMyLeaveBalance(userId: string, query: Record<string, any>) {
    const actorId = toBigInt(userId);
    const year = Number(query.year ?? new Date().getFullYear());
    const leaveTypeKey = query.leave_type_key ? String(query.leave_type_key).trim().toLowerCase() : undefined;

    const where: Prisma.LeaveBalanceLedgerWhereInput = {
      userId: actorId,
      periodYear: year,
      ...(leaveTypeKey ? { leaveTypeKey } : {})
    };

    const [rows, aggregate] = await this.prisma.$transaction([
      this.prisma.leaveBalanceLedger.findMany({
        where,
        orderBy: { createdAt: 'asc' }
      }),
      this.prisma.leaveBalanceLedger.groupBy({
        by: ['leaveTypeKey'],
        where,
        orderBy: { leaveTypeKey: 'asc' },
        _sum: { deltaDays: true }
      })
    ]);

    const entitlements = await this.resolveLeaveEntitlements(actorId, year);
    const aggregateByKey = new Map<string, number>();
    for (const entry of aggregate) {
      aggregateByKey.set(entry.leaveTypeKey, Number(entry._sum?.deltaDays ?? 0));
    }

    const summaryKeys = new Set<string>([
      ...Object.keys(entitlements),
      ...Array.from(aggregateByKey.keys())
    ]);
    if (leaveTypeKey) summaryKeys.add(leaveTypeKey);

    const summary = Array.from(summaryKeys)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => {
        const entitled = Number(entitlements[key] ?? 0);
        const delta = Number(aggregateByKey.get(key) ?? 0);
        return {
          leave_type_key: key,
          entitled_days: entitled,
          ledger_delta_days: delta,
          available_days: entitled + delta
        };
      })
      .filter((item) => (!leaveTypeKey ? true : item.leave_type_key === leaveTypeKey));

    return {
      user_id: actorId.toString(),
      year,
      summary,
      entries: rows.map((row) => ({
        id: row.id,
        leave_type_key: row.leaveTypeKey,
        period_year: row.periodYear,
        delta_days: Number(row.deltaDays),
        entry_type: row.entryType,
        notes: row.notes,
        source_request_id: row.sourceRequestId?.toString() ?? null,
        created_at: row.createdAt
      }))
    };
  }

  async getApprovalHistory(id: string, _userId: string) {
    const request = await this.getRequestOrThrow(id);
    if (!request.workflowInstanceId) return [];
    return this.prisma.workflowHistory.findMany({
      where: { instanceId: request.workflowInstanceId }
    });
  }

  async getRequestThread(id: string, _userId: string) {
    return this.documentGenerator.fetchThread(id);
  }

  async getActions(id: string, userId: string) {
    const request = await this.getRequestOrThrow(id);
    const isOwner = request.createdBy === toBigInt(userId);

    if (['draft', 'returned'].includes(request.status)) return isOwner ? ['submit'] : [];
    if (['sent', 'approval'].includes(request.status)) {
      const canAct = await this.isPendingApprovalForUser(id, userId);
      return canAct ? ['approve', 'reject', 'return'] : [];
    }
    if (request.status === 'cleared') return ['disburse'];
    if (request.status === 'disbursed') return ['confirm'];
    if (request.status === 'confirmed') return ['retire'];
    if (request.status === 'retired') return ['retire', 'complete'];
    return [];
  }
  async downloadByAction(id: string, userId: string, dto: DownloadRequestDto) {
    const action = dto.action ?? 'request_pdf';
    const ids: DocumentIds = {
      requestId: id,
      voucherId: dto.voucher_id,
      options: {
        signature_file_id: dto.signature_file_id,
        staff_name: dto.staff_name,
        request_label: dto.request_label,
        voucher_number: dto.voucher_number,
        amount_label: dto.amount_label,
        declaration: dto.declaration,
        reason: dto.reason,
        issued_at: dto.issued_at,
      },
    };

    switch (action) {
      case 'request_pdf':
        return this.documentGenerator.generate(new RequestPdfDocument(this.documentGenerator), ids, userId);

      case 'pv_pdf':
        return this.documentGenerator.generate(new PaymentVoucherDocument(this.documentGenerator), ids, userId);

      case 'request_with_attachments':
        return this.documentGenerator.generate(new RequestWithAttachmentsDocument(this.documentGenerator), ids, userId);

      case 'pv_with_attachments':
        if (!dto.voucher_id) throw new BadRequestException('voucher_id is required for pv_with_attachments');
        return this.documentGenerator.generate(new PVWithAttachmentsDocument(this.documentGenerator), ids, userId);

      case 'full_document':
        return this.documentGenerator.generate(new FullDocumentDocument(this.documentGenerator), ids, userId);

      case 'certificate_of_honor_pdf':
        return this.documentGenerator.generate(new CertificateOfHonorDocument(this.documentGenerator), ids, userId);

      case 'full_package': {
        const deliveryMode = dto.delivery ?? 'download';
        if (deliveryMode === 'email') {
          const request = await this.documentGenerator.fetchRequest(id);
          const requestNumber = this.documentGenerator.getRequestNumber(
            request.requestType.codePrefix,
            request.createdAt.getFullYear(),
            request.id,
          );
          return this.documentGenerator.generateWithEmailDelivery(
            new FullPackageDocument(this.documentGenerator),
            ids,
            userId,
            { mode: 'email', email_to: dto.email_to, requestNumber, creatorEmail: request.creator.email },
          );
        }
        return this.documentGenerator.generate(new FullPackageDocument(this.documentGenerator), ids, userId);
      }

      default:
        throw new BadRequestException('Invalid download action');
    }
  }

  async confirmDisbursement(id: string, userId: string) {
    const request = await this.getRequestOrThrow(id);
    if (request.createdBy !== toBigInt(userId)) {
      throw new BadRequestException('Only owner can confirm disbursement');
    }
    if (request.status !== 'disbursed') {
      throw new BadRequestException('Request is not disbursed');
    }

    const updated = await this.transitionRequestStatus(request, 'confirmed', userId, {
      action: 'confirm_disbursement'
    });

    await this.syncBudgetCommitmentForRequest(updated);

    const formattedRequestNumber = await this.getFormattedRequestNumber(request.id);
    const confirmationMessage = `Request #${request.id.toString()} was confirmed by requester.`;
    const requesterNotificationChannels = await this.buildRequestNotificationChannels({
      requestId: request.id,
      audience: 'requester',
      message: confirmationMessage
    });
    await this.notificationsService.create({
      userId,
      type: 'success',
      title: 'Disbursement confirmed',
      message: confirmationMessage,
      ...requesterNotificationChannels,
      data: { requestId: request.id.toString() },
      notifiableType: 'request',
      notifiableId: request.id,
      emailSubject: `Disbursement confirmed (${formattedRequestNumber})`,
      emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
    });

    return this.getRequest(updated.id.toString(), userId);
  }

  async confirmPaymentVoucher(id: string, voucherId: string, userId: string) {
    const request = await this.getRequestOrThrow(id);
    if (request.createdBy !== toBigInt(userId)) {
      throw new BadRequestException('Only owner can confirm disbursement');
    }
    const voucher = await this.prisma.financePaymentVoucher.findFirst({
      where: { requestId: request.id, id: voucherId }
    });
    if (!voucher) throw new NotFoundException('Payment voucher not found');

    const metadata =
      voucher.metadata && typeof voucher.metadata === 'object' && !Array.isArray(voucher.metadata)
        ? ({ ...(voucher.metadata as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    await this.prisma.financePaymentVoucher.update({
      where: { id: voucher.id },
      data: {
        metadata: {
          ...metadata,
          confirmed_by: userId,
          confirmed_at: new Date().toISOString()
        } as Prisma.InputJsonValue
      }
    });
    await this.logWorkflowEvent(request.workflowInstanceId, 'pv_confirmed', userId, {
      request_id: request.id.toString(),
      voucher_id: voucher.id,
      voucher_number: voucher.voucherNumber
    });

    const vouchers = await this.prisma.financePaymentVoucher.findMany({
      where: { requestId: request.id },
      select: { amount: true, grossAmount: true }
    });
    const requestTotal = Number(request.totalAmount ?? 0);
    const totalDisbursed = vouchers.reduce((sum, v) => {
      const val = v.grossAmount !== null ? Number(v.grossAmount) : Number(v.amount);
      return sum + val;
    }, 0);
    const shouldMoveToConfirmed = requestTotal > 0 ? totalDisbursed >= requestTotal : totalDisbursed > 0;

    if (request.status === 'disbursed' && shouldMoveToConfirmed) {
      const confirmed = await this.transitionRequestStatus(request, 'confirmed', userId, {
        action: 'confirm_disbursement'
      });
      await this.syncBudgetCommitmentForRequest(confirmed);
    }

    const formattedRequestNumber = await this.getFormattedRequestNumber(request.id);
    const voucherConfirmationMessage = `Voucher ${voucher.voucherNumber} confirmed.`;
    const requesterNotificationChannels = await this.buildRequestNotificationChannels({
      requestId: request.id,
      audience: 'requester',
      message: voucherConfirmationMessage
    });
    await this.notificationsService.create({
      userId,
      type: 'success',
      title: 'Disbursement confirmed',
      message: voucherConfirmationMessage,
      ...requesterNotificationChannels,
      data: { requestId: request.id.toString(), voucher_id: voucher.id },
      notifiableType: 'request',
      notifiableId: request.id,
      emailSubject: `Disbursement confirmed (${formattedRequestNumber})`,
      emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
    });

    return this.getRequest(request.id.toString(), userId);
  }

  async retire(id: string, userId: string, dto: RetireRequestDto) {
    const request = await this.getRequestOrThrow(id);
    if (request.createdBy !== toBigInt(userId)) {
      throw new BadRequestException('Only owner can retire request');
    }
    if (!['confirmed', 'disbursed', 'retired'].includes(request.status)) {
      throw new BadRequestException('Request cannot be retired in current status');
    }

    if (dto.retirement_file_ids?.length) {
      await this.ensureFileAssetsExist(this.prisma, dto.retirement_file_ids);
    }

    if (request.status === 'retired') {
      const resetWhere = dto.voucher_id
        ? { requestId: request.id, id: dto.voucher_id }
        : { requestId: request.id };
      await this.prisma.financePaymentVoucher.updateMany({
        where: resetWhere,
        data: { retiredAmount: 0, retirementStatus: 'not_retired' }
      });
    }

    const retirementResult = await this.applyRetirementToPaymentVouchers(request.id, dto);
    const shouldMarkRetired = retirementResult.outstanding_after <= 0;
    const nextStatus = shouldMarkRetired ? 'retired' : request.status;
    const retirementAction = shouldMarkRetired ? 'retire' : 'retire_partial';

    const updated = await this.prisma.requestInstance.update({
      where: { id: request.id },
      data: {
        status: nextStatus as any,
        data: this.withRetirementData(
          this.withStateEvent(request.data, {
            from: request.status,
            to: nextStatus,
            action: retirementAction,
            by: userId,
            comment: dto.notes
          }),
          dto
        )
      }
    });
    await this.syncBudgetCommitmentForRequest(updated);
    for (const touched of retirementResult.touched_vouchers) {
      await this.logWorkflowEvent(request.workflowInstanceId, 'pv_retired', userId, {
        request_id: request.id.toString(),
        voucher_id: touched.id,
        voucher_number: touched.voucher_number,
        retired_amount: touched.allocated
      });
    }
    const formattedRequestNumber = await this.getFormattedRequestNumber(request.id);
    const retirementMessage = `Retirement submitted for request #${request.id.toString()}.`;
    const requesterNotificationChannels = await this.buildRequestNotificationChannels({
      requestId: request.id,
      audience: 'requester',
      message: retirementMessage,
      comment: dto.notes
    });
    await this.notificationsService.create({
      userId,
      type: 'info',
      title: 'Retirement submitted',
      message: retirementMessage,
      ...requesterNotificationChannels,
      data: {
        requestId: request.id.toString(),
        voucher_id: dto.voucher_id ?? null,
        retired_amount: dto.retired_amount ?? null,
        outstanding_after: retirementResult.outstanding_after
      },
      notifiableType: 'request',
      notifiableId: request.id,
      emailSubject: `Retirement submitted (${formattedRequestNumber})`,
      emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
    });

    return this.getRequest(updated.id.toString(), userId);
  }

  async verifyRetirement(id: string, _userId: string) {
    const request = await this.getRequestOrThrow(id);
    const vouchers = await this.prisma.financePaymentVoucher.findMany({
      where: { requestId: request.id },
      orderBy: { disbursedAt: 'asc' }
    });
    if (vouchers.length === 0) {
      throw new BadRequestException('No payment vouchers found for this request');
    }

    const requestTotal = Number(request.totalAmount ?? 0);
    const totalDisbursed = vouchers.reduce((sum, voucher) => {
      const val = voucher.grossAmount !== null ? Number(voucher.grossAmount) : Number(voucher.amount);
      return sum + val;
    }, 0);
    if (requestTotal > 0 && totalDisbursed < requestTotal) {
      throw new BadRequestException('Cannot complete request until total disbursement equals request total');
    }

    const retirementOutstanding = vouchers.reduce(
      (sum, voucher) => sum + Math.max(0, Number(voucher.amount) - Number(voucher.retiredAmount)),
      0
    );
    const totalRefunded = vouchers.reduce((sum, voucher) => {
      const meta = (voucher.metadata ?? {}) as Record<string, unknown>;
      const breakdown = (meta.breakdown ?? {}) as Record<string, unknown>;
      const refund = (breakdown.refund ?? {}) as Record<string, unknown>;
      return sum + (typeof refund.refund_amount === 'number' ? refund.refund_amount : 0);
    }, 0);
    const deductionAgg = await this.prisma.financeRequestDeduction.aggregate({
      where: { requestId: request.id },
      _sum: { amount: true }
    });
    const totalDeducted = Number(deductionAgg._sum.amount ?? 0);
    if (retirementOutstanding - totalDeducted - totalRefunded > 0.009) {
      throw new BadRequestException('Cannot complete request until all payment vouchers are fully retired');
    }

    const vouchersToVerify = vouchers.filter((voucher) => voucher.retirementStatus === 'retired');
    if (vouchersToVerify.length > 0) {
      await this.prisma.financePaymentVoucher.updateMany({
        where: { id: { in: vouchersToVerify.map((voucher) => voucher.id) } },
        data: {
          retirementStatus: 'verified',
          verifiedAt: new Date()
        }
      });
    }

    const hasUnverified = vouchers.some(
      (voucher) => !['verified'].includes(voucher.retirementStatus) && voucher.retirementStatus !== 'retired'
    );
    if (hasUnverified) {
      throw new BadRequestException('Cannot complete request until all payment vouchers are verified');
    }

    const updated = await this.transitionRequestStatus(request, 'completed', _userId, {
      action: 'complete'
    });

    await this.syncBudgetCommitmentForRequest(updated);

    for (const voucher of vouchersToVerify) {
      await this.logWorkflowEvent(request.workflowInstanceId, 'pv_verified', _userId, {
        request_id: request.id.toString(),
        voucher_id: voucher.id,
        voucher_number: voucher.voucherNumber
      });
      const formattedRequestNumber = await this.getFormattedRequestNumber(request.id);
      const verificationMessage = `Voucher ${voucher.voucherNumber} retirement has been verified.`;
      const requesterNotificationChannels = await this.buildRequestNotificationChannels({
        requestId: request.id,
        audience: 'requester',
        message: verificationMessage
      });
      await this.notificationsService.create({
        userId: request.createdBy,
        type: 'success',
        title: 'Retirement verified',
        message: verificationMessage,
        ...requesterNotificationChannels,
        data: { requestId: request.id.toString(), voucher_id: voucher.id, voucher_number: voucher.voucherNumber },
        notifiableType: 'request',
        notifiableId: request.id,
        emailSubject: `Retirement verified (${formattedRequestNumber})`,
        emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
      });
    }

    return this.getRequest(updated.id.toString(), _userId);
  }

  private async validateBudgetSelection(
    data: Record<string, any>,
    context: { team_id?: string; organization_id?: string; project_id?: string }
  ) {
    if (!data.budget_id && !data.budget_line_id) return null;
    if (!data.budget_id || !data.budget_line_id) {
      throw new BadRequestException('budget_id and budget_line_id must be provided together');
    }

    const budget = await this.prisma.financeBudget.findUnique({
      where: { id: String(data.budget_id) },
      include: {
        currentActiveRevision: {
          include: { lines: true },
        },
      },
    });
    if (!budget || budget.status !== 'approved' || !budget.currentActiveRevision) {
      throw new BadRequestException('Selected budget is not approved');
    }
    if (budget.teamId && context.team_id !== budget.teamId.toString()) {
      throw new BadRequestException('Budget scope does not match request team');
    }
    if (budget.organizationId && context.organization_id && context.organization_id !== budget.organizationId.toString()) {
      throw new BadRequestException('Budget scope does not match request organization');
    }
    if (budget.projectId && context.project_id !== budget.projectId.toString()) {
      throw new BadRequestException('Budget scope does not match request project');
    }

    const line = budget.currentActiveRevision.lines.find((entry) => entry.id === String(data.budget_line_id));
    if (!line) throw new BadRequestException('Invalid budget_line_id');

    return {
      budgetId: budget.id,
      budgetRevisionId: budget.currentActiveRevision.id,
      budgetLineId: line.id,
      amount: Number(line.totalAmount ?? line.amount ?? 0),
    };
  }

  private withBudgetSelection(data: Record<string, any>, selection: { budgetId: string; budgetRevisionId: string; budgetLineId: string } | null) {
    const base = { ...data } as Record<string, unknown>;
    if (!selection) return base as Prisma.InputJsonValue;
    return {
      ...base,
      budget_id: selection.budgetId,
      budget_revision_id: selection.budgetRevisionId,
      budget_line_id: selection.budgetLineId,
    } as Prisma.InputJsonValue;
  }

  private async syncBudgetCommitmentForRequest(request: {
    id: bigint;
    status: string;
    totalAmount?: Prisma.Decimal | number | null;
    data?: unknown;
  }) {
    const data = request.data && typeof request.data === 'object' && !Array.isArray(request.data)
      ? (request.data as Record<string, any>)
      : {};

    if (!data.budget_id || !data.budget_line_id || !data.budget_revision_id) {
      await this.prisma.financeBudgetCommitment.updateMany({
        where: { requestId: request.id },
        data: { status: 'released', actualizedAmount: null },
      });
      return;
    }

    const requestStatus = String(request.status);
    const status = ['payment_processing', 'disbursed', 'confirmed', 'retired', 'completed'].includes(requestStatus)
      ? 'consumed'
      : ['sent', 'approval', 'approved', 'cleared'].includes(requestStatus)
        ? 'reserved'
        : 'released';
    const amount = Number(request.totalAmount ?? 0);

    await this.prisma.financeBudgetCommitment.upsert({
      where: {
        unique_request_budget_line_commitment: {
          requestId: request.id,
          budgetLineId: String(data.budget_line_id),
        },
      },
      update: {
        status,
        committedAmount: amount,
        actualizedAmount: status === 'consumed' ? amount : null,
      },
      create: {
        budgetId: String(data.budget_id),
        budgetRevisionId: String(data.budget_revision_id),
        budgetLineId: String(data.budget_line_id),
        requestId: request.id,
        status,
        committedAmount: amount,
        actualizedAmount: status === 'consumed' ? amount : null,
      },
    });
  }

  private async getRequestOrThrow(id: string) {
    const request = await this.prisma.requestInstance.findUnique({
      where: { id: toBigInt(id) }
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  private async hasEligibleHandoverColleague(userId: bigint): Promise<boolean> {
    const memberships = await this.prisma.groupUser.findMany({
      where: { userId },
      select: { groupId: true }
    });
    if (!memberships.length) return false;
    const colleague = await this.prisma.groupUser.findFirst({
      where: {
        groupId: { in: memberships.map((m) => m.groupId) },
        userId: { not: userId }
      },
      select: { id: true }
    });
    return Boolean(colleague);
  }

  private async validateLeaveRequestPayload(
    requestType: { name?: string | null; taxonomyKeys?: string[] | null; formSchema?: unknown } | null,
    data: unknown,
    userId: string
  ) {
    if (!this.isLeaveRequestType(requestType?.name ?? null, (requestType?.taxonomyKeys as string[] | null) ?? null, requestType?.formSchema)) {
      return;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new BadRequestException('Leave request data is required');
    }

    const payload = data as Record<string, unknown>;
    const schema =
      requestType?.formSchema && typeof requestType.formSchema === 'object' && !Array.isArray(requestType.formSchema)
        ? (requestType.formSchema as Record<string, unknown>)
        : {};
    const reason = String(payload.leave_reason ?? payload.reason_for_leave ?? payload.purpose ?? '').trim();
    const handoverUserId = String(payload.handover_user_id ?? '').trim();
    const handoverNotes = String(payload.handover_notes ?? '').trim();
    const startDateValue = String(payload.start_date ?? '').trim();
    const endDateValue = String(payload.end_date ?? '').trim();
    const minNoticeDays = Number(schema.min_notice_days ?? 0);
    const maxDaysPerRequest = Number(schema.max_days_per_request ?? 0);
    const allowHalfDay = Boolean(schema.allow_half_day ?? false);
    const daysRequestedRaw = Number(payload.days_requested ?? payload.days ?? 0);
    const daysRequested = Number.isFinite(daysRequestedRaw) && daysRequestedRaw > 0
      ? daysRequestedRaw
      : this.computeLeaveDays(startDateValue, endDateValue);

    if (!reason) throw new BadRequestException('Leave reason is required');
    if (!startDateValue || !endDateValue) throw new BadRequestException('Leave start and end dates are required');
    if (daysRequested <= 0) throw new BadRequestException('Leave days requested must be greater than zero');
    if (!allowHalfDay && !Number.isInteger(daysRequested)) {
      throw new BadRequestException('Half-day leave is not allowed for this leave type');
    }
    if (Number.isFinite(maxDaysPerRequest) && maxDaysPerRequest > 0 && daysRequested > maxDaysPerRequest) {
      throw new BadRequestException(`This leave type allows maximum ${maxDaysPerRequest} day(s) per request`);
    }
    if (Number.isFinite(minNoticeDays) && minNoticeDays > 0) {
      const startDate = new Date(startDateValue);
      if (!Number.isNaN(startDate.getTime())) {
        startDate.setHours(0, 0, 0, 0);
        const threshold = new Date();
        threshold.setHours(0, 0, 0, 0);
        threshold.setDate(threshold.getDate() + minNoticeDays);
        if (startDate < threshold) {
          throw new BadRequestException(`Leave must be requested at least ${minNoticeDays} day(s) in advance`);
        }
      }
    }
    if (handoverUserId && handoverUserId === String(toBigInt(userId))) {
      throw new BadRequestException('Handover colleague cannot be yourself');
    }
    if (!handoverUserId) {
      const hasColleague = await this.hasEligibleHandoverColleague(toBigInt(userId));
      if (hasColleague) throw new BadRequestException('Handover colleague is required');
    } else if (!handoverNotes) {
      throw new BadRequestException('Handover notes are required');
    }
  }

  private async applyLeaveDebitIfNeeded(requestId: bigint, actorId: string) {
    const leave = await this.getLeaveRequestMeta(requestId);
    if (!leave) return;

    const existingDebit = await this.prisma.leaveBalanceLedger.findFirst({
      where: {
        sourceRequestId: requestId,
        entryType: 'request_debit'
      }
    });
    if (existingDebit) return;

    await this.ensureLeaveBalanceForApproval(requestId);

    await this.prisma.leaveBalanceLedger.create({
      data: {
        userId: leave.user_id,
        leaveTypeKey: leave.leave_type_key,
        periodYear: leave.period_year,
        deltaDays: -leave.days_requested,
        entryType: 'request_debit',
        sourceRequestId: requestId,
        notes: `Leave approved for request ${requestId.toString()}`,
        createdBy: toBigInt(actorId),
        metadata: {
          request_id: requestId.toString(),
          leave_type_key: leave.leave_type_key
        } as Prisma.InputJsonValue
      }
    });
  }

  private async ensureLeaveBalanceForApproval(requestId: bigint) {
    const leave = await this.getLeaveRequestMeta(requestId);
    if (!leave) return;

    const existingDebit = await this.prisma.leaveBalanceLedger.findFirst({
      where: {
        sourceRequestId: requestId,
        entryType: 'request_debit'
      }
    });
    if (existingDebit) return;

    const request = await this.prisma.requestInstance.findUnique({
      where: { id: requestId },
      select: { data: true }
    });
    const requestData = request?.data && typeof request.data === 'object' && !Array.isArray(request.data) ? (request.data as any) : {};
    if (requestData.is_special_request === true) return;

    const entitlements = await this.resolveLeaveEntitlements(leave.user_id, leave.period_year);
    const entitledDays = Number(entitlements[leave.leave_type_key] ?? 0);

    const aggregate = await this.prisma.leaveBalanceLedger.aggregate({
      where: {
        userId: leave.user_id,
        leaveTypeKey: leave.leave_type_key,
        periodYear: leave.period_year
      },
      _sum: { deltaDays: true }
    });
    const ledgerDelta = Number(aggregate._sum.deltaDays ?? 0);
    const availableDays = entitledDays + ledgerDelta;
    if (availableDays < leave.days_requested) {
      throw new BadRequestException(
        `Insufficient leave balance for ${leave.leave_type_key}. Available ${availableDays}, requested ${leave.days_requested}`
      );
    }
  }

  private async revertLeaveDebitIfNeeded(requestId: bigint, actorId: string, reason: string) {
    const debit = await this.prisma.leaveBalanceLedger.findFirst({
      where: {
        sourceRequestId: requestId,
        entryType: 'request_debit'
      }
    });
    if (!debit) return;

    const existingReversal = await this.prisma.leaveBalanceLedger.findFirst({
      where: {
        sourceRequestId: requestId,
        entryType: 'reversal'
      }
    });
    if (existingReversal) return;

    await this.prisma.leaveBalanceLedger.create({
      data: {
        userId: debit.userId,
        leaveTypeKey: debit.leaveTypeKey,
        periodYear: debit.periodYear,
        deltaDays: Math.abs(Number(debit.deltaDays)),
        entryType: 'reversal',
        sourceRequestId: requestId,
        notes: `Leave debit reversed: ${reason}`,
        createdBy: toBigInt(actorId),
        metadata: {
          request_id: requestId.toString(),
          reason
        } as Prisma.InputJsonValue
      }
    });
  }

  private async getLeaveRequestMeta(requestId: bigint): Promise<{
    user_id: bigint;
    leave_type_key: string;
    days_requested: number;
    period_year: number;
  } | null> {
    const request = await this.prisma.requestInstance.findUnique({
      where: { id: requestId },
      include: {
        requestType: { select: { name: true, taxonomyKeys: true, formSchema: true } }
      }
    });
    if (!request) return null;
    if (
      !this.isLeaveRequestType(
        request.requestType?.name ?? null,
        request.requestType?.taxonomyKeys as string[] | null,
        request.requestType?.formSchema ?? null
      )
    ) {
      return null;
    }

    const data =
      request.data && typeof request.data === 'object' && !Array.isArray(request.data)
        ? (request.data as Record<string, unknown>)
        : {};
    const leaveTypeRaw = this.resolveLeaveTypeKey(
      data,
      request.requestType?.name ?? null,
      request.requestType?.formSchema ?? null
    );

    let daysRequested = Number(data.days_requested ?? data.days ?? 0);
    if (!Number.isFinite(daysRequested) || daysRequested <= 0) {
      daysRequested = this.computeLeaveDays(String(data.start_date ?? ''), String(data.end_date ?? ''));
    }
    if (!Number.isFinite(daysRequested) || daysRequested <= 0) return null;

    const startDate = data.start_date ? new Date(String(data.start_date)) : request.createdAt;
    const year = startDate.getFullYear();

    return {
      user_id: request.createdBy,
      leave_type_key: leaveTypeRaw,
      days_requested: Number(daysRequested.toFixed(2)),
      period_year: year
    };
  }

  private computeLeaveDays(startDateValue: string, endDateValue: string) {
    const start = startDateValue ? new Date(startDateValue) : null;
    const end = endDateValue ? new Date(endDateValue) : null;
    if (!start || !end) return 0;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    if (end < start) return 0;
    let workingDays = 0;
    const cursor = new Date(start.getTime());
    while (cursor.getTime() <= end.getTime()) {
      const dayOfWeek = cursor.getUTCDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return workingDays;
  }

  private async resolveLeaveEntitlements(userId?: bigint, year = new Date().getFullYear()) {
    const { entitlements, carryoverCaps } = await this.getDefaultLeaveRulesFromRequestTypes();
    const now = new Date();
    const context = userId ? await this.resolvePolicyContextForUser(userId) : null;

    const rows = await this.prisma.policy.findMany({
      where: {
        module: 'leave',
        policyKey: { in: ['leave_entitlements', 'entitlement'] },
        NOT: { scopeType: 'global' },
        isActive: true,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }]
      },
      orderBy: [{ scopeType: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }]
    });

    const matched = rows
      .filter((row) => {
        if (!context) return row.scopeType === 'global';
        return this.policyScopeMatches(row.scopeType, row.scopeId, context);
      })
      .sort((a, b) => {
        const rankDelta = this.policyScopeRank(a.scopeType) - this.policyScopeRank(b.scopeType);
        if (rankDelta !== 0) return rankDelta;
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    for (const row of matched) {
      const cfg =
        row.configJson && typeof row.configJson === 'object' && !Array.isArray(row.configJson)
          ? (row.configJson as Record<string, unknown>)
          : {};
      for (const [key, value] of Object.entries(cfg)) {
        const n = Number(value ?? 0);
        if (!Number.isFinite(n) || n < 0) continue;
        entitlements[String(key).toLowerCase()] = n;
      }
    }

    if (userId && Number.isFinite(year) && year > 2000) {
      const previousYear = year - 1;
      const previousDeltaRows = await this.prisma.leaveBalanceLedger.groupBy({
        by: ['leaveTypeKey'],
        where: {
          userId,
          periodYear: previousYear
        },
        _sum: {
          deltaDays: true
        }
      });
      const previousDeltaByKey = new Map(
        previousDeltaRows.map((row) => [row.leaveTypeKey, Number(row._sum?.deltaDays ?? 0)])
      );
      const baseEntitlements = { ...entitlements };

      for (const [key, capRaw] of Object.entries(carryoverCaps)) {
        const cap = Number(capRaw ?? 0);
        if (!Number.isFinite(cap) || cap <= 0) continue;
        const previousAvailable = Number(baseEntitlements[key] ?? 0) + Number(previousDeltaByKey.get(key) ?? 0);
        const carry = Math.min(cap, Math.max(previousAvailable, 0));
        entitlements[key] = Number(entitlements[key] ?? 0) + carry;
      }
    }

    return entitlements;
  }

  private isLeaveRequestType(name: string | null, taxonomyKeys: string[] | null, formSchema: unknown) {
    const normalizedName = String(name ?? '').toLowerCase();
    const normalizedCategory = String(taxonomyKeys?.[0] ?? '').toLowerCase();
    const schema =
      formSchema && typeof formSchema === 'object' && !Array.isArray(formSchema)
        ? (formSchema as Record<string, unknown>)
        : {};
    const schemaLeaveTypeKey = String(schema.leave_type_key ?? '').trim().toLowerCase();
    return (
      normalizedCategory.includes('leave') ||
      normalizedName.includes('leave') ||
      schemaLeaveTypeKey.length > 0
    );
  }

  private resolveLeaveTypeKey(data: Record<string, unknown>, requestTypeName: string | null, formSchema: unknown) {
    const schema =
      formSchema && typeof formSchema === 'object' && !Array.isArray(formSchema)
        ? (formSchema as Record<string, unknown>)
        : {};
    const fromPayload = String(data.leave_type_key ?? data.leave_type ?? '').trim().toLowerCase();
    if (fromPayload) return fromPayload;
    const fromSchema = String(schema.leave_type_key ?? '').trim().toLowerCase();
    if (fromSchema) return fromSchema;
    const fromName = String(requestTypeName ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return fromName || 'annual_leave';
  }

  private async getDefaultLeaveRulesFromRequestTypes() {
    const types = await this.prisma.requestType.findMany({
      where: { isActive: true },
      select: {
        name: true,
        taxonomyKeys: true,
        formSchema: true
      }
    });

    const defaults: Record<string, number> = {};
    const carryoverCaps: Record<string, number> = {};
    for (const type of types) {
      if (!this.isLeaveRequestType(type.name, type.taxonomyKeys as string[] | null, type.formSchema)) continue;
      const schema =
        type.formSchema && typeof type.formSchema === 'object' && !Array.isArray(type.formSchema)
          ? (type.formSchema as Record<string, unknown>)
          : {};
      const key = this.resolveLeaveTypeKey({}, type.name, schema);
      if (!key) continue;
      const entitled = Number(schema.entitled_days_per_year ?? 0);
      defaults[key] = Number.isFinite(entitled) && entitled > 0 ? entitled : 0;
      const carryover = Number(schema.max_carryover_days ?? 0);
      carryoverCaps[key] = Number.isFinite(carryover) && carryover > 0 ? carryover : 0;
    }

    return {
      entitlements: defaults,
      carryoverCaps
    };
  }

  private async resolvePolicyContextForUser(userId: bigint) {
    const [profile, primaryTeam] = await this.prisma.$transaction([
      this.prisma.profile.findUnique({
        where: { id: userId },
        include: {
          employeeProfile: { select: { employmentType: true } }
        }
      }),
      this.prisma.groupUser.findFirst({
        where: { userId, isPrimary: true },
        select: { groupId: true }
      })
    ]);

    return {
      user_id: userId.toString(),
      organization_id: profile?.primaryOrganizationId?.toString(),
      team_id: primaryTeam?.groupId?.toString(),
      staff_type: profile?.employeeProfile?.employmentType ?? undefined
    };
  }

  private policyScopeMatches(
    scopeType: string,
    scopeId: string | null,
    context: { organization_id?: string; team_id?: string; staff_type?: string; user_id?: string }
  ) {
    if (scopeType === 'global') return true;
    if (!scopeId) return false;
    if (scopeType === 'organization') return context.organization_id === scopeId;
    if (scopeType === 'team') return context.team_id === scopeId;
    if (scopeType === 'staff_type') return context.staff_type === scopeId;
    if (scopeType === 'user') return context.user_id === scopeId;
    return false;
  }

  private policyScopeRank(scopeType: string) {
    if (scopeType === 'global') return 0;
    if (scopeType === 'organization') return 1;
    if (scopeType === 'team') return 2;
    if (scopeType === 'staff_type') return 3;
    if (scopeType === 'user') return 4;
    return 99;
  }

  private serializeRequest(request: any): RequestResponseDto {
    const createdAt = new Date(request.createdAt);
    const requestNumber = this.getRequestNumber(request.requestType?.codePrefix, request.createdAt.getFullYear(), request.id);
    const voucherNumber = this.extractVoucherNumber(request.data);

    return {
      id: request.id.toString(),
      status: request.status,
      request_type_id: request.requestTypeId,
      group_id: request.groupId,
      organization_id: request.organizationId ? request.organizationId.toString() : null,
      workflow_instance_id: request.workflowInstanceId ?? null,
      created_by: request.createdBy.toString(),
      team_id: request.teamId ? request.teamId.toString() : null,
      currency: request.currency,
      request_number: requestNumber,
      voucher_number: voucherNumber,
      total_amount: request.totalAmount !== null ? Number(request.totalAmount) : null,
      data: request.data,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
      request_type: request.requestType
        ? {
            id: request.requestType.id,
            name: request.requestType.name,
            code_prefix: request.requestType.codePrefix,
            category_code: request.requestType.category?.code ?? null,
            taxonomy_keys: request.requestType.taxonomyKeys ?? null,
            workflow_type: request.requestType.workflowType ?? null,
            handler_role_label: request.requestType.handlerRoleLabel ?? null,
            approval_flow_json: request.requestType.approvalFlowJson ?? null,
            form_schema: request.requestType.formSchema ?? null
          }
        : undefined,
      group: request.group
        ? {
            id: request.group.id,
            name: request.group.name,
            code: request.group.code
          }
        : undefined,
      creator: request.creator
        ? {
            id: request.creator.id.toString(),
            username: request.creator.username,
            email: request.creator.email,
            first_name: request.creator.firstName,
            last_name: request.creator.lastName
          }
        : undefined,
      organization: request.organization
        ? {
            id: request.organization.id.toString(),
            name: request.organization.name,
            code: request.organization.code
          }
        : null,
      team: request.team
        ? {
            id: request.team.id.toString(),
            name: request.team.name
          }
        : null,
      items: (request.items ?? []).map((item: any) => {
        const files = Array.from(
          new Map(
            [
              ...(item.files ?? []).map((attachment: any) => attachment.file).filter(Boolean),
              item.file ?? null
            ]
              .filter(Boolean)
              .map((file: any) => [
                file.id,
                {
                  id: file.id,
                  file_name: file.fileName,
                  mime_type: file.mimeType ?? null,
                  public_url: file.publicUrl ?? null,
                  storage_path: file.storagePath ?? null
                }
              ])
          ).values()
        );

        return {
          id: item.id,
          description: item.description,
          amount: Number(item.amount),
          quantity: item.quantity,
          file_id: item.fileId ?? null,
          category_id: item.categoryId ?? null,
          subcategory_id: item.subcategoryId ?? null,
          due_date: item.dueDate ?? null,
          notes: item.notes ?? null,
          bank_name: item.bankName ?? null,
          account_number: item.accountNumber ?? null,
          account_name: item.accountName ?? null,
          file: files[0] ?? null,
          files
        };
      })
    };
  }

  private getRequestNumber(codePrefix: string | undefined, year: number, requestId: bigint): string {
    const rawPrefix = (codePrefix || 'REQ').toUpperCase();
    const prefix = rawPrefix.includes('PC') ? 'PC' : rawPrefix.includes('OP') ? 'OP' : rawPrefix;
    return `${prefix}/${year}/${requestId.toString()}`;
  }

  private async getFormattedRequestNumber(requestId: bigint): Promise<string> {
    const request = await this.prisma.requestInstance.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        createdAt: true,
        data: true,
        requestType: { select: { codePrefix: true } }
      }
    });
    if (!request) return `REQ/${new Date().getFullYear()}/${requestId.toString()}`;

    return this.getRequestNumber(request.requestType?.codePrefix, request.createdAt.getFullYear(), request.id);
  }

  private getRequestThreadKey(requestNumber: string): string {
    return `request-${requestNumber.replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase()}`;
  }

  private getPortalBaseUrl(): string {
    return (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  private getRequestNotificationPath(requestId: bigint, audience: RequestNotificationAudience): string {
    const view = audience === 'approver' ? 'approvals' : 'mine';
    return `/requests/details?id=${requestId.toString()}&view=${view}`;
  }

  private async buildRequestNotificationChannels(input: {
    requestId: bigint;
    audience: RequestNotificationAudience;
    message: string;
    comment?: string | null;
  }) {
    const summary = await this.getRequestNotificationSummary(input.requestId);
    const link = this.getRequestNotificationPath(input.requestId, input.audience);
    const comment = String(input.comment ?? '').trim();
    return {
      link,
      emailPortalUrl: `${this.getPortalBaseUrl()}${link}`,
      emailCtaLabel: input.audience === 'approver' ? 'Review Request' : 'View Request',
      emailHtml: this.buildRequestNotificationEmailHtml({
        summary,
        message: input.message,
        audience: input.audience,
        comment: comment.length > 0 ? comment : undefined
      })
    };
  }

  private async getRequestNotificationSummary(requestId: bigint): Promise<RequestNotificationSummary> {
    const request = await this.prisma.requestInstance.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        createdAt: true,
        data: true,
        currency: true,
        totalAmount: true,
        items: { select: { amount: true, quantity: true } },
        requestType: { select: { name: true, codePrefix: true, taxonomyKeys: true, formSchema: true } },
        creator: {
          select: { firstName: true, lastName: true, username: true, email: true }
        }
      }
    });

    if (!request) {
      return {
        requestNumber: `REQ/${new Date().getFullYear()}/${requestId.toString()}`,
        requestTypeName: 'Request',
        requesterName: 'Unknown sender',
        requesterEmail: null,
        primaryMetricLabel: 'Amount',
        primaryMetricValue: '-'
      };
    }

    const requestNumber = this.getRequestNumber(
      request.requestType?.codePrefix,
      request.createdAt.getFullYear(),
      request.id
    );
    const requesterName =
      `${String(request.creator?.firstName ?? '').trim()} ${String(request.creator?.lastName ?? '').trim()}`.trim() ||
      request.creator?.username ||
      request.creator?.email ||
      'Unknown sender';
    const payload =
      request.data && typeof request.data === 'object' && !Array.isArray(request.data)
        ? (request.data as Record<string, unknown>)
        : {};
    const isLeaveRequest = this.isLeaveRequestType(
      request.requestType?.name ?? null,
      request.requestType?.taxonomyKeys as string[] | null,
      request.requestType?.formSchema
    );

    let primaryMetricLabel = 'Amount';
    let primaryMetricValue = '-';

    if (isLeaveRequest) {
      const daysRequestedRaw = Number(payload.days_requested ?? payload.days ?? 0);
      const startDateValue = String(payload.start_date ?? '').trim();
      const endDateValue = String(payload.end_date ?? '').trim();
      const daysRequested =
        Number.isFinite(daysRequestedRaw) && daysRequestedRaw > 0
          ? daysRequestedRaw
          : this.computeLeaveDays(startDateValue, endDateValue);

      primaryMetricLabel = 'No. of Days';
      primaryMetricValue = daysRequested > 0 ? `${daysRequested} day${daysRequested === 1 ? '' : 's'}` : '-';
    } else {
      const totalAmount =
        request.totalAmount !== null
          ? Number(request.totalAmount)
          : request.items.reduce((sum, item) => sum + Number(item.amount) * Number(item.quantity ?? 1), 0);
      primaryMetricValue = Number.isFinite(totalAmount) ? this.documentGenerator.formatMoney(totalAmount, request.currency || 'NGN') : '-';
    }

    return {
      requestNumber,
      requestTypeName: request.requestType?.name || 'Request',
      requesterName,
      requesterEmail: request.creator?.email ?? null,
      primaryMetricLabel,
      primaryMetricValue
    };
  }

  private buildRequestNotificationEmailHtml(input: {
    summary: RequestNotificationSummary;
    message: string;
    audience: RequestNotificationAudience;
    comment?: string;
  }): string {
    const actionHint =
      input.audience === 'approver'
        ? 'Please review this request and take action.'
        : 'Open this request in the portal to view full details.';
    const detailRows: Array<[string, string]> = [
      ['Request Number', input.summary.requestNumber],
      ['Request Type', input.summary.requestTypeName],
      ['Sender', input.summary.requesterName],
      ['Sender Email', input.summary.requesterEmail ?? '-'],
      [input.summary.primaryMetricLabel, input.summary.primaryMetricValue]
    ];

    return `
      <p style="margin:0 0 12px; color:#111827; line-height:1.7;">${this.documentGenerator.escapeHtml(input.message)}</p>
      <p style="margin:0 0 14px; color:#374151; line-height:1.6;">${this.documentGenerator.escapeHtml(actionHint)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
        ${detailRows
          .map(
            ([label, value]) =>
              `<tr><td style="width:34%; padding:10px 12px; border-bottom:1px solid #f1f5f9; background:#f8fafc; color:#334155; font-weight:600;">${this.documentGenerator.escapeHtml(label)}</td><td style="padding:10px 12px; border-bottom:1px solid #f1f5f9; color:#0f172a;">${this.documentGenerator.escapeHtml(value)}</td></tr>`
          )
          .join('')}
      </table>
      ${input.comment ? `<p style="margin:14px 0 0; color:#111827; line-height:1.7;"><strong>Comment:</strong> ${this.documentGenerator.escapeHtml(input.comment)}</p>` : ''}
    `;
  }

  private assertManualRequestIdRange(requestId: bigint) {
    if (requestId < MANUAL_REQUEST_ID_MIN || requestId > MANUAL_REQUEST_ID_MAX) {
      throw new BadRequestException(
        `Manual request_id must be between ${MANUAL_REQUEST_ID_MIN.toString()} and ${MANUAL_REQUEST_ID_MAX.toString()}`
      );
    }
  }

  private extractVoucherNumber(data: unknown): string | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const voucher = (data as Record<string, unknown>).voucher_number;
    return typeof voucher === 'string' ? voucher : null;
  }

  private async getApprovalSummary(instanceId: string) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        currentStep: {
          include: {
            approvers: true
          }
        },
        history: {
          orderBy: { createdAt: 'asc' }
        },
        workflow: {
          include: {
            steps: true
          }
        }
      }
    });

    if (!instance) return { done: [], pending: [] };

    const stepMap = new Map(instance.workflow.steps.map((step) => [step.id, step.name]));
    const performerIds = Array.from(
      new Set(
        instance.history
          .map((entry) => (entry.performedBy ? entry.performedBy.toString() : null))
          .filter((id): id is string => Boolean(id))
      )
    );
    const performers =
      performerIds.length > 0
        ? await this.prisma.profile.findMany({
            where: { id: { in: performerIds.map((id) => toBigInt(id)) } },
            select: { id: true, username: true, email: true, firstName: true, lastName: true }
          })
        : [];
    const performerMap = new Map(
      performers.map((user) => {
        const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
        return [user.id.toString(), { name: fullName || user.username || user.email, email: user.email ?? null }];
      })
    );

    const done = instance.history
      .filter((entry) => entry.action === 'approve' || entry.action === 'reject' || entry.action === 'auto_approve')
      .map((entry) => ({
        action: entry.action,
        step: entry.fromStepId ? stepMap.get(entry.fromStepId) ?? 'Unknown step' : 'Unknown step',
        performed_by: entry.performedBy ? entry.performedBy.toString() : null,
        performed_by_name: entry.performedBy ? (performerMap.get(entry.performedBy.toString())?.name ?? null) : null,
        performed_by_email: entry.performedBy ? (performerMap.get(entry.performedBy.toString())?.email ?? null) : null,
        comment: entry.comment,
        at: entry.createdAt
      }));

    const pending =
      instance.status === 'pending' && instance.currentStep
        ? instance.currentStep.approvers.map((approver) => ({
            step: instance.currentStep?.name ?? 'Current step',
            approver_type: approver.approverType,
            approver_id: approver.approverId
          }))
        : [];

    const required_steps = instance.workflow.steps
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        step: step.name,
        role: (step.config as Record<string, any>)?.role ?? null,
        approver: (step.config as Record<string, any>)?.approver ?? null,
      }));

    return { done, pending, required_steps };
  }

  private async ensureFileAssetsExist(tx: Prisma.TransactionClient | PrismaService, fileIds: string[]) {
    const count = await tx.fileAsset.count({
      where: { id: { in: fileIds } }
    });
    if (count !== fileIds.length) {
      throw new BadRequestException('One or more request item files are invalid');
    }
  }

  private async transitionRequestStatus(
    request: { id: bigint; status: string; data: unknown },
    nextStatus: string,
    actorId: string,
    details?: { action?: string; comment?: string }
  ) {
    return this.prisma.requestInstance.update({
      where: { id: request.id },
      data: {
        status: nextStatus as any,
        data: this.withStateEvent(request.data, {
          from: request.status,
          to: nextStatus,
          by: actorId,
          action: details?.action,
          comment: details?.comment
        })
      }
    });
  }

  private withStateEvent(
    data: unknown,
    event: { from: string; to: string; by: string; action?: string; comment?: string }
  ): Prisma.InputJsonValue {
    const base =
      data && typeof data === 'object' && !Array.isArray(data)
        ? ({ ...(data as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    const existing = Array.isArray(base.state_events) ? (base.state_events as unknown[]) : [];
    const stateEvent = {
      from: event.from,
      to: event.to,
      by: event.by,
      action: event.action ?? null,
      comment: event.comment ?? null,
      at: new Date().toISOString()
    };
    return {
      ...base,
      state_events: [...existing, stateEvent]
    } as Prisma.InputJsonValue;
  }

  private withRetirementData(data: Prisma.InputJsonValue, dto: RetireRequestDto): Prisma.InputJsonValue {
    const base =
      data && typeof data === 'object' && !Array.isArray(data)
        ? ({ ...(data as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    return {
      ...base,
      retirement: {
        voucher_id: dto.voucher_id ?? null,
        notes: dto.notes ?? null,
        retired_amount: dto.retired_amount ?? null,
        retirement_file_ids: dto.retirement_file_ids ?? [],
        breakdown: dto.breakdown ?? null,
        submitted_at: new Date().toISOString()
      }
    } as Prisma.InputJsonValue;
  }

  private async applyRetirementToPaymentVouchers(requestId: bigint, dto: RetireRequestDto) {
    const voucherWhere = dto.voucher_id
      ? { requestId, id: dto.voucher_id }
      : { requestId };
    const vouchers = await this.prisma.financePaymentVoucher.findMany({
      where: voucherWhere,
      orderBy: { disbursedAt: 'asc' }
    });
    if (vouchers.length === 0) {
      if (dto.voucher_id) throw new BadRequestException('Selected voucher does not exist on this request');
      return { outstanding_after: 0, touched_vouchers: [] as Array<{ id: string; voucher_number: string; allocated: number }> };
    }

    const totalVoucherBalance = vouchers.reduce(
      (sum, voucher) => sum + Math.max(0, Number(voucher.amount) - Number(voucher.retiredAmount)),
      0
    );
    if (dto.retired_amount !== undefined && dto.retired_amount > totalVoucherBalance) {
      throw new BadRequestException('Retirement amount exceeds selected voucher balance');
    }
    let remaining = dto.retired_amount ?? totalVoucherBalance;
    if (remaining <= 0) {
      const allVouchers = await this.prisma.financePaymentVoucher.findMany({ where: { requestId } });
      const outstanding = allVouchers.reduce(
        (sum, voucher) => sum + Math.max(0, Number(voucher.amount) - Number(voucher.retiredAmount)),
        0
      );
      return { outstanding_after: outstanding, touched_vouchers: [] as Array<{ id: string; voucher_number: string; allocated: number }> };
    }
    const touched: Array<{ id: string; voucher_number: string; allocated: number }> = [];

    for (const voucher of vouchers) {
      if (remaining <= 0) break;
      const currentRetired = Number(voucher.retiredAmount);
      const voucherAmount = Number(voucher.amount);
      const voucherBalance = Math.max(0, voucherAmount - currentRetired);
      if (voucherBalance <= 0) continue;

      const allocate = Math.min(voucherBalance, remaining);
      const nextRetired = currentRetired + allocate;
      const nextStatus =
        nextRetired >= voucherAmount ? 'retired' : nextRetired > 0 ? 'partial' : 'not_retired';

      await this.prisma.financePaymentVoucher.update({
        where: { id: voucher.id },
        data: {
          retiredAmount: nextRetired,
          retirementStatus: nextStatus,
          retiredAt: new Date(),
          metadata: {
            ...(voucher.metadata && typeof voucher.metadata === 'object' && !Array.isArray(voucher.metadata)
              ? (voucher.metadata as Record<string, unknown>)
              : {}),
            retirement_notes: dto.notes ?? null,
            retirement_file_ids: dto.retirement_file_ids ?? [],
            breakdown: dto.breakdown ?? null
          } as Prisma.InputJsonValue
        }
      });
      touched.push({ id: voucher.id, voucher_number: voucher.voucherNumber, allocated: allocate });

      remaining -= allocate;
    }

    const allVouchers = await this.prisma.financePaymentVoucher.findMany({ where: { requestId } });
    const outstanding = allVouchers.reduce(
      (sum, voucher) => sum + Math.max(0, Number(voucher.amount) - Number(voucher.retiredAmount)),
      0
    );
    return { outstanding_after: outstanding, touched_vouchers: touched };
  }

  private async isPendingApprovalForUser(requestId: string, userId: string) {
    const request = await this.prisma.requestInstance.findUnique({
      where: { id: toBigInt(requestId) },
      select: { workflowInstanceId: true, teamId: true, status: true }
    });
    if (!request?.workflowInstanceId || !['sent', 'approval'].includes(request.status)) return false;

    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: request.workflowInstanceId },
      include: { currentStep: { include: { approvers: true } } }
    });
    if (!instance || instance.status !== 'pending' || !instance.currentStep) return false;

    for (const approver of instance.currentStep.approvers) {
      if (await this.userMatchesCurrentApprover({ approverType: approver.approverType, approverId: approver.approverId }, request.teamId, userId)) return true;
    }

    return false;
  }

  private isWorkflowInactiveError(error: unknown) {
    const message = String((error as Error)?.message ?? '').toLowerCase();
    return message.includes('workflow instance is not active') || message.includes('workflow instance not found');
  }

  private async listCurrentApproverUserIds(requestId: bigint): Promise<string[]> {
    const request = await this.prisma.requestInstance.findUnique({
      where: { id: requestId },
      select: { teamId: true, workflowInstanceId: true }
    });
    if (!request?.workflowInstanceId) return [];
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: request.workflowInstanceId },
      include: { currentStep: { include: { approvers: true } } }
    });
    if (!instance?.currentStep || instance.status !== 'pending') return [];

    const userIds = new Set<string>();
    for (const approver of instance.currentStep.approvers) {
      const currentIds = await this.listUsersForCurrentApprover(
        { approverType: approver.approverType, approverId: approver.approverId },
        request.teamId,
      );
      for (const id of currentIds) userIds.add(id);
    }

    return Array.from(userIds);
  }

  private async userMatchesCurrentApprover(
    approver: { approverType: string; approverId: string | null },
    teamId: bigint | null,
    userId: string,
  ) {
    const approverType = String(approver.approverType || '').trim().toLowerCase();
    const approverId = String(approver.approverId || '').trim().toLowerCase();
    if (!approverId) return false;

    if (
      (approverType === 'relation' && approverId === 'requester_team_lead') ||
      (approverType === 'role' && approverId === 'team_lead')
    ) {
      if (!teamId) return false;
      return (
        (await this.prisma.groupUser.count({
          where: {
            groupId: teamId,
            userId: toBigInt(userId),
            role: GroupUserRole.moderator,
          },
        })) > 0
      );
    }

    if (
      (approverType === 'relation' && approverId === 'requester_team_lead_or_manager') ||
      (approverType === 'role' && (approverId === 'team_lead_or_manager' || approverId === 'manager'))
    ) {
      if (teamId) {
        const leadOrManager = await this.prisma.groupUser.count({
          where: {
            groupId: teamId,
            userId: toBigInt(userId),
            role: { in: [GroupUserRole.moderator, GroupUserRole.admin] },
          },
        });
        if (leadOrManager > 0) return true;
      }

      return (
        (await this.prisma.userRole.count({
          where: {
            profileId: toBigInt(userId),
            role: { slug: 'manager' },
          },
        })) > 0
      );
    }

    if (approverType === 'office' || approverType === 'role') {
      const roleSlugs =
        approverType === 'role' && approverId === 'accountant'
          ? ['accountant', 'finance_manager']
          : [approverId];
      const hasRole = await this.prisma.userRole.count({
        where: {
          profileId: toBigInt(userId),
          role: { slug: { in: roleSlugs } },
        },
      });
      if (hasRole > 0) return true;
    }

    if (
      approverType === 'permission' ||
      (approverType === 'role' && (approverId.includes('.') || approverId === 'accountant' || approverId === 'hr'))
    ) {
      const permissionSlug =
        approverType === 'permission'
          ? approverId
          : approverId === 'accountant'
            ? 'finance.approve'
            : approverId === 'hr'
              ? 'hr.approve'
              : approverId;

      const hasPermission = await this.prisma.rolePermission.count({
        where: {
          permission: { slug: permissionSlug },
          role: {
            users: {
              some: { profileId: toBigInt(userId) },
            },
          },
        },
      });
      if (hasPermission > 0) return true;


    }

    return false;
  }

  private async listUsersForCurrentApprover(
    approver: { approverType: string; approverId: string | null },
    teamId: bigint | null,
  ): Promise<string[]> {
    const approverType = String(approver.approverType || '').trim().toLowerCase();
    const approverId = String(approver.approverId || '').trim().toLowerCase();
    if (!approverId) return [];

    if (
      (approverType === 'relation' && approverId === 'requester_team_lead') ||
      (approverType === 'role' && approverId === 'team_lead')
    ) {
      if (!teamId) return [];
      const rows = await this.prisma.groupUser.findMany({
        where: { groupId: teamId, role: GroupUserRole.moderator },
        select: { userId: true },
      });
      return rows.map((row) => row.userId.toString());
    }

    if (
      (approverType === 'relation' && approverId === 'requester_team_lead_or_manager') ||
      (approverType === 'role' && (approverId === 'team_lead_or_manager' || approverId === 'manager'))
    ) {
      const ids = new Set<string>();
      if (teamId) {
        const rows = await this.prisma.groupUser.findMany({
          where: { groupId: teamId, role: { in: [GroupUserRole.moderator, GroupUserRole.admin] } },
          select: { userId: true },
        });
        for (const row of rows) ids.add(row.userId.toString());
      }

      const managers = await this.prisma.userRole.findMany({
        where: { role: { slug: 'manager' } },
        select: { profileId: true },
      });
      for (const row of managers) ids.add(row.profileId.toString());
      return Array.from(ids);
    }

    const ids = new Set<string>();

    if (approverType === 'office' || approverType === 'role') {
      const roleSlugs =
        approverType === 'role' && approverId === 'accountant'
          ? ['accountant', 'finance_manager']
          : [approverId];
      const directRoleUsers = await this.prisma.userRole.findMany({
        where: { role: { slug: { in: roleSlugs } } },
        select: { profileId: true },
      });
      for (const row of directRoleUsers) ids.add(row.profileId.toString());
    }

    if (
      approverType === 'permission' ||
      (approverType === 'role' && (approverId.includes('.') || approverId === 'accountant' || approverId === 'hr'))
    ) {
      const permissionSlug =
        approverType === 'permission'
          ? approverId
          : approverId === 'accountant'
            ? 'finance.approve'
            : approverId === 'hr'
              ? 'hr.approve'
              : approverId;
      const permissionUsers = await this.prisma.userRole.findMany({
        where: {
          role: {
            permissions: {
              some: { permission: { slug: permissionSlug } },
            },
          },
        },
        select: { profileId: true },
      });
      for (const row of permissionUsers) ids.add(row.profileId.toString());
    }

    return Array.from(ids);
  }

  private async notifyCurrentApprovers(
    requestId: bigint,
    message: string,
    emailSubject: string,
    excludedUserId?: string,
    comment?: string
  ) {
    const recipients = await this.listCurrentApproverUserIds(requestId);
    if (!recipients.length) return;
    const formattedRequestNumber = await this.getFormattedRequestNumber(requestId);
    const approverNotificationChannels = await this.buildRequestNotificationChannels({
      requestId,
      audience: 'approver',
      message,
      comment
    });
    for (const targetUserId of recipients) {
      if (excludedUserId && targetUserId === excludedUserId) continue;
      await this.notificationsService.create({
        userId: targetUserId,
        type: 'action',
        title: 'Request awaiting approval',
        message,
        ...approverNotificationChannels,
        data: { requestId: requestId.toString() },
        notifiableType: 'request',
        notifiableId: requestId,
        emailSubject,
        emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
      });
    }
  }

  private async notifyPreviousApprovers(
    requestId: bigint,
    message: string,
    emailSubject: string,
    excludedUserId?: string,
    comment?: string,
    workflowInstanceId?: string | null
  ) {
    let instanceId = workflowInstanceId;
    if (!instanceId) {
      const request = await this.prisma.requestInstance.findUnique({
        where: { id: requestId },
        select: { workflowInstanceId: true }
      });
      instanceId = request?.workflowInstanceId;
    }
    if (!instanceId) return;

    const history = await this.prisma.workflowHistory.findMany({
      where: { instanceId },
      select: { performedBy: true }
    });

    const previousApprovers = Array.from(new Set(history.map(h => h.performedBy?.toString()).filter((x): x is string => !!x)));
    if (!previousApprovers.length) return;

    const formattedRequestNumber = await this.getFormattedRequestNumber(requestId);
    const approverNotificationChannels = await this.buildRequestNotificationChannels({
      requestId,
      audience: 'approver',
      message,
      comment
    });

    for (const targetUserId of previousApprovers) {
      if (excludedUserId && targetUserId === excludedUserId) continue;
      await this.notificationsService.create({
        userId: targetUserId,
        type: 'action',
        title: 'Request Action Update',
        message,
        ...approverNotificationChannels,
        data: { requestId: requestId.toString(), comment },
        notifiableType: 'request',
        notifiableId: requestId,
        emailSubject,
        emailThreadKey: this.getRequestThreadKey(formattedRequestNumber)
      });
    }
  }

  private async logWorkflowEvent(
    instanceId: string | null | undefined,
    action: string,
    performedBy: string,
    data?: Record<string, unknown>
  ) {
    if (!instanceId) return;
    await this.prisma.workflowHistory.create({
      data: {
        instanceId,
        action,
        performedBy: toBigInt(performedBy),
        data: (data ?? {}) as Prisma.InputJsonValue
      }
    });
  }

  private async ensureStaffRequestSequenceFloor(db: Prisma.TransactionClient | PrismaService) {
    const floor = (STAFF_REQUEST_SEQUENCE_START - BigInt(1)).toString();
    await db.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('sta_request_instances','id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM sta_request_instances), ${floor}), true)`
    );
  }
}
