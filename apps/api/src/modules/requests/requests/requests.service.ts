import { Injectable, BadRequestException, NotFoundException, ConflictException, Optional, UnauthorizedException } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, ne, or, sql, SQL } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { RequestDocumentFacadeService } from '$modules/requests/requests/documents/request-document-facade.service';
import { DocumentIds } from '$common/documents/document.types';
import { RequestPdfDocument } from '$modules/requests/requests/documents/request-pdf.document';
import { PaymentVoucherDocument } from '$modules/requests/requests/documents/payment-voucher.document';
import { CertificateOfHonorDocument } from '$modules/requests/requests/documents/certificate-of-honor.document';
import { RequestWithAttachmentsDocument } from '$modules/requests/requests/documents/request-with-attachments.document';
import { FullPackageDocument } from '$modules/requests/requests/documents/full-package.document';
import { FullDocumentDocument } from '$modules/requests/requests/documents/full-document.document';
import { PVWithAttachmentsDocument } from '$modules/requests/requests/documents/pv-with-attachments.document';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { CreateGroupDto } from '$modules/requests/requests/dto/create-group.dto';
import { UpdateGroupDto } from '$modules/requests/requests/dto/update-group.dto';
import { CreateCategoryDto } from '$modules/requests/requests/dto/create-category.dto';
import { UpdateCategoryDto } from '$modules/requests/requests/dto/update-category.dto';
import { CreateTypeDto } from '$modules/requests/requests/dto/create-type.dto';
import { UpdateTypeDto } from '$modules/requests/requests/dto/update-type.dto';
import { CreateRequestDto } from '$modules/requests/requests/dto/create-request.dto';
import { UpdateRequestDto } from '$modules/requests/requests/dto/update-request.dto';
import { SubmitRequestDto } from '$modules/requests/requests/dto/submit-request.dto';
import { ActionRequestDto } from '$modules/requests/requests/dto/action-request.dto';
import { RequestResponseDto } from '$modules/requests/requests/dto/request-response.dto';
import { RetireRequestDto } from '$modules/requests/requests/dto/retire-request.dto';
import { CreateManualRequestDto } from '$modules/requests/requests/dto/create-manual-request.dto';
import { DownloadRequestDto } from '$modules/requests/requests/dto/download-request.dto';
import { toBigInt } from '$common/utils/ids';
import { isLeaveRequestType, objectSchema, policyScopeMatches, policyScopeRank, resolveLeaveTypeKey } from '$common/utils/leave-policy';
import { WorkflowService } from '$modules/requests/workflow/workflow.service';
import { normalizeWorkflowStepApprover } from '$modules/requests/workflow/workflow-approvers';
import { FormsService } from '$modules/requests/forms/forms.service';
import { NotificationsService } from '$modules/notifications/notifications.service';
import { requestCategory, requestGroup, requestInstance, requestItem, requestItemFile, requestType } from './model';
import { workflow, workflowHistory, workflowInstance, workflowStep, workflowStepApprover } from '$modules/requests/workflow/model';
import {
  financeAccount,
  financeBudget,
  financeBudgetCommitment,
  financeBudgetRevision,
  financeBudgetRevisionLine,
  financePaymentVoucher,
  financePaymentVoucherFile,
  financePVDeduction,
  financeRequestDeduction,
} from '$modules/finance/finance/model';
import { employeeProfile, leaveBalanceLedger } from '$modules/hr/hr/model';
import { policy } from '$modules/requests/policies/model';
import { group, groupUser } from '$modules/communication/groups/model';
import { organization } from '$modules/directory/organizations/model';
import { profile } from '$modules/identity/users/model';
import { permission, role, rolePermission, userRole } from '$modules/identity/rbac/model';
import { fileAsset } from '$modules/storage/model';
import { tenantMembership, tenantOrganization } from '$modules/tenancy/model';

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
    private readonly db: DbService,
    private readonly workflowService: WorkflowService,
    private readonly formsService: FormsService,
    private readonly notificationsService: NotificationsService,
    private readonly documentGenerator: RequestDocumentFacadeService,
    @Optional() private readonly tenantContext?: TenantContextService,
  ) {}

  private tenanted(column: any, tid: bigint | undefined) {
    return tid === undefined ? undefined : eq(column, tid);
  }

  private templated(column: any, tid: bigint | undefined) {
    return tid === undefined ? undefined : or(eq(column, tid), isNull(column));
  }

  private async profileScope(tid: bigint | undefined): Promise<SQL | undefined> {
    if (tid === undefined) return undefined;
    const rows = await this.db.client
      .select({ profileId: tenantMembership.profileId })
      .from(tenantMembership)
      .where(and(eq(tenantMembership.tenantId, tid), eq(tenantMembership.status, 'active')));
    return inArray(profile.id, rows.map((row) => row.profileId));
  }

  private async organizationScope(tid: bigint | undefined): Promise<SQL | undefined> {
    if (tid === undefined) return undefined;
    const rows = await this.db.client
      .select({ organizationId: tenantOrganization.organizationId })
      .from(tenantOrganization)
      .where(eq(tenantOrganization.tenantId, tid));
    return inArray(organization.id, rows.map((row) => row.organizationId));
  }

  private async requestTypeWithCategory(requestTypeId: string) {
    const [type] = await this.db.client
      .select()
      .from(requestType)
      .where(eq(requestType.id, requestTypeId))
      .limit(1);
    if (!type) return null;
    const [category] = type.categoryId
      ? await this.db.client
          .select()
          .from(requestCategory)
          .where(eq(requestCategory.id, type.categoryId))
          .limit(1)
      : [];
    return { ...type, category: category ?? null };
  }

  private async requestGroupById(id: string) {
    const tid = this.tenantContext.currentTenantId();
    const [row] = await this.db.client
      .select()
      .from(requestGroup)
      .where(and(eq(requestGroup.id, id), this.tenanted(requestGroup.tenantId, tid)))
      .limit(1);
    return row ?? null;
  }

  private async fileAssetsByIds(ids: string[]) {
    const tid = this.tenantContext.currentTenantId();
    return this.db.client
      .select()
      .from(fileAsset)
      .where(and(inArray(fileAsset.id, ids), this.tenanted(fileAsset.tenantId, tid)));
  }

  private async fetchRequestItems(requestId: bigint) {
    const items = await this.db.client
      .select()
      .from(requestItem)
      .where(eq(requestItem.requestId, requestId));
    if (!items.length) return [];
    const files = await this.db.client
      .select()
      .from(requestItemFile)
      .where(
        inArray(
          requestItemFile.requestItemId,
          items.map((item) => item.id)
        )
      )
      .orderBy(asc(requestItemFile.sortOrder));
    const assetIds = Array.from(
      new Set([
        ...items.flatMap((item) => (item.fileId ? [item.fileId] : [])),
        ...files.map((file) => file.fileId),
      ])
    );
    const assets = assetIds.length > 0 ? await this.fileAssetsByIds(assetIds) : [];
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    return items.map((item) => ({
      ...item,
      file: item.fileId ? (assetMap.get(item.fileId) ?? null) : null,
      files: files
        .filter((file) => file.requestItemId === item.id)
        .map((file) => ({ ...file, file: assetMap.get(file.fileId) ?? null })),
    }));
  }

  private async creatorForRequest(createdBy: bigint) {
    const tid = this.tenantContext.currentTenantId();
    const scope = await this.profileScope(tid);
    const [row] = await this.db.client
      .select({
        id: profile.id,
        username: profile.username,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
      })
      .from(profile)
      .where(and(eq(profile.id, createdBy), scope))
      .limit(1);
    return row ?? null;
  }

  private async creatorLight(createdBy: bigint) {
    const tid = this.tenantContext.currentTenantId();
    const scope = await this.profileScope(tid);
    const [row] = await this.db.client
      .select({
        username: profile.username,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
      })
      .from(profile)
      .where(and(eq(profile.id, createdBy), scope))
      .limit(1);
    return row ?? null;
  }

  private async organizationForRequest(organizationId: bigint) {
    const tid = this.tenantContext.currentTenantId();
    const scope = await this.organizationScope(tid);
    const [row] = await this.db.client
      .select()
      .from(organization)
      .where(and(eq(organization.id, organizationId), scope))
      .limit(1);
    return row ?? null;
  }

  private async teamForRequest(teamId: bigint) {
    const tid = this.tenantContext.currentTenantId();
    const [row] = await this.db.client
      .select({ id: group.id, name: group.name })
      .from(group)
      .where(and(eq(group.id, teamId), this.tenanted(group.tenantId, tid)))
      .limit(1);
    return row ?? null;
  }

  private async hydrateRequest(request: any) {
    const [items, hydratedType, hydratedGroup, creator, organization, team] = await Promise.all([
      this.fetchRequestItems(request.id),
      request.requestTypeId ? this.requestTypeWithCategory(request.requestTypeId) : Promise.resolve(null),
      request.groupId ? this.requestGroupById(request.groupId) : Promise.resolve(null),
      request.createdBy != null ? this.creatorForRequest(request.createdBy) : Promise.resolve(null),
      request.organizationId != null ? this.organizationForRequest(request.organizationId) : Promise.resolve(null),
      request.teamId != null ? this.teamForRequest(request.teamId) : Promise.resolve(null),
    ]);
    return {
      ...request,
      items,
      requestType: hydratedType,
      group: hydratedGroup,
      creator,
      organization,
      team,
    };
  }

  private async workflowWithSteps(workflowId: string) {
    const tid = this.tenantContext.currentTenantId();
    const [wf] = await this.db.client
      .select()
      .from(workflow)
      .where(and(eq(workflow.id, workflowId), this.templated(workflow.tenantId, tid)))
      .limit(1);
    if (!wf) return null;
    const steps = await this.db.client
      .select()
      .from(workflowStep)
      .where(eq(workflowStep.workflowId, wf.id))
      .orderBy(asc(workflowStep.order));
    return { ...wf, steps };
  }

  private async currentStepWithApprovers(stepId: string | null) {
    if (!stepId) return null;
    const tid = this.tenantContext.currentTenantId();
    const [step] = await this.db.client
      .select()
      .from(workflowStep)
      .where(and(eq(workflowStep.id, stepId), this.templated(workflowStep.tenantId, tid)))
      .limit(1);
    if (!step) return null;
    const approvers = await this.db.client
      .select()
      .from(workflowStepApprover)
      .where(eq(workflowStepApprover.stepId, stepId));
    return { ...step, approvers };
  }

  private async workflowInstanceWithDetails(instanceId: string) {
    const tid = this.tenantContext.currentTenantId();
    const [instance] = await this.db.client
      .select()
      .from(workflowInstance)
      .where(and(eq(workflowInstance.id, instanceId), this.templated(workflowInstance.tenantId, tid)))
      .limit(1);
    if (!instance) return null;
    const [currentStep, history, wf] = await Promise.all([
      this.currentStepWithApprovers(instance.currentStepId ?? null),
      this.db.client
        .select()
        .from(workflowHistory)
        .where(and(eq(workflowHistory.instanceId, instanceId), this.templated(workflowHistory.tenantId, tid)))
        .orderBy(asc(workflowHistory.createdAt)),
      instance.workflowId ? this.workflowWithSteps(instance.workflowId) : Promise.resolve(null),
    ]);
    return { ...instance, currentStep, history, workflow: wf };
  }

  private async budgetRevisionWithLines(revisionId: string) {
    const [revision] = await this.db.client
      .select()
      .from(financeBudgetRevision)
      .where(eq(financeBudgetRevision.id, revisionId))
      .limit(1);
    if (!revision) return null;
    const lines = await this.db.client
      .select()
      .from(financeBudgetRevisionLine)
      .where(eq(financeBudgetRevisionLine.budgetRevisionId, revision.id))
      .orderBy(asc(financeBudgetRevisionLine.sortOrder));
    return { ...revision, lines };
  }

  async listGroups() {
    const tid = this.tenantContext.currentTenantId();
    const rows = await this.db.client
      .select()
      .from(requestGroup)
      .where(and(eq(requestGroup.isActive, true), this.tenanted(requestGroup.tenantId, tid)));
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  async createGroup(dto: CreateGroupDto) {
    if (!dto.code) throw new BadRequestException('code is required');
    const tid = this.tenantContext.currentTenantId();
    const [row] = await this.db.client
      .insert(requestGroup)
      .values({
        name: dto.name,
        code: dto.code,
        description: dto.description,
        ...(tid !== undefined ? { tenantId: tid } : {}),
      })
      .returning();
    return row;
  }

  async updateGroup(id: string, dto: UpdateGroupDto) {
    const tid = this.tenantContext.currentTenantId();
    const [row] = await this.db.client
      .update(requestGroup)
      .set({
        name: dto.name,
        code: dto.code,
        description: dto.description,
      })
      .where(and(eq(requestGroup.id, id), this.tenanted(requestGroup.tenantId, tid)))
      .returning();
    return row;
  }

  async deleteGroup(id: string) {
    const tid = this.tenantContext.currentTenantId();
    await this.db.client
      .delete(requestGroup)
      .where(and(eq(requestGroup.id, id), this.tenanted(requestGroup.tenantId, tid)));
    return { success: true };
  }

  async listCategories(groupId?: string) {
    const tid = this.tenantContext.currentTenantId();
    const rows = await this.db.client
      .select()
      .from(requestCategory)
      .where(groupId ? eq(requestCategory.groupId, groupId) : undefined)
      .orderBy(asc(requestCategory.sortOrder), asc(requestCategory.name));
    const groupIds = Array.from(
      new Set(rows.map((row) => row.groupId).filter((id): id is string => Boolean(id)))
    );
    const groupNames = groupIds.length
      ? await this.db.client
          .select({ id: requestGroup.id, name: requestGroup.name })
          .from(requestGroup)
          .where(and(inArray(requestGroup.id, groupIds), this.tenanted(requestGroup.tenantId, tid)))
      : [];
    const nameById = new Map(groupNames.map((g) => [g.id, g.name]));
    const rowsWithGroup = rows.map((row) => ({
      ...row,
      group:
        row.groupId && nameById.has(row.groupId) ? { name: nameById.get(row.groupId) ?? null } : null,
    }));
    return paginatedResponse(rowsWithGroup, { page: 1, per_page: rows.length, total: rows.length });
  }

  async createCategory(dto: CreateCategoryDto) {
    const [existing] = await this.db.client
      .select({ id: requestCategory.id })
      .from(requestCategory)
      .where(eq(requestCategory.code, dto.code))
      .limit(1);
    if (existing) throw new ConflictException(`Category code "${dto.code}" already exists`);
    const [row] = await this.db.client
      .insert(requestCategory)
      .values({
        groupId: dto.group_id,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        sortOrder: dto.sort_order ?? 0,
      })
      .returning();
    return row;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const [row] = await this.db.client
      .update(requestCategory)
      .set({
        name: dto.name,
        code: dto.code,
        description: dto.description,
        isActive: dto.is_active,
        sortOrder: dto.sort_order,
      })
      .where(eq(requestCategory.id, id))
      .returning();
    return row;
  }

  async deleteCategory(id: string) {
    await this.db.client.delete(requestCategory).where(eq(requestCategory.id, id));
    return { success: true };
  }

  async listTypes(groupId?: string, categoryId?: string, includeInactive?: boolean, actorId?: string) {
    const conditions: SQL[] = [];
    if (!includeInactive) conditions.push(eq(requestType.isActive, true));
    if (categoryId) {
      conditions.push(eq(requestType.categoryId, categoryId));
    } else if (groupId) {
      const categories = await this.db.client
        .select({ id: requestCategory.id })
        .from(requestCategory)
        .where(eq(requestCategory.groupId, groupId));
      const categoryIds = categories.map((c) => c.id);
      if (categoryIds.length > 0) {
        conditions.push(inArray(requestType.categoryId, categoryIds));
      } else {
        conditions.push(sql`false`);
      }
    }
    const rows = await this.db.client.select().from(requestType).where(and(...conditions));

    let result = rows;
    if (actorId) {
      const userRoles = await this.getActorRoleSlugs(actorId);
      if (!userRoles.has('admin')) {
        result = rows.filter((t) => {
          if (!t.visibleToRoles || !Array.isArray(t.visibleToRoles) || t.visibleToRoles.length === 0) return true;
          return (t.visibleToRoles as string[]).some((role) => userRoles.has(role));
        });
      }
    }

    return paginatedResponse(result, { page: 1, per_page: result.length, total: result.length });
  }

  async getType(id: string) {
    const [type] = await this.db.client
      .select()
      .from(requestType)
      .where(eq(requestType.id, id))
      .limit(1);
    if (!type) throw new NotFoundException('Request type not found');
    return type;
  }

  async createType(dto: CreateTypeDto, actorId?: string) {
    const [category] = await this.db.client
      .select({ groupId: requestCategory.groupId })
      .from(requestCategory)
      .where(eq(requestCategory.id, dto.category_id))
      .limit(1);
    if (!category) throw new NotFoundException('Category not found');

    await this.assertRequestTypeGroupAccess(category.groupId, actorId);
    const group = await this.requestGroupById(category.groupId);
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

    const [row] = await this.db.client
      .insert(requestType)
      .values({
        categoryId: dto.category_id,
        name: dto.name,
        codePrefix: dto.code_prefix,
        taxonomyKeys: dto.taxonomy_keys as any,
        formSchema: dto.form_schema as any,
        description: dto.description,
        storageType: dto.storage_type ?? 'json',
        formId: dto.form_id,
        approvalFlowJson: approvalFlowJson as any,
        approvalLimit: dto.approval_limit == null ? null : String(dto.approval_limit),
        workflowType: dto.workflow_type ?? null,
        handlerRoleLabel: dto.handler_role_label ?? null,
        visibleToRoles: dto.visible_to_roles as any,
        isActive: dto.is_active ?? true,
      })
      .returning();
    return row;
  }

  async updateType(id: string, dto: UpdateTypeDto, actorId?: string) {
    const [existing] = await this.db.client
      .select({
        categoryId: requestType.categoryId,
        name: requestType.name,
        codePrefix: requestType.codePrefix,
        taxonomyKeys: requestType.taxonomyKeys,
        formSchema: requestType.formSchema,
        approvalFlowJson: requestType.approvalFlowJson,
      })
      .from(requestType)
      .where(eq(requestType.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Request type not found');

    const resolvedCategoryId = dto.category_id ?? existing.categoryId;
    const [category] = await this.db.client
      .select({ groupId: requestCategory.groupId })
      .from(requestCategory)
      .where(eq(requestCategory.id, resolvedCategoryId))
      .limit(1);
    if (!category) throw new NotFoundException('Category not found');

    await this.assertRequestTypeGroupAccess(category.groupId, actorId);
    const group = await this.requestGroupById(category.groupId);

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

    const [row] = await this.db.client
      .update(requestType)
      .set({
        name: dto.name,
        categoryId: dto.category_id,
        codePrefix: dto.code_prefix,
        taxonomyKeys: dto.taxonomy_keys as any,
        formSchema: dto.form_schema !== undefined ? (dto.form_schema as any) : undefined,
        description: dto.description,
        storageType: dto.storage_type,
        formId: dto.form_id,
        approvalFlowJson: normalizedApprovalFlow !== undefined ? (normalizedApprovalFlow as any) : undefined,
        approvalLimit: dto.approval_limit == null ? undefined : String(dto.approval_limit),
        isActive: dto.is_active,
        ...(dto.workflow_type !== undefined && { workflowType: dto.workflow_type }),
        ...(dto.handler_role_label !== undefined && { handlerRoleLabel: dto.handler_role_label }),
        visibleToRoles: dto.visible_to_roles !== undefined ? (dto.visible_to_roles as any) : undefined,
      })
      .where(eq(requestType.id, id))
      .returning();
    return row;
  }

  async deleteType(id: string, actorId?: string) {
    const [existing] = await this.db.client
      .select({ id: requestType.id, categoryId: requestType.categoryId })
      .from(requestType)
      .where(eq(requestType.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Request type not found');

    const [category] = await this.db.client
      .select({ groupId: requestCategory.groupId })
      .from(requestCategory)
      .where(eq(requestCategory.id, existing.categoryId))
      .limit(1);
    if (!category) throw new NotFoundException('Category not found');
    await this.assertRequestTypeGroupAccess(category.groupId, actorId);

    const tid = this.tenantContext.currentTenantId();
    const [usage] = await this.db.client
      .select({ c: count() })
      .from(requestInstance)
      .where(and(eq(requestInstance.requestTypeId, existing.id), this.tenanted(requestInstance.tenantId, tid)));
    const usageCount = Number(usage?.c ?? 0);
    if (usageCount > 0) {
      throw new BadRequestException('Cannot delete request type with existing requests. Set it inactive instead.');
    }

    await this.db.client.delete(requestType).where(eq(requestType.id, existing.id));
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
    const tid = this.tenantContext.currentTenantId();
    const rows = await this.db.client
      .select({ slug: role.slug })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(and(eq(userRole.profileId, toBigInt(actorId)), this.tenanted(userRole.tenantId, tid)));
    return new Set(rows.map((row) => String(row.slug || '').toLowerCase()));
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
    const requestType = await this.requestTypeWithCategory(dto.request_type_id);
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

    const created = await this.db.client.transaction(async (tx) => {
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

      const [request] = await tx
        .insert(requestInstance)
        .values({
          requestTypeId: requestType.id,
          groupId: requestType.category!.groupId,
          createdBy,
          organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
          teamId: dto.team_id ? toBigInt(dto.team_id) : null,
          status: 'draft',
          data: normalizedData as any,
          totalAmount: String(computedTotal ?? dto.total_amount ?? 0),
          currency: dto.currency || 'NGN'
        })
        .returning();
      if (request.id < STAFF_REQUEST_ID_MIN) {
        throw new BadRequestException(
          `Automatic request ids must start from ${STAFF_REQUEST_ID_MIN.toString()}. Set request sequence before creating staff requests.`
        );
      }

      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          const itemFileIds = this.normalizeItemFileIds(item);
          const [createdItem] = await tx
            .insert(requestItem)
            .values({
              requestId: request.id,
              fileId: itemFileIds[0] ?? null,
              description: item.description,
              amount: String(item.amount),
              quantity: item.quantity ?? 1,
              categoryId: item.category_id ?? null,
              subcategoryId: item.subcategory_id ?? null,
              dueDate: item.due_date ? new Date(item.due_date) : null,
              notes: item.notes ?? null,
              bankName: item.bank_name ?? null,
              accountNumber: item.account_number ?? null,
              accountName: item.account_name ?? null
            })
            .returning();
          if (itemFileIds.length > 0) {
            await tx.insert(requestItemFile).values(
              itemFileIds.map((fileId, index) => ({
                requestItemId: createdItem.id,
                fileId,
                sortOrder: index
              }))
            );
          }
        }
      }

      return request;
    });

    await this.syncBudgetCommitmentForRequest(created);

    return this.getRequest(created.id.toString(), userId);
  }

  async createManualEntry(userId: string, dto: CreateManualRequestDto) {
    const requestType = await this.requestTypeWithCategory(dto.request_type_id);
    if (!requestType || !requestType.isActive) throw new BadRequestException('Invalid request type');

    const tid = this.tenantContext.currentTenantId();
    const staffScope = await this.profileScope(tid);
    const [staff] = await this.db.client
      .select({
        id: profile.id,
        email: profile.email,
        username: profile.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
      })
      .from(profile)
      .where(and(eq(profile.id, toBigInt(dto.staff_id)), staffScope))
      .limit(1);
    if (!staff) throw new BadRequestException('Invalid staff_id');

    if (dto.team_id) {
      const [team] = await this.db.client
        .select({ id: group.id })
        .from(group)
        .where(and(eq(group.id, toBigInt(dto.team_id)), this.tenanted(group.tenantId, tid)))
        .limit(1);
      if (!team) throw new BadRequestException('Invalid team_id');
    }
    if (dto.organization_id) {
      const orgScope = await this.organizationScope(tid);
      const [orgRow] = await this.db.client
        .select({ id: organization.id })
        .from(organization)
        .where(and(eq(organization.id, toBigInt(dto.organization_id)), orgScope))
        .limit(1);
      if (!orgRow) throw new BadRequestException('Invalid organization_id');
    }

    const itemFileIds = (dto.items ?? []).flatMap((i) => this.normalizeItemFileIds(i));
    const voucherEvidenceIds = (dto.disbursements ?? []).flatMap((x) => this.normalizeVoucherEvidenceFileIds(x));
    const retirementIds = (dto.disbursements ?? [])
      .flatMap((x) => x.retirement_file_ids ?? [])
      .filter((x): x is string => Boolean(x));
    const allFileIds = Array.from(new Set([...itemFileIds, ...voucherEvidenceIds, ...retirementIds]));
    if (allFileIds.length) await this.ensureFileAssetsExist(this.db.client, allFileIds);
    const paidFromAccountIds = Array.from(
      new Set(
        (dto.disbursements ?? [])
          .map((x) => x.paid_from_account_id)
          .filter((x): x is string => Boolean(x))
      )
    );
    if (paidFromAccountIds.length > 0) {
      const [accountCountRow] = await this.db.client
        .select({ c: count() })
        .from(financeAccount)
        .where(
          and(
            inArray(financeAccount.id, paidFromAccountIds),
            eq(financeAccount.isActive, true),
            this.tenanted(financeAccount.tenantId, tid)
          )
        );
      const accountCount = Number(accountCountRow?.c ?? 0);
      if (accountCount !== paidFromAccountIds.length) throw new BadRequestException('Invalid paid_from_account_id');
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
      const [taken] = await this.db.client
        .select({ id: requestInstance.id })
        .from(requestInstance)
        .where(and(eq(requestInstance.id, explicitRequestId), this.tenanted(requestInstance.tenantId, tid)))
        .limit(1);
      if (taken) throw new BadRequestException(`request_id ${dto.request_id} already exists`);
    }

    let pvSeqOffset = 0;
    const resolvedDisbursements: NonNullable<typeof dto.disbursements> = [];
    for (const row of (dto.disbursements ?? [])) {
      const vn = (row.voucher_number ?? '').trim();
      if (vn) {
        resolvedDisbursements.push(row);
      } else {
        const disbDate = row.disbursed_at ? new Date(row.disbursed_at) : createdAt;
        const year = disbDate.getFullYear();
        const [pvCountRow] = await this.db.client
          .select({ c: count() })
          .from(financePaymentVoucher)
          .where(
            and(
              gte(financePaymentVoucher.disbursedAt, new Date(year, 0, 1)),
              lt(financePaymentVoucher.disbursedAt, new Date(year + 1, 0, 1))
            )
          );
        const pvCount = Number(pvCountRow?.c ?? 0);
        resolvedDisbursements.push({ ...row, voucher_number: `PV/${year}/${String(pvCount + 1 + pvSeqOffset++).padStart(3, '0')}` });
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
    const created = await this.db.client.transaction(async (tx) => {
      const [request] = await tx
        .insert(requestInstance)
        .values({
          ...(explicitRequestId ? { id: explicitRequestId } : {}),
          ...(tid !== undefined ? { tenantId: tid } : {}),
          requestTypeId: requestType.id,
          groupId: requestType.category!.groupId,
          createdBy: staff.id,
          teamId: dto.team_id ? toBigInt(dto.team_id) : null,
          organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
          status,
          data: baseData as any,
          totalAmount: String(totalAmount),
          currency: dto.currency || 'NGN',
          createdAt,
          updatedAt: createdAt
        })
        .returning();

      if (dto.items?.length) {
        for (const item of dto.items) {
          const itemFileIds = this.normalizeItemFileIds(item);
          const [createdItem] = await tx
            .insert(requestItem)
            .values({
              requestId: request.id,
              description: item.description,
              amount: String(item.amount),
              quantity: item.quantity ?? 1,
              notes: item.notes ?? null,
              fileId: itemFileIds[0] ?? null,
              bankName: item.bank_name ?? null,
              accountNumber: item.account_number ?? null,
              accountName: item.account_name ?? null
            })
            .returning();
          if (itemFileIds.length > 0) {
            await tx.insert(requestItemFile).values(
              itemFileIds.map((fileId, index) => ({
                requestItemId: createdItem.id,
                fileId,
                sortOrder: index
              }))
            );
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
          const [createdVoucher] = await tx
            .insert(financePaymentVoucher)
            .values({
              requestId: request.id,
              voucherNumber: row.voucher_number!,
              amount: String(amount),
              retiredAmount: String(retiredAmount),
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
              grossAmount: deductions.length > 0 ? String(grossAmt) : null,
              netAmount: netAmt == null ? null : String(netAmt),
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
              } as any
            })
            .returning();
          if (evidenceFileIds.length > 0) {
            await tx.insert(financePaymentVoucherFile).values(
              evidenceFileIds.map((fileId, index) => ({
                voucherId: createdVoucher.id,
                fileId,
                fileKind: 'evidence',
                sortOrder: index
              }))
            );
          }
          if (deductions.length > 0) {
            await tx.insert(financePVDeduction).values(
              deductions.map((d) => ({
                paymentVoucherId: createdVoucher.id,
                deductionTypeId: d.deduction_type_id,
                rate: String(d.rate),
                grossAmount: String(Number(d.gross_amount)),
                deductionAmount: String(d.deduction_amount),
                createdBy: toBigInt(userId),
                updatedAt: new Date(),
              }))
            );
            await tx.insert(financeRequestDeduction).values(
              deductions.map((d) => ({
                requestId: request.id,
                deductionTypeId: d.deduction_type_id,
                amount: String(Number(d.deduction_amount)),
                rate: String(d.rate),
                grossAmount: String(Number(d.gross_amount)),
                status: 'pending',
                createdBy: toBigInt(userId),
                updatedAt: new Date(),
              }))
            );
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
    const requestType = await this.requestTypeWithCategory(dto.request_type_id);
    if (!requestType || !requestType.isActive) throw new BadRequestException('Invalid request type');

    const existing = await this.getRequestOrThrow(id);

    const tid = this.tenantContext.currentTenantId();
    const staffScope = await this.profileScope(tid);
    const [staff] = await this.db.client
      .select({ id: profile.id })
      .from(profile)
      .where(and(eq(profile.id, toBigInt(dto.staff_id)), staffScope))
      .limit(1);
    if (!staff) throw new BadRequestException('Invalid staff_id');

    if (dto.team_id) {
      const [team] = await this.db.client
        .select({ id: group.id })
        .from(group)
        .where(and(eq(group.id, toBigInt(dto.team_id)), this.tenanted(group.tenantId, tid)))
        .limit(1);
      if (!team) throw new BadRequestException('Invalid team_id');
    }
    if (dto.organization_id) {
      const orgScope = await this.organizationScope(tid);
      const [orgRow] = await this.db.client
        .select({ id: organization.id })
        .from(organization)
        .where(and(eq(organization.id, toBigInt(dto.organization_id)), orgScope))
        .limit(1);
      if (!orgRow) throw new BadRequestException('Invalid organization_id');
    }

    const itemFileIds = (dto.items ?? []).flatMap((i) => this.normalizeItemFileIds(i));
    const voucherEvidenceIds = (dto.disbursements ?? []).flatMap((x) => this.normalizeVoucherEvidenceFileIds(x));
    const retirementIds = (dto.disbursements ?? [])
      .flatMap((x) => x.retirement_file_ids ?? [])
      .filter((x): x is string => Boolean(x));
    const allFileIds = Array.from(new Set([...itemFileIds, ...voucherEvidenceIds, ...retirementIds]));
    if (allFileIds.length) await this.ensureFileAssetsExist(this.db.client, allFileIds);
    const paidFromAccountIds = Array.from(
      new Set(
        (dto.disbursements ?? [])
          .map((x) => x.paid_from_account_id)
          .filter((x): x is string => Boolean(x))
      )
    );
    if (paidFromAccountIds.length > 0) {
      const [accountCountRow] = await this.db.client
        .select({ c: count() })
        .from(financeAccount)
        .where(
          and(
            inArray(financeAccount.id, paidFromAccountIds),
            eq(financeAccount.isActive, true),
            this.tenanted(financeAccount.tenantId, tid)
          )
        );
      const accountCount = Number(accountCountRow?.c ?? 0);
      if (accountCount !== paidFromAccountIds.length) throw new BadRequestException('Invalid paid_from_account_id');
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
      const [taken] = await this.db.client
        .select({ id: requestInstance.id })
        .from(requestInstance)
        .where(and(eq(requestInstance.id, desiredRequestId), this.tenanted(requestInstance.tenantId, tid)))
        .limit(1);
      if (taken) throw new BadRequestException(`request_id ${dto.request_id} already exists`);
    }

    let pvSeqOffsetU = 0;
    const resolvedDisbursements: NonNullable<typeof dto.disbursements> = [];
    for (const row of (dto.disbursements ?? [])) {
      const vn = (row.voucher_number ?? '').trim();
      if (vn) {
        resolvedDisbursements.push(row);
      } else {
        const disbDate = row.disbursed_at ? new Date(row.disbursed_at) : createdAt;
        const year = disbDate.getFullYear();
        const [pvCountRow] = await this.db.client
          .select({ c: count() })
          .from(financePaymentVoucher)
          .where(
            and(
              gte(financePaymentVoucher.disbursedAt, new Date(year, 0, 1)),
              lt(financePaymentVoucher.disbursedAt, new Date(year + 1, 0, 1))
            )
          );
        const pvCount = Number(pvCountRow?.c ?? 0);
        resolvedDisbursements.push({ ...row, voucher_number: `PV/${year}/${String(pvCount + 1 + pvSeqOffsetU++).padStart(3, '0')}` });
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
    const requestFields = {
      requestTypeId: requestType.id,
      groupId: requestType.category!.groupId,
      createdBy: staff.id,
      teamId: dto.team_id ? toBigInt(dto.team_id) : null,
      organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
      status,
      data: baseData as any,
      totalAmount: String(totalAmount),
      currency: dto.currency || existing.currency || 'NGN',
      createdAt,
      updatedAt: new Date()
    };
    await this.db.client.transaction(async (tx) => {
      if (isRequestIdChanged) {
        await tx.insert(requestInstance).values({
          ...(tid !== undefined ? { tenantId: tid } : {}),
          id: desiredRequestId,
          workflowInstanceId: null,
          ...requestFields
        });
      } else {
        await tx
          .update(requestInstance)
          .set(requestFields as any)
          .where(and(eq(requestInstance.id, existing.id), this.tenanted(requestInstance.tenantId, tid)));
      }

      await tx.delete(requestItem).where(eq(requestItem.requestId, existing.id));
      if (dto.items?.length) {
        for (const item of dto.items) {
          const fileIds = this.normalizeItemFileIds(item);
          const [createdItem] = await tx
            .insert(requestItem)
            .values({
              requestId: desiredRequestId,
              description: item.description,
              amount: String(item.amount),
              quantity: item.quantity ?? 1,
              notes: item.notes ?? null,
              fileId: fileIds[0] ?? null,
              bankName: item.bank_name ?? null,
              accountNumber: item.account_number ?? null,
              accountName: item.account_name ?? null
            })
            .returning();
          if (fileIds.length > 0) {
            await tx.insert(requestItemFile).values(
              fileIds.map((fileId, index) => ({
                requestItemId: createdItem.id,
                fileId,
                sortOrder: index
              }))
            );
          }
        }
      }

      await tx.delete(financePaymentVoucher).where(eq(financePaymentVoucher.requestId, existing.id));
      await tx.delete(financeRequestDeduction).where(eq(financeRequestDeduction.requestId, existing.id));
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
          const [createdVoucher] = await tx
            .insert(financePaymentVoucher)
            .values({
              requestId: desiredRequestId,
              voucherNumber: row.voucher_number!,
              amount: String(amount),
              retiredAmount: String(retiredAmount),
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
              grossAmount: deductions.length > 0 ? String(grossAmt) : null,
              netAmount: netAmt == null ? null : String(netAmt),
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
              } as any
            })
            .returning();
          if (evidenceFileIds.length > 0) {
            await tx.insert(financePaymentVoucherFile).values(
              evidenceFileIds.map((fileId, index) => ({
                voucherId: createdVoucher.id,
                fileId,
                fileKind: 'evidence',
                sortOrder: index
              }))
            );
          }
          if (deductions.length > 0) {
            await tx.insert(financePVDeduction).values(
              deductions.map((d) => ({
                paymentVoucherId: createdVoucher.id,
                deductionTypeId: d.deduction_type_id,
                rate: String(d.rate),
                grossAmount: String(Number(d.gross_amount)),
                deductionAmount: String(d.deduction_amount),
                createdBy: toBigInt(userId),
                updatedAt: new Date(),
              })) as any
            );
            await tx.insert(financeRequestDeduction).values(
              deductions.map((d) => ({
                requestId: desiredRequestId,
                deductionTypeId: d.deduction_type_id,
                amount: String(Number(d.deduction_amount)),
                rate: String(d.rate),
                grossAmount: String(Number(d.gross_amount)),
                status: 'pending',
                createdBy: toBigInt(userId),
                updatedAt: new Date(),
              })) as any
            );
          }
        }
      }

      if (isRequestIdChanged) {
        await tx.delete(requestInstance).where(eq(requestInstance.id, existing.id));
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

    const tid = this.tenantContext.currentTenantId();
    await this.db.client
      .delete(requestInstance)
      .where(and(eq(requestInstance.id, existing.id), this.tenanted(requestInstance.tenantId, tid)));
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

    const conditions: (SQL | undefined)[] = [];
    if (requestTypeId) conditions.push(eq(requestInstance.requestTypeId, requestTypeId));
    conditions.push(eq(requestInstance.id, toBigInt(raw)));

    const [found] = await this.db.client
      .select({ id: requestInstance.id })
      .from(requestInstance)
      .where(and(...conditions))
      .limit(1);
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

    const conditions: (SQL | undefined)[] = [];
    if (excludeRequestId) conditions.push(ne(financePaymentVoucher.requestId, toBigInt(excludeRequestId)));
    conditions.push(eq(financePaymentVoucher.voucherNumber, raw));

    const [found] = await this.db.client
      .select({
        id: financePaymentVoucher.id,
        requestId: financePaymentVoucher.requestId,
        voucherNumber: financePaymentVoucher.voucherNumber
      })
      .from(financePaymentVoucher)
      .where(and(...conditions))
      .limit(1);

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
      await this.db.client
        .update(requestInstance)
        .set({
          status: nextStatus as any,
          data: this.withStateEvent(request.data, {
            from: 'sent',
            to: nextStatus,
            action: workflowStart.workflowStatus === 'approved' ? 'workflow_auto_approved' : 'workflow_start',
            by: userId
          }) as any
        })
        .where(and(eq(requestInstance.id, request.id), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())));
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

        const [currentInstance] = await this.db.client
          .select({ status: workflowInstance.status })
          .from(workflowInstance)
          .where(and(eq(workflowInstance.id, request.workflowInstanceId), this.templated(workflowInstance.tenantId, this.tenantContext.currentTenantId())))
          .limit(1);

        if (currentInstance?.status === 'rejected' || currentInstance?.status === 'cancelled') {
          throw new BadRequestException('Workflow is already closed and cannot be approved');
        }

        stepResult = { status: 'approved', completed: true };
      }

      if (stepResult.status === 'pending') {
        await this.db.client
          .update(requestInstance)
          .set({ status: 'approval' })
          .where(and(eq(requestInstance.id, request.id), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())));
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

        const [currentInstance] = await this.db.client
          .select({ status: workflowInstance.status })
          .from(workflowInstance)
          .where(and(eq(workflowInstance.id, request.workflowInstanceId), this.templated(workflowInstance.tenantId, this.tenantContext.currentTenantId())))
          .limit(1);

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

          const [currentInstance] = await this.db.client
            .select({ status: workflowInstance.status })
            .from(workflowInstance)
            .where(and(eq(workflowInstance.id, request.workflowInstanceId), this.templated(workflowInstance.tenantId, this.tenantContext.currentTenantId())))
            .limit(1);

          if (currentInstance?.status === 'approved') {
            throw new BadRequestException('Workflow is already approved and cannot be returned for edit');
          }
        }
      }

      const [updated] = await this.db.client
        .update(requestInstance)
        .set({
          status: 'returned',
          workflowInstanceId: null,
          data: this.withStateEvent(request.data, {
            from: request.status,
            to: 'returned',
            by: userId,
            action: 'return',
            comment: reason
          }) as any
        })
        .where(and(eq(requestInstance.id, request.id), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
        .returning();

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

      const current = await this.hydrateRequest(await this.getRequestOrThrow(id));

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

    const conditions: (SQL | undefined)[] = [];

    const scope = this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId());
    if (scope) conditions.push(scope);
    if (filters.id) conditions.push(eq(requestInstance.id, toBigInt(filters.id)));
    if (filters.group_id) conditions.push(eq(requestInstance.groupId, filters.group_id));
    if (filters.type_id || filters.request_type_id) conditions.push(eq(requestInstance.requestTypeId, filters.type_id || filters.request_type_id));
    if (filters.status) {
      if (typeof filters.status === 'string' && filters.status.includes(',')) {
        conditions.push(inArray(requestInstance.status, filters.status.split(',') as any));
      } else {
        conditions.push(eq(requestInstance.status, filters.status as any));
      }
    }
    if (filters.created_by) conditions.push(eq(requestInstance.createdBy, toBigInt(filters.created_by)));
    if (filters.request_number) {
      const raw = String(filters.request_number).trim();
      if (/^\d+$/.test(raw)) conditions.push(eq(requestInstance.id, toBigInt(raw)));
    }
    if (filters.family) {
      conditions.push(
        inArray(
          requestInstance.requestTypeId,
          this.db.client.select({ id: requestType.id }).from(requestType).where(eq(requestType.workflowType, filters.family))
        )
      );
    }

    // If no view-all permission, restrict to current user (handled by PermissionsGuard upstream)
    if (filters.only_mine === 'true') {
      conditions.push(eq(requestInstance.createdBy, toBigInt(userId)));
    }

    const [total, data] = await Promise.all([
      this.db.client.select({ c: count() }).from(requestInstance).where(and(...conditions)).execute(),
      this.db.client
        .select()
        .from(requestInstance)
        .where(and(...conditions))
        .orderBy(desc(requestInstance.createdAt))
        .limit(limit)
        .offset(skip)
        .execute()
    ]);

    const items = await Promise.all(
      data.map(async (item) => {
        const hydrated = await this.hydrateRequest(item);
        const ser = this.serializeRequest(hydrated);
        if (item.workflowInstanceId) {
          ser.approvals = await this.getApprovalSummary(item.workflowInstanceId);
        } else {
          ser.approvals = { done: [], pending: [], required_steps: [] };
        }
        return ser;
      })
    );
    return paginatedResponse(items, { page, per_page: limit, total: Number(total[0]?.c ?? 0) });
  }

  async getRequest(id: string, _userId: string): Promise<RequestResponseDto> {
    const request = await this.getRequestOrThrow(id);
    const hydrated = await this.hydrateRequest(request);
    const serialized = this.serializeRequest(hydrated);
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
      const [lightType] = await this.db.client
        .select({ name: requestType.name, taxonomyKeys: requestType.taxonomyKeys, formSchema: requestType.formSchema })
        .from(requestType)
        .where(eq(requestType.id, request.requestTypeId))
        .limit(1);
      await this.validateLeaveRequestPayload(
        {
          name: lightType?.name ?? null,
          taxonomyKeys: lightType?.taxonomyKeys as string[] | null | undefined,
          formSchema: lightType?.formSchema ?? null
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

    const updated = await this.db.client.transaction(async (tx) => {
      const computedTotal = dto.items && dto.items.length
        ? dto.items.reduce((sum, item) => sum + (item.amount * (item.quantity ?? 1)), 0)
        : undefined;

      const fileIds = dto.items
        ? Array.from(new Set(dto.items.flatMap((item) => this.normalizeItemFileIds(item))))
        : [];
      if (fileIds.length > 0) {
        await this.ensureFileAssetsExist(tx, fileIds);
      }

      const [updated] = await tx
        .update(requestInstance)
        .set({
          data: normalizedData as any,
          teamId: dto.team_id ? toBigInt(dto.team_id) : request.teamId,
          organizationId: dto.organization_id ? toBigInt(dto.organization_id) : request.organizationId,
          totalAmount: computedTotal !== undefined ? String(computedTotal) : dto.total_amount !== undefined ? String(dto.total_amount) : request.totalAmount,
          currency: dto.currency ?? request.currency
        })
        .where(and(eq(requestInstance.id, request.id), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
        .returning();

      if (dto.items) {
        await tx.delete(requestItem).where(eq(requestItem.requestId, request.id));
        if (dto.items.length > 0) {
          for (const item of dto.items) {
            const fileIds = this.normalizeItemFileIds(item);
            const [createdItem] = await tx
              .insert(requestItem)
              .values({
                requestId: request.id,
                fileId: fileIds[0] ?? null,
                description: item.description,
                amount: String(item.amount),
                quantity: item.quantity ?? 1,
                categoryId: item.category_id ?? null,
                subcategoryId: item.subcategory_id ?? null,
                dueDate: item.due_date ? new Date(item.due_date) : null,
                notes: item.notes ?? null,
                bankName: item.bank_name ?? null,
                accountNumber: item.account_number ?? null,
                accountName: item.account_name ?? null
              })
              .returning();
            if (fileIds.length > 0) {
              await tx.insert(requestItemFile).values(
                fileIds.map((fileId, index) => ({
                  requestItemId: createdItem.id,
                  fileId,
                  sortOrder: index
                }))
              );
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

    await this.db.client
      .delete(requestInstance)
      .where(and(eq(requestInstance.id, request.id), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())));
    return { success: true };
  }

  async getApprovals(userId: string, filters: Record<string, any>) {
    const page = Math.max(1, Number(filters.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(filters.per_page) || 20));

    const data = await this.db.client
      .select()
      .from(requestInstance)
      .where(and(isNotNull(requestInstance.workflowInstanceId), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .orderBy(desc(requestInstance.createdAt));

    const userIdBigInt = toBigInt(userId);
    const instanceIds = data
      .map((item) => item.workflowInstanceId)
      .filter((id): id is string => Boolean(id));
    const myHistory =
      instanceIds.length > 0
        ? await this.db.client
            .select()
            .from(workflowHistory)
            .where(
              and(
                inArray(workflowHistory.instanceId, instanceIds),
                eq(workflowHistory.performedBy, userIdBigInt),
                inArray(workflowHistory.action, ['approve', 'reject']),
                this.templated(workflowHistory.tenantId, this.tenantContext.currentTenantId())
              )
            )
            .orderBy(desc(workflowHistory.createdAt))
        : [];
    const myActionByInstance = new Map<string, 'approve' | 'reject'>();
    for (const row of myHistory) {
      if (!myActionByInstance.has(row.instanceId) && (row.action === 'approve' || row.action === 'reject')) {
        myActionByInstance.set(row.instanceId, row.action);
      }
    }

    const serialized = await Promise.all(
      data.map(async (item) => {
        const hydrated = await this.hydrateRequest(item);
        const ser = this.serializeRequest(hydrated);
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

    const conditions: (SQL | undefined)[] = [
      eq(leaveBalanceLedger.userId, actorId),
      eq(leaveBalanceLedger.periodYear, year),
      this.tenanted(leaveBalanceLedger.tenantId, this.tenantContext.currentTenantId())
    ];
    if (leaveTypeKey) conditions.push(eq(leaveBalanceLedger.leaveTypeKey, leaveTypeKey));

    const [rows, aggregate] = await Promise.all([
      this.db.client
        .select()
        .from(leaveBalanceLedger)
        .where(and(...conditions))
        .orderBy(asc(leaveBalanceLedger.createdAt))
        .execute(),
      this.db.client
        .select({ leaveTypeKey: leaveBalanceLedger.leaveTypeKey, sum: sql<string>`sum(${leaveBalanceLedger.deltaDays})` })
        .from(leaveBalanceLedger)
        .where(and(...conditions))
        .groupBy(leaveBalanceLedger.leaveTypeKey)
        .orderBy(asc(leaveBalanceLedger.leaveTypeKey))
        .execute()
    ]);

    const entitlements = await this.resolveLeaveEntitlements(actorId, year);
    const aggregateByKey = new Map<string, number>();
    for (const entry of aggregate) {
      aggregateByKey.set(entry.leaveTypeKey, Number(entry.sum ?? 0));
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
    return this.db.client
      .select()
      .from(workflowHistory)
      .where(and(eq(workflowHistory.instanceId, request.workflowInstanceId), this.templated(workflowHistory.tenantId, this.tenantContext.currentTenantId())));
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
    const [voucher] = await this.db.client
      .select()
      .from(financePaymentVoucher)
      .where(and(eq(financePaymentVoucher.requestId, request.id), eq(financePaymentVoucher.id, voucherId)))
      .limit(1);
    if (!voucher) throw new NotFoundException('Payment voucher not found');

    const metadata =
      voucher.metadata && typeof voucher.metadata === 'object' && !Array.isArray(voucher.metadata)
        ? ({ ...(voucher.metadata as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    await this.db.client
      .update(financePaymentVoucher)
      .set({
        metadata: {
          ...metadata,
          confirmed_by: userId,
          confirmed_at: new Date().toISOString()
        } as any
      })
      .where(eq(financePaymentVoucher.id, voucher.id));
    await this.logWorkflowEvent(request.workflowInstanceId, 'pv_confirmed', userId, {
      request_id: request.id.toString(),
      voucher_id: voucher.id,
      voucher_number: voucher.voucherNumber
    });

    const vouchers = await this.db.client
      .select({ amount: financePaymentVoucher.amount, grossAmount: financePaymentVoucher.grossAmount })
      .from(financePaymentVoucher)
      .where(eq(financePaymentVoucher.requestId, request.id));
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
      await this.ensureFileAssetsExist(this.db.client, dto.retirement_file_ids);
    }

    if (request.status === 'retired') {
      const resetWhere = dto.voucher_id
        ? and(eq(financePaymentVoucher.requestId, request.id), eq(financePaymentVoucher.id, dto.voucher_id))
        : eq(financePaymentVoucher.requestId, request.id);
      await this.db.client
        .update(financePaymentVoucher)
        .set({ retiredAmount: '0', retirementStatus: 'not_retired' })
        .where(resetWhere);
    }

    const retirementResult = await this.applyRetirementToPaymentVouchers(request.id, dto);
    const shouldMarkRetired = retirementResult.outstanding_after <= 0;
    const nextStatus = shouldMarkRetired ? 'retired' : request.status;
    const retirementAction = shouldMarkRetired ? 'retire' : 'retire_partial';

    const [updated] = await this.db.client
      .update(requestInstance)
      .set({
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
        ) as any
      })
      .where(and(eq(requestInstance.id, request.id), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .returning();
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
    const vouchers = await this.db.client
      .select()
      .from(financePaymentVoucher)
      .where(eq(financePaymentVoucher.requestId, request.id))
      .orderBy(asc(financePaymentVoucher.disbursedAt));
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
    const [deductionAggRow] = await this.db.client
      .select({ sum: sql<string>`coalesce(sum(${financeRequestDeduction.amount}), 0)` })
      .from(financeRequestDeduction)
      .where(eq(financeRequestDeduction.requestId, request.id));
    const totalDeducted = Number(deductionAggRow?.sum ?? 0);
    if (retirementOutstanding - totalDeducted - totalRefunded > 0.009) {
      throw new BadRequestException('Cannot complete request until all payment vouchers are fully retired');
    }

    const vouchersToVerify = vouchers.filter((voucher) => voucher.retirementStatus === 'retired');
    if (vouchersToVerify.length > 0) {
      await this.db.client
        .update(financePaymentVoucher)
        .set({
          retirementStatus: 'verified',
          verifiedAt: new Date()
        })
        .where(inArray(financePaymentVoucher.id, vouchersToVerify.map((voucher) => voucher.id)));
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

    const [budget] = await this.db.client
      .select()
      .from(financeBudget)
      .where(and(eq(financeBudget.id, String(data.budget_id)), this.tenanted(financeBudget.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    const activeRevision = budget ? await this.budgetRevisionWithLines(budget.currentActiveRevisionId) : null;
    if (!budget || budget.status !== 'approved' || !activeRevision) {
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

    const line = activeRevision.lines.find((entry) => entry.id === String(data.budget_line_id));
    if (!line) throw new BadRequestException('Invalid budget_line_id');

    return {
      budgetId: budget.id,
      budgetRevisionId: activeRevision.id,
      budgetLineId: line.id,
      amount: Number(line.totalAmount ?? line.amount ?? 0),
    };
  }

  private withBudgetSelection(data: Record<string, any>, selection: { budgetId: string; budgetRevisionId: string; budgetLineId: string } | null) {
    const base = { ...data } as Record<string, unknown>;
    if (!selection) return base;
    return {
      ...base,
      budget_id: selection.budgetId,
      budget_revision_id: selection.budgetRevisionId,
      budget_line_id: selection.budgetLineId,
    };
  }

  private async syncBudgetCommitmentForRequest(request: {
    id: bigint;
    status: string;
    totalAmount?: string | number | null;
    data?: unknown;
  }) {
    const data = request.data && typeof request.data === 'object' && !Array.isArray(request.data)
      ? (request.data as Record<string, any>)
      : {};

    if (!data.budget_id || !data.budget_line_id || !data.budget_revision_id) {
      await this.db.client
        .update(financeBudgetCommitment)
        .set({ status: 'released', actualizedAmount: null })
        .where(eq(financeBudgetCommitment.requestId, request.id));
      return;
    }

    const requestStatus = String(request.status);
    const status = ['payment_processing', 'disbursed', 'confirmed', 'retired', 'completed'].includes(requestStatus)
      ? 'consumed'
      : ['sent', 'approval', 'approved', 'cleared'].includes(requestStatus)
        ? 'reserved'
        : 'released';
    const amount = Number(request.totalAmount ?? 0);

    await this.db.client
      .insert(financeBudgetCommitment)
      .values({
        budgetId: String(data.budget_id),
        budgetRevisionId: String(data.budget_revision_id),
        budgetLineId: String(data.budget_line_id),
        requestId: request.id,
        status,
        committedAmount: String(amount),
        actualizedAmount: status === 'consumed' ? String(amount) : null,
      })
      .onConflictDoUpdate({
        target: [financeBudgetCommitment.requestId, financeBudgetCommitment.budgetLineId],
        set: {
          status,
          committedAmount: String(amount),
          actualizedAmount: status === 'consumed' ? String(amount) : null,
        },
      });
  }

  private async getRequestOrThrow(id: string) {
    const [request] = await this.db.client
      .select()
      .from(requestInstance)
      .where(and(eq(requestInstance.id, toBigInt(id)), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  private async hasEligibleHandoverColleague(userId: bigint): Promise<boolean> {
    const memberships = await this.db.client
      .select({ groupId: groupUser.groupId })
      .from(groupUser)
      .where(eq(groupUser.userId, userId));
    if (!memberships.length) return false;
    const [colleague] = await this.db.client
      .select({ id: groupUser.id })
      .from(groupUser)
      .where(and(inArray(groupUser.groupId, memberships.map((m) => m.groupId)), ne(groupUser.userId, userId)))
      .limit(1);
    return Boolean(colleague);
  }

  private async validateLeaveRequestPayload(
    requestType: { name?: string | null; taxonomyKeys?: string[] | null; formSchema?: unknown } | null,
    data: unknown,
    userId: string
  ) {
    if (!isLeaveRequestType(requestType?.name ?? null, (requestType?.taxonomyKeys as string[] | null) ?? null, requestType?.formSchema)) {
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

    const existingDebit = await this.db.client
      .select()
      .from(leaveBalanceLedger)
      .where(and(eq(leaveBalanceLedger.sourceRequestId, requestId), eq(leaveBalanceLedger.entryType, 'request_debit'), this.tenanted(leaveBalanceLedger.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (existingDebit[0]) return;

    await this.ensureLeaveBalanceForApproval(requestId);

    const tid = this.tenantContext.currentTenantId();
    await this.db.client.insert(leaveBalanceLedger).values({
      ...(tid !== undefined ? { tenantId: tid } : {}),
      userId: leave.user_id,
      leaveTypeKey: leave.leave_type_key,
      periodYear: leave.period_year,
      deltaDays: String(-leave.days_requested),
      entryType: 'request_debit',
      sourceRequestId: requestId,
      notes: `Leave approved for request ${requestId.toString()}`,
      createdBy: toBigInt(actorId),
      metadata: {
        request_id: requestId.toString(),
        leave_type_key: leave.leave_type_key
      } as any
    });
  }

  private async ensureLeaveBalanceForApproval(requestId: bigint) {
    const leave = await this.getLeaveRequestMeta(requestId);
    if (!leave) return;

    const existingDebit = await this.db.client
      .select()
      .from(leaveBalanceLedger)
      .where(and(eq(leaveBalanceLedger.sourceRequestId, requestId), eq(leaveBalanceLedger.entryType, 'request_debit'), this.tenanted(leaveBalanceLedger.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (existingDebit[0]) return;

    const [request] = await this.db.client
      .select({ data: requestInstance.data })
      .from(requestInstance)
      .where(and(eq(requestInstance.id, requestId), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    const requestData = request?.data && typeof request.data === 'object' && !Array.isArray(request.data) ? (request.data as any) : {};
    if (requestData.is_special_request === true) return;

    const entitlements = await this.resolveLeaveEntitlements(leave.user_id, leave.period_year);
    const entitledDays = Number(entitlements[leave.leave_type_key] ?? 0);

    const [aggregateRow] = await this.db.client
      .select({ sum: sql<string>`coalesce(sum(${leaveBalanceLedger.deltaDays}), 0)` })
      .from(leaveBalanceLedger)
      .where(
        and(
          eq(leaveBalanceLedger.userId, leave.user_id),
          eq(leaveBalanceLedger.leaveTypeKey, leave.leave_type_key),
          eq(leaveBalanceLedger.periodYear, leave.period_year),
          this.tenanted(leaveBalanceLedger.tenantId, this.tenantContext.currentTenantId())
        )
      );
    const ledgerDelta = Number(aggregateRow?.sum ?? 0);
    const availableDays = entitledDays + ledgerDelta;
    if (availableDays < leave.days_requested) {
      throw new BadRequestException(
        `Insufficient leave balance for ${leave.leave_type_key}. Available ${availableDays}, requested ${leave.days_requested}`
      );
    }
  }

  private async revertLeaveDebitIfNeeded(requestId: bigint, actorId: string, reason: string) {
    const [debit] = await this.db.client
      .select()
      .from(leaveBalanceLedger)
      .where(and(eq(leaveBalanceLedger.sourceRequestId, requestId), eq(leaveBalanceLedger.entryType, 'request_debit'), this.tenanted(leaveBalanceLedger.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    const debitRow = debit ?? null;
    if (!debitRow) return;

    const [existingReversal] = await this.db.client
      .select()
      .from(leaveBalanceLedger)
      .where(and(eq(leaveBalanceLedger.sourceRequestId, requestId), eq(leaveBalanceLedger.entryType, 'reversal'), this.tenanted(leaveBalanceLedger.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (existingReversal) return;

    const tid = this.tenantContext.currentTenantId();
    await this.db.client.insert(leaveBalanceLedger).values({
      ...(tid !== undefined ? { tenantId: tid } : {}),
      userId: debitRow.userId,
      leaveTypeKey: debitRow.leaveTypeKey,
      periodYear: debitRow.periodYear,
      deltaDays: String(Math.abs(Number(debitRow.deltaDays))),
      entryType: 'reversal',
      sourceRequestId: requestId,
      notes: `Leave debit reversed: ${reason}`,
      createdBy: toBigInt(actorId),
      metadata: {
        request_id: requestId.toString(),
        reason
      } as any
    });
  }

  private async getLeaveRequestMeta(requestId: bigint): Promise<{
    user_id: bigint;
    leave_type_key: string;
    days_requested: number;
    period_year: number;
  } | null> {
    const [raw] = await this.db.client
      .select()
      .from(requestInstance)
      .where(and(eq(requestInstance.id, requestId), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (!raw) return null;
    const [lightType] = raw.requestTypeId
      ? await this.db.client
          .select({ name: requestType.name, taxonomyKeys: requestType.taxonomyKeys, formSchema: requestType.formSchema })
          .from(requestType)
          .where(eq(requestType.id, raw.requestTypeId))
          .limit(1)
      : [];
    const request = { ...raw, requestType: lightType ?? null };
    if (
      !isLeaveRequestType(
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
    const leaveTypeRaw = resolveLeaveTypeKey(request.requestType?.name ?? null, request.requestType?.formSchema ?? null, data);

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

    const rows = await this.db.client
      .select()
      .from(policy)
      .where(
        and(
          eq(policy.module, 'leave'),
          inArray(policy.policyKey, ['leave_entitlements', 'entitlement']),
          ne(policy.scopeType, 'global'),
          eq(policy.isActive, true),
          or(isNull(policy.effectiveFrom), lte(policy.effectiveFrom, now)),
          or(isNull(policy.effectiveTo), gte(policy.effectiveTo, now)),
          this.templated(policy.tenantId, this.tenantContext.currentTenantId())
        )
      )
      .orderBy(asc(policy.scopeType), asc(policy.priority), asc(policy.createdAt));

    const matched = rows
      .filter((row) => {
        if (!context) return row.scopeType === 'global';
        return policyScopeMatches(row.scopeType, row.scopeId, context);
      })
      .sort((a, b) => {
        const rankDelta = policyScopeRank(a.scopeType) - policyScopeRank(b.scopeType);
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
      const previousDeltaRows = await this.db.client
        .select({ leaveTypeKey: leaveBalanceLedger.leaveTypeKey, sum: sql<string>`sum(${leaveBalanceLedger.deltaDays})` })
        .from(leaveBalanceLedger)
        .where(
          and(
            eq(leaveBalanceLedger.userId, userId),
            eq(leaveBalanceLedger.periodYear, previousYear),
            this.tenanted(leaveBalanceLedger.tenantId, this.tenantContext.currentTenantId())
          )
        )
        .groupBy(leaveBalanceLedger.leaveTypeKey);
      const previousDeltaByKey = new Map(
        previousDeltaRows.map((row) => [row.leaveTypeKey, Number(row.sum ?? 0)])
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

  private async getDefaultLeaveRulesFromRequestTypes() {
    const types = await this.db.client
      .select({ name: requestType.name, taxonomyKeys: requestType.taxonomyKeys, formSchema: requestType.formSchema })
      .from(requestType)
      .where(eq(requestType.isActive, true));

    const defaults: Record<string, number> = {};
    const carryoverCaps: Record<string, number> = {};
    for (const type of types) {
      if (!isLeaveRequestType(type.name, type.taxonomyKeys as string[] | null, type.formSchema)) continue;
      const schema = objectSchema(type.formSchema);
      const key = resolveLeaveTypeKey(type.name, schema);
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
    const tid = this.tenantContext.currentTenantId();
    const profileScope = await this.profileScope(tid);
    const [profileRow] = await this.db.client
      .select({ id: profile.id, primaryOrganizationId: profile.primaryOrganizationId })
      .from(profile)
      .where(and(eq(profile.id, userId), profileScope))
      .limit(1);
    const [employee] = await this.db.client
      .select({ employmentType: employeeProfile.employmentType })
      .from(employeeProfile)
      .where(and(eq(employeeProfile.userId, userId), this.tenanted(employeeProfile.tenantId, tid)))
      .limit(1);
    const [primaryTeam] = await this.db.client
      .select({ groupId: groupUser.groupId })
      .from(groupUser)
      .where(and(eq(groupUser.userId, userId), eq(groupUser.isPrimary, true)))
      .limit(1);

    return {
      user_id: userId.toString(),
      organization_id: profileRow?.primaryOrganizationId?.toString(),
      team_id: primaryTeam?.groupId?.toString(),
      staff_type: employee?.employmentType ?? undefined
    };
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
    const [request] = await this.db.client
      .select({ id: requestInstance.id, createdAt: requestInstance.createdAt, requestTypeId: requestInstance.requestTypeId })
      .from(requestInstance)
      .where(and(eq(requestInstance.id, requestId), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (!request) return `REQ/${new Date().getFullYear()}/${requestId.toString()}`;

    const [lightType] = request.requestTypeId
      ? await this.db.client
          .select({ codePrefix: requestType.codePrefix })
          .from(requestType)
          .where(eq(requestType.id, request.requestTypeId))
          .limit(1)
      : [];

    return this.getRequestNumber(lightType?.codePrefix ?? undefined, request.createdAt.getFullYear(), request.id);
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
    const [raw] = await this.db.client
      .select({
        id: requestInstance.id,
        createdAt: requestInstance.createdAt,
        data: requestInstance.data,
        currency: requestInstance.currency,
        totalAmount: requestInstance.totalAmount,
        requestTypeId: requestInstance.requestTypeId,
        createdBy: requestInstance.createdBy,
      })
      .from(requestInstance)
      .where(and(eq(requestInstance.id, requestId), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);

    if (!raw) {
      return {
        requestNumber: `REQ/${new Date().getFullYear()}/${requestId.toString()}`,
        requestTypeName: 'Request',
        requesterName: 'Unknown sender',
        requesterEmail: null,
        primaryMetricLabel: 'Amount',
        primaryMetricValue: '-'
      };
    }

    const [lightType] = raw.requestTypeId
      ? await this.db.client
          .select({ name: requestType.name, codePrefix: requestType.codePrefix, taxonomyKeys: requestType.taxonomyKeys, formSchema: requestType.formSchema })
          .from(requestType)
          .where(eq(requestType.id, raw.requestTypeId))
          .limit(1)
      : [];
    const creator = raw.createdBy != null ? await this.creatorLight(raw.createdBy) : null;
    const items = await this.db.client
      .select({ amount: requestItem.amount, quantity: requestItem.quantity })
      .from(requestItem)
      .where(eq(requestItem.requestId, raw.id));
    const request = { ...raw, requestType: lightType ?? null, creator, items };

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
    const isLeaveRequest = isLeaveRequestType(
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
    const instance = await this.workflowInstanceWithDetails(instanceId);

    if (!instance) return { done: [], pending: [] };

    const steps = instance.workflow?.steps ?? [];
    const stepMap = new Map(steps.map((step) => [step.id, step.name]));
    const performerIds = Array.from(
      new Set(
        instance.history
          .map((entry) => (entry.performedBy ? entry.performedBy.toString() : null))
          .filter((id): id is string => Boolean(id))
      )
    );
    const scope = await this.profileScope(this.tenantContext.currentTenantId());
    const performers =
      performerIds.length > 0
        ? await this.db.client
            .select({ id: profile.id, username: profile.username, email: profile.email, firstName: profile.firstName, lastName: profile.lastName })
            .from(profile)
            .where(and(inArray(profile.id, (performerIds as string[]).map((id) => toBigInt(id))), scope))
        : [];
    const performerMap = new Map<string, { name: string; email: string | null }>(
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

    const required_steps = steps.sort((a, b) => a.order - b.order).map((step) => ({
        step: step.name,
        role: (step.config as Record<string, any>)?.role ?? null,
        approver: (step.config as Record<string, any>)?.approver ?? null,
      }));

    return { done, pending, required_steps };
  }

  private async ensureFileAssetsExist(tx: any, fileIds: string[]) {
    const [row] = await tx
      .select({ c: count() })
      .from(fileAsset)
      .where(and(inArray(fileAsset.id, fileIds), this.tenanted(fileAsset.tenantId, this.tenantContext.currentTenantId())));
    if (Number(row?.c ?? 0) !== fileIds.length) {
      throw new BadRequestException('One or more request item files are invalid');
    }
  }

  private async transitionRequestStatus(
    request: { id: bigint; status: string; data: unknown },
    nextStatus: string,
    actorId: string,
    details?: { action?: string; comment?: string }
  ) {
    const [row] = await this.db.client
      .update(requestInstance)
      .set({
        status: nextStatus as any,
        data: this.withStateEvent(request.data, {
          from: request.status,
          to: nextStatus,
          by: actorId,
          action: details?.action,
          comment: details?.comment
        }) as any
      })
      .where(and(eq(requestInstance.id, request.id), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .returning();
    return row;
  }

  private withStateEvent(
    data: unknown,
    event: { from: string; to: string; by: string; action?: string; comment?: string }
  ): Record<string, unknown> {
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
    };
  }

  private withRetirementData(data: Record<string, unknown>, dto: RetireRequestDto): Record<string, unknown> {
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
    };
  }

  private async applyRetirementToPaymentVouchers(requestId: bigint, dto: RetireRequestDto) {
    const voucherWhere = dto.voucher_id
      ? and(eq(financePaymentVoucher.requestId, requestId), eq(financePaymentVoucher.id, dto.voucher_id))
      : eq(financePaymentVoucher.requestId, requestId);
    const vouchers = await this.db.client
      .select()
      .from(financePaymentVoucher)
      .where(voucherWhere)
      .orderBy(asc(financePaymentVoucher.disbursedAt));
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
      const allVouchers = await this.db.client
        .select()
        .from(financePaymentVoucher)
        .where(eq(financePaymentVoucher.requestId, requestId));
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

      await this.db.client
        .update(financePaymentVoucher)
        .set({
          retiredAmount: String(nextRetired),
          retirementStatus: nextStatus,
          retiredAt: new Date(),
          metadata: {
            ...(voucher.metadata && typeof voucher.metadata === 'object' && !Array.isArray(voucher.metadata)
              ? (voucher.metadata as Record<string, unknown>)
              : {}),
            retirement_notes: dto.notes ?? null,
            retirement_file_ids: dto.retirement_file_ids ?? [],
            breakdown: dto.breakdown ?? null
          } as any
        })
        .where(eq(financePaymentVoucher.id, voucher.id));
      touched.push({ id: voucher.id, voucher_number: voucher.voucherNumber, allocated: allocate });

      remaining -= allocate;
    }

    const allVouchers = await this.db.client
      .select()
      .from(financePaymentVoucher)
      .where(eq(financePaymentVoucher.requestId, requestId));
    const outstanding = allVouchers.reduce(
      (sum, voucher) => sum + Math.max(0, Number(voucher.amount) - Number(voucher.retiredAmount)),
      0
    );
    return { outstanding_after: outstanding, touched_vouchers: touched };
  }

  private async isPendingApprovalForUser(requestId: string, userId: string) {
    const [request] = await this.db.client
      .select({ workflowInstanceId: requestInstance.workflowInstanceId, teamId: requestInstance.teamId, status: requestInstance.status })
      .from(requestInstance)
      .where(and(eq(requestInstance.id, toBigInt(requestId)), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (!request?.workflowInstanceId || !['sent', 'approval'].includes(request.status)) return false;

    const [instance] = await this.db.client
      .select()
      .from(workflowInstance)
      .where(and(eq(workflowInstance.id, request.workflowInstanceId), this.templated(workflowInstance.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (!instance || instance.status !== 'pending' || !instance.currentStepId) return false;
    const currentStep = await this.currentStepWithApprovers(instance.currentStepId);
    if (!currentStep) return false;

    for (const approver of currentStep.approvers) {
      if (await this.userMatchesCurrentApprover({ approverType: approver.approverType, approverId: approver.approverId }, request.teamId, userId)) return true;
    }

    return false;
  }

  private isWorkflowInactiveError(error: unknown) {
    const message = String((error as Error)?.message ?? '').toLowerCase();
    return message.includes('workflow instance is not active') || message.includes('workflow instance not found');
  }

  private async listCurrentApproverUserIds(requestId: bigint): Promise<string[]> {
    const [request] = await this.db.client
      .select({ teamId: requestInstance.teamId, workflowInstanceId: requestInstance.workflowInstanceId })
      .from(requestInstance)
      .where(and(eq(requestInstance.id, requestId), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (!request?.workflowInstanceId) return [];
    const [instance] = await this.db.client
      .select()
      .from(workflowInstance)
      .where(and(eq(workflowInstance.id, request.workflowInstanceId), this.templated(workflowInstance.tenantId, this.tenantContext.currentTenantId())))
      .limit(1);
    if (!instance?.currentStepId || instance.status !== 'pending') return [];
    const currentStep = await this.currentStepWithApprovers(instance.currentStepId);
    if (!currentStep) return [];

    const userIds = new Set<string>();
    for (const approver of currentStep.approvers) {
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
      const [row] = await this.db.client
        .select({ c: count() })
        .from(groupUser)
        .where(and(eq(groupUser.groupId, teamId), eq(groupUser.userId, toBigInt(userId)), eq(groupUser.role, 'moderator')));
      return Number(row?.c ?? 0) > 0;
    }

    if (
      (approverType === 'relation' && approverId === 'requester_team_lead_or_manager') ||
      (approverType === 'role' && (approverId === 'team_lead_or_manager' || approverId === 'manager'))
    ) {
      if (teamId) {
        const [row] = await this.db.client
          .select({ c: count() })
          .from(groupUser)
          .where(and(eq(groupUser.groupId, teamId), eq(groupUser.userId, toBigInt(userId)), inArray(groupUser.role, ['moderator', 'admin'])));
        if (Number(row?.c ?? 0) > 0) return true;
      }

      const [row] = await this.db.client
        .select({ c: count() })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .where(and(eq(userRole.profileId, toBigInt(userId)), eq(role.slug, 'manager'), this.tenanted(userRole.tenantId, this.tenantContext.currentTenantId())));
      return Number(row?.c ?? 0) > 0;
    }

    if (approverType === 'office' || approverType === 'role') {
      const roleSlugs =
        approverType === 'role' && approverId === 'accountant'
          ? ['accountant', 'finance_manager']
          : [approverId];
      const [row] = await this.db.client
        .select({ c: count() })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .where(and(eq(userRole.profileId, toBigInt(userId)), inArray(role.slug, roleSlugs), this.tenanted(userRole.tenantId, this.tenantContext.currentTenantId())));
      if (Number(row?.c ?? 0) > 0) return true;
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

      const [row] = await this.db.client
        .select({ c: count() })
        .from(rolePermission)
        .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
        .innerJoin(role, eq(rolePermission.roleId, role.id))
        .innerJoin(userRole, eq(userRole.roleId, role.id))
        .where(and(eq(permission.slug, permissionSlug), eq(userRole.profileId, toBigInt(userId)), this.tenanted(userRole.tenantId, this.tenantContext.currentTenantId())));
      if (Number(row?.c ?? 0) > 0) return true;


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
      const rows = await this.db.client
        .select({ userId: groupUser.userId })
        .from(groupUser)
        .where(and(eq(groupUser.groupId, teamId), eq(groupUser.role, 'moderator')));
      return rows.map((row) => row.userId.toString());
    }

    if (
      (approverType === 'relation' && approverId === 'requester_team_lead_or_manager') ||
      (approverType === 'role' && (approverId === 'team_lead_or_manager' || approverId === 'manager'))
    ) {
      const ids = new Set<string>();
      if (teamId) {
        const rows = await this.db.client
          .select({ userId: groupUser.userId })
          .from(groupUser)
          .where(and(eq(groupUser.groupId, teamId), inArray(groupUser.role, ['moderator', 'admin'])));
        for (const row of rows) ids.add(row.userId.toString());
      }

      const managers = await this.db.client
        .select({ profileId: userRole.profileId })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .where(and(eq(role.slug, 'manager'), this.tenanted(userRole.tenantId, this.tenantContext.currentTenantId())));
      for (const row of managers) ids.add(row.profileId.toString());
      return Array.from(ids);
    }

    const ids = new Set<string>();

    if (approverType === 'office' || approverType === 'role') {
      const roleSlugs =
        approverType === 'role' && approverId === 'accountant'
          ? ['accountant', 'finance_manager']
          : [approverId];
      const directRoleUsers = await this.db.client
        .select({ profileId: userRole.profileId })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .where(and(inArray(role.slug, roleSlugs), this.tenanted(userRole.tenantId, this.tenantContext.currentTenantId())));
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
      const permissionUsers = await this.db.client
        .select({ profileId: userRole.profileId })
        .from(userRole)
        .innerJoin(role, eq(userRole.roleId, role.id))
        .innerJoin(rolePermission, eq(rolePermission.roleId, role.id))
        .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
        .where(and(eq(permission.slug, permissionSlug), this.tenanted(userRole.tenantId, this.tenantContext.currentTenantId())));
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
        userId: String(targetUserId),
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
      const [requestRow] = await this.db.client
        .select({ workflowInstanceId: requestInstance.workflowInstanceId })
        .from(requestInstance)
        .where(and(eq(requestInstance.id, requestId), this.tenanted(requestInstance.tenantId, this.tenantContext.currentTenantId())))
        .limit(1);
      instanceId = requestRow?.workflowInstanceId;
    }
    if (!instanceId) return;

    const history = await this.db.client
      .select({ performedBy: workflowHistory.performedBy })
      .from(workflowHistory)
      .where(eq(workflowHistory.instanceId, instanceId));

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
        userId: String(targetUserId),
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
    await this.db.client.insert(workflowHistory).values({
        instanceId,
        action,
        performedBy: toBigInt(performedBy),
        data: (data ?? {}) as any
    });
  }

  private async ensureStaffRequestSequenceFloor(db: { execute: (query: SQL) => Promise<unknown> }) {
    const floor = (STAFF_REQUEST_SEQUENCE_START - BigInt(1)).toString();
    await db.execute(sql`SELECT setval(pg_get_serial_sequence('sta_request_instances','id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM sta_request_instances), CAST(${floor} AS bigint)), true)`);
  }
}
