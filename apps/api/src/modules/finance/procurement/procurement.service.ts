import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, inArray, notExists, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { WorkflowService } from '$modules/hrm/workflow/workflow.service';
import { NotificationsService } from '$modules/hrm/notifications/notifications.service';
import { MailService } from '$common/mail/mail.service';
import { MailQueueService } from '$common/mail/mail-queue.service';
import { ProcurementDocumentFacadeService } from '$modules/finance/procurement/documents/procurement-document-facade.service';
import { toBigInt } from '$common/utils/ids';
import { CreatePrDto } from '$modules/finance/procurement/dto/create-pr.dto';
import { CreatePoDto } from '$modules/finance/procurement/dto/create-po.dto';
import { CreateGrnDto } from '$modules/finance/procurement/dto/create-grn.dto';
import { ConfirmGrnDto } from '$modules/finance/procurement/dto/confirm-grn.dto';
import { AttachProcurementFileDto } from '$modules/finance/procurement/dto/attach-procurement-file.dto';
import { PurchaseOrderDocument } from '$modules/finance/procurement/documents/purchase-order.document';
import { procurementAttachment, procurementCase, procurementGRN, procurementOrder, procurementRequisition } from './model';
import { fileAsset } from '$modules/storage/model';
import { financeContact, financeContactPerson } from '$modules/finance/finance/model';
import { profile } from '$modules/identity/users/model';
import { requestInstance, requestType } from '$modules/hrm/requests/model';
import { permission, role, rolePermission, userRole } from '$modules/identity/rbac/model';

@Injectable()
export class ProcurementService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly workflowService: WorkflowService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly mailQueue: MailQueueService,
    private readonly documentGenerator: ProcurementDocumentFacadeService,
  ) {}

  private requiredTenantId(): bigint {
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId === undefined) {
      throw new BadRequestException('Tenant context is required to create procurement records');
    }
    return tenantId;
  }

  private requisitionConditions(): SQL[] {
    const conditions: SQL[] = [];
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) conditions.push(eq(procurementRequisition.tenantId, tenantId));
    return conditions;
  }

  private orderConditions(): SQL[] {
    const conditions: SQL[] = [];
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) conditions.push(eq(procurementOrder.tenantId, tenantId));
    return conditions;
  }

  private requestConditions(): SQL[] {
    const conditions: SQL[] = [];
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) conditions.push(eq(requestInstance.tenantId, tenantId));
    return conditions;
  }

  private fileConditions(): SQL[] {
    const conditions: SQL[] = [];
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) conditions.push(eq(fileAsset.tenantId, tenantId));
    return conditions;
  }

  private async nextNumber(prefix: 'PR' | 'PO' | 'GRN'): Promise<string> {
    const year = new Date().getFullYear();
    const base = 500;
    if (prefix === 'PR') {
      const [row] = await this.db.client
        .select({ value: count() })
        .from(procurementRequisition)
        .where(and(...this.requisitionConditions()));
      return `PR-${year}-${String(base + Number(row?.value ?? 0) + 1).padStart(4, '0')}`;
    }
    if (prefix === 'PO') {
      const [row] = await this.db.client
        .select({ value: count() })
        .from(procurementOrder)
        .where(and(...this.orderConditions()));
      return `PO-${year}-${String(base + Number(row?.value ?? 0) + 1).padStart(4, '0')}`;
    }
    const [row] = await this.db.client.select({ value: count() }).from(procurementGRN);
    return `GRN-${year}-${String(base + Number(row?.value ?? 0) + 1).padStart(4, '0')}`;
  }

  private async findRequisitionById(id: string) {
    const [row] = await this.db.client
      .select()
      .from(procurementRequisition)
      .where(and(eq(procurementRequisition.id, id), ...this.requisitionConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findCaseForRequisition(requisitionId: string) {
    const [row] = await this.db.client
      .select()
      .from(procurementCase)
      .where(eq(procurementCase.requisitionId, requisitionId))
      .limit(1);
    return row ?? null;
  }

  private async findCaseWithDetails(id: string) {
    const [row] = await this.db.client
      .select({ c: procurementCase, requisition: procurementRequisition, request: requestInstance })
      .from(procurementCase)
      .leftJoin(procurementRequisition, eq(procurementCase.requisitionId, procurementRequisition.id))
      .leftJoin(requestInstance, eq(procurementCase.requestId, requestInstance.id))
      .where(eq(procurementCase.id, id))
      .limit(1);
    if (!row) return null;
    return { ...row.c, requisition: row.requisition ?? null, request: row.request ?? null };
  }

  private async findOrderById(id: string) {
    const [row] = await this.db.client
      .select()
      .from(procurementOrder)
      .where(and(eq(procurementOrder.id, id), ...this.orderConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findGrnById(id: string) {
    const [row] = await this.db.client
      .select()
      .from(procurementGRN)
      .where(eq(procurementGRN.id, id))
      .limit(1);
    return row ?? null;
  }

  private async findFile(id: string) {
    const [row] = await this.db.client
      .select({ id: fileAsset.id })
      .from(fileAsset)
      .where(and(eq(fileAsset.id, id), ...this.fileConditions()))
      .limit(1);
    return row ?? null;
  }

  private async findRequestWithType(id: bigint) {
    const [row] = await this.db.client
      .select({ request: requestInstance, requestType: requestType })
      .from(requestInstance)
      .leftJoin(requestType, eq(requestInstance.requestTypeId, requestType.id))
      .where(and(eq(requestInstance.id, id), ...this.requestConditions()))
      .limit(1);
    if (!row) return null;
    return { ...row.request, requestType: row.requestType ?? null };
  }

  private async resolveVendor(vendorId: string | null | undefined) {
    if (!vendorId) return null;
    const [vendor] = await this.db.client
      .select({ id: financeContact.id, name: financeContact.name, email: financeContact.email })
      .from(financeContact)
      .where(eq(financeContact.id, vendorId))
      .limit(1);
    if (!vendor) return null;
    const contactPersons = await this.db.client
      .select({
        id: financeContactPerson.id,
        email: financeContactPerson.email,
        firstName: financeContactPerson.firstName,
        lastName: financeContactPerson.lastName,
        isPrimary: financeContactPerson.isPrimary,
      })
      .from(financeContactPerson)
      .where(eq(financeContactPerson.contactId, vendorId))
      .orderBy(desc(financeContactPerson.isPrimary));
    return { ...vendor, contactPersons };
  }

  async createPr(userId: string, dto: CreatePrDto) {
    const number = await this.nextNumber('PR');
    const estimatedTotal = dto.items.reduce((sum, i) => sum + i.qty * i.estimatedUnitCost, 0);
    const [requisition] = await this.db.client
      .insert(procurementRequisition)
      .values({
        requisitionNumber: number,
        tenantId: this.requiredTenantId(),
        title: dto.title,
        category: dto.category,
        paymentPattern: dto.paymentPattern,
        items: dto.items as any,
        estimatedTotal: String(estimatedTotal),
        justification: dto.justification,
        budgetLineId: dto.budgetLineId,
        teamId: dto.teamId ? toBigInt(dto.teamId) : null,
        requestedBy: toBigInt(userId),
        status: 'draft',
      })
      .returning();
    return requisition;
  }

  async submitPr(id: string, userId: string) {
    const pr = await this.findRequisitionById(id);
    if (!pr) throw new NotFoundException('Requisition not found');
    if (pr.status !== 'draft') throw new BadRequestException('Only draft requisitions can be submitted');

    const approvalFlowJson = { steps: [{ approverType: 'hod' }, { approverType: 'procurement_officer' }] };
    const { instanceId } = await this.workflowService.startForEntity({
      entityId: id,
      entityType: 'procurement_requisition',
      approvalFlowJson,
      initiatedBy: userId,
      amount: Number(pr.estimatedTotal),
      name: `${pr.requisitionNumber} Approval`,
    });

    const [updated] = await this.db.client
      .update(procurementRequisition)
      .set({ status: 'submitted', workflowInstanceId: instanceId })
      .where(and(eq(procurementRequisition.id, id), ...this.requisitionConditions()))
      .returning();
    return updated;
  }

  async approvePr(id: string, userId: string, comment?: string) {
    const pr = await this.findRequisitionById(id);
    if (!pr) throw new NotFoundException('Requisition not found');
    const [updated] = await this.db.client
      .update(procurementRequisition)
      .set({ status: 'approved' })
      .where(and(eq(procurementRequisition.id, id), ...this.requisitionConditions()))
      .returning();
    return updated;
  }

  async rejectPr(id: string, userId: string, comment?: string) {
    const pr = await this.findRequisitionById(id);
    if (!pr) throw new NotFoundException('Requisition not found');
    const [updated] = await this.db.client
      .update(procurementRequisition)
      .set({ status: 'rejected' })
      .where(and(eq(procurementRequisition.id, id), ...this.requisitionConditions()))
      .returning();
    return updated;
  }

  async listPrs(userId: string, role: string) {
    const conditions = this.requisitionConditions();
    if (role !== 'procurement_officer' && role !== 'admin') {
      conditions.push(eq(procurementRequisition.requestedBy, toBigInt(userId)));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await this.db.client
      .select({ pr: procurementRequisition, requester: profile })
      .from(procurementRequisition)
      .leftJoin(profile, eq(procurementRequisition.requestedBy, profile.id))
      .where(where)
      .orderBy(desc(procurementRequisition.createdAt));

    const caseRows = rows.length
      ? await this.db.client
          .select({ id: procurementCase.id, requisitionId: procurementCase.requisitionId, status: procurementCase.status, requestId: procurementCase.requestId })
          .from(procurementCase)
          .where(inArray(procurementCase.requisitionId, rows.map((r) => r.pr.id)))
      : [];
    const caseByRequisition = new Map(
      caseRows.map((c) => [c.requisitionId, { id: c.id, status: c.status, requestId: c.requestId }]),
    );

    return rows.map(({ pr, requester }) => ({
      ...pr,
      requester: requester ? { id: requester.id, firstName: requester.firstName, lastName: requester.lastName } : null,
      procurementCase: caseByRequisition.get(pr.id) ?? null,
    }));
  }

  async getPr(id: string) {
    const [row] = await this.db.client
      .select({ pr: procurementRequisition, requester: profile })
      .from(procurementRequisition)
      .leftJoin(profile, eq(procurementRequisition.requestedBy, profile.id))
      .where(and(eq(procurementRequisition.id, id), ...this.requisitionConditions()))
      .limit(1);
    if (!row) throw new NotFoundException('Requisition not found');
    const { pr, requester } = row;

    const purchaseOrders = await this.db.client
      .select()
      .from(procurementOrder)
      .where(and(eq(procurementOrder.requisitionId, pr.id), ...this.orderConditions()))
      .orderBy(desc(procurementOrder.createdAt));

    const caseRow = await this.findCaseForRequisition(pr.id);
    let caseWithDetails: any = null;
    if (caseRow) {
      const [attachments, requestRow] = await Promise.all([
        this.db.client
          .select({ attachment: procurementAttachment, file: fileAsset })
          .from(procurementAttachment)
          .leftJoin(fileAsset, eq(procurementAttachment.fileId, fileAsset.id))
          .where(eq(procurementAttachment.caseId, caseRow.id))
          .orderBy(asc(procurementAttachment.createdAt)),
        this.db.client
          .select({ request: requestInstance, type: requestType })
          .from(requestInstance)
          .leftJoin(requestType, eq(requestInstance.requestTypeId, requestType.id))
          .where(eq(requestInstance.id, caseRow.requestId))
          .limit(1),
      ]);
      caseWithDetails = {
        ...caseRow,
        attachments: attachments.map(({ attachment, file }) => ({ ...attachment, file })),
        request: requestRow[0]
          ? {
              id: requestRow[0].request.id,
              status: requestRow[0].request.status,
              data: requestRow[0].request.data,
              createdAt: requestRow[0].request.createdAt,
              requestType: requestRow[0].type
                ? { id: requestRow[0].type.id, name: requestRow[0].type.name, workflowType: requestRow[0].type.workflowType }
                : null,
            }
          : null,
      };
    }

    return {
      ...pr,
      requester: requester ? { id: requester.id, firstName: requester.firstName, lastName: requester.lastName } : null,
      purchaseOrders,
      procurementCase: caseWithDetails,
    };
  }

  async attachToRequisition(id: string, dto: AttachProcurementFileDto) {
    const pr = await this.findRequisitionById(id);
    if (!pr) throw new NotFoundException('Requisition not found');
    const caseRow = await this.findCaseForRequisition(id);
    if (!caseRow) throw new NotFoundException('Procurement case not found for requisition');

    const file = await this.findFile(dto.fileId);
    if (!file) throw new NotFoundException('File not found');

    const [created] = await this.db.client
      .insert(procurementAttachment)
      .values({
        caseId: caseRow.id,
        fileId: dto.fileId,
        label: dto.label?.trim() || null,
        visibility: dto.visibility,
      })
      .returning();

    return { ...created, file };
  }

  async createPo(userId: string, dto: CreatePoDto) {
    const sourceCase = dto.caseId ? await this.findCaseWithDetails(dto.caseId) : null;

    const requisitionId = dto.requisitionId || sourceCase?.requisitionId || undefined;
    if (!requisitionId) throw new BadRequestException('Requisition or procurement case is required');

    const pr = await this.findRequisitionById(requisitionId);
    if (!pr) throw new NotFoundException('Requisition not found');
    if (pr.status !== 'approved') throw new BadRequestException('Requisition must be approved before creating a PO');

    const caseForRequisition = await this.findCaseForRequisition(requisitionId);
    const linkedCase = sourceCase ?? caseForRequisition;
    if (!linkedCase || !['new', 'under_review', 'sourcing', 'awaiting_po'].includes(linkedCase.status)) {
      throw new BadRequestException('PO can only be created from an executable procurement case');
    }

    const number = await this.nextNumber('PO');
    const totalAmount = dto.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);

    const [po] = await this.db.client
      .insert(procurementOrder)
      .values({
        poNumber: number,
        tenantId: this.requiredTenantId(),
        requisitionId,
        vendorId: dto.vendorId,
        preparedBy: toBigInt(userId),
        items: dto.items as any,
        totalAmount: String(totalAmount),
        paymentPattern: dto.paymentPattern,
        milestones: (dto.milestones as any) ?? null,
        paymentTerms: dto.paymentTerms,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        deliveryAddress: dto.deliveryAddress,
        status: 'draft',
      })
      .returning();

    const { instanceId } = await this.workflowService.startForEntity({
      entityId: po.id,
      entityType: 'procurement_order',
      approvalFlowJson: dto.approvalFlowJson,
      initiatedBy: userId,
      amount: totalAmount,
      name: `${number} Approval`,
    });

    const [updated] = await this.db.client
      .update(procurementOrder)
      .set({ status: 'pending_approval', workflowInstanceId: instanceId })
      .where(and(eq(procurementOrder.id, po.id), ...this.orderConditions()))
      .returning();
    return updated;
  }

  async approvePo(id: string, userId: string, comment?: string) {
    const po = await this.findOrderById(id);
    if (!po) throw new NotFoundException('Order not found');

    const [updated] = await this.db.client
      .update(procurementOrder)
      .set({ status: 'approved' })
      .where(and(eq(procurementOrder.id, id), ...this.orderConditions()))
      .returning();

    const vendor = await this.resolveVendor(po.vendorId);
    const primaryContact = vendor?.contactPersons.find((p) => p.isPrimary) ?? vendor?.contactPersons[0];
    const vendorEmail = primaryContact?.email ?? vendor?.email ?? null;
    if (vendorEmail) {
      await this.mailQueue.enqueue({
        to: vendorEmail,
        subject: `Purchase Order ${po.poNumber} from Stanforte Edge`,
        text: `Dear ${primaryContact?.firstName ?? vendor?.name},\n\nPlease find attached Purchase Order ${po.poNumber}.\n\nView and acknowledge at: ${process.env.APP_URL}/vendor-portal`,
      });
    }

    await this.db.client
      .update(procurementRequisition)
      .set({ status: 'converted_to_po' })
      .where(and(eq(procurementRequisition.id, po.requisitionId), ...this.requisitionConditions()));

    return updated;
  }

  async rejectPo(id: string, userId: string, comment?: string) {
    const po = await this.findOrderById(id);
    if (!po) throw new NotFoundException('Order not found');
    const [updated] = await this.db.client
      .update(procurementOrder)
      .set({ status: 'cancelled' })
      .where(and(eq(procurementOrder.id, id), ...this.orderConditions()))
      .returning();
    return updated;
  }

  async listPos(userId: string) {
    const rows = await this.db.client
      .select()
      .from(procurementOrder)
      .where(and(...this.orderConditions()))
      .orderBy(desc(procurementOrder.createdAt));

    const vendorIds = Array.from(new Set(rows.map((r) => r.vendorId)));
    const vendorInfo = vendorIds.length
      ? await this.db.client
          .select({ id: financeContact.id, name: financeContact.name })
          .from(financeContact)
          .where(inArray(financeContact.id, vendorIds))
      : [];
    const vendorById = new Map(vendorInfo.map((v) => [v.id, { id: v.id, name: v.name }]));

    const requisitionIds = rows.map((r) => r.requisitionId);
    const requisitionRows = requisitionIds.length
      ? await this.db.client
          .select({
            id: procurementRequisition.id,
            requisitionNumber: procurementRequisition.requisitionNumber,
            title: procurementRequisition.title,
            caseId: procurementCase.id,
            caseStatus: procurementCase.status,
            caseRequestId: procurementCase.requestId,
          })
          .from(procurementRequisition)
          .leftJoin(procurementCase, eq(procurementCase.requisitionId, procurementRequisition.id))
          .where(and(inArray(procurementRequisition.id, requisitionIds), ...this.requisitionConditions()))
      : [];
    const requisitionById = new Map(
      requisitionRows.map((r) => [
        r.id,
        {
          id: r.id,
          requisitionNumber: r.requisitionNumber,
          title: r.title,
          procurementCase: r.caseId ? { id: r.caseId, status: r.caseStatus, requestId: r.caseRequestId } : null,
        },
      ]),
    );

    return rows.map((order) => ({
      ...order,
      vendor: vendorById.get(order.vendorId) ?? null,
      requisition: requisitionById.get(order.requisitionId) ?? null,
    }));
  }

  async getPo(id: string) {
    const po = await this.findOrderById(id);
    if (!po) throw new NotFoundException('Order not found');

    const [vendor, requisitionRow, preparer, grns, attachments] = await Promise.all([
      this.resolveVendor(po.vendorId),
      this.findRequisitionById(po.requisitionId),
      this.db.client
        .select({ id: profile.id, firstName: profile.firstName, lastName: profile.lastName })
        .from(profile)
        .where(eq(profile.id, po.preparedBy))
        .limit(1),
      this.db.client
        .select()
        .from(procurementGRN)
        .where(eq(procurementGRN.poId, po.id))
        .orderBy(asc(procurementGRN.createdAt)),
      this.db.client
        .select({ attachment: procurementAttachment, file: fileAsset })
        .from(procurementAttachment)
        .leftJoin(fileAsset, eq(procurementAttachment.fileId, fileAsset.id))
        .where(eq(procurementAttachment.orderId, po.id))
        .orderBy(asc(procurementAttachment.createdAt)),
    ]);

    let caseRowWithRequest: any = null;
    if (requisitionRow) {
      const caseRow = await this.findCaseForRequisition(requisitionRow.id);
      if (caseRow) {
        const [reqRow] = await this.db.client
          .select({ request: requestInstance, type: requestType })
          .from(requestInstance)
          .leftJoin(requestType, eq(requestInstance.requestTypeId, requestType.id))
          .where(eq(requestInstance.id, caseRow.requestId))
          .limit(1);
        caseRowWithRequest = {
          ...caseRow,
          request: reqRow
            ? {
                id: reqRow.request.id,
                status: reqRow.request.status,
                data: reqRow.request.data,
                requestType: reqRow.type
                  ? { id: reqRow.type.id, name: reqRow.type.name, workflowType: reqRow.type.workflowType }
                  : null,
              }
            : null,
        };
      }
    }

    return {
      ...po,
      vendor,
      requisition: requisitionRow ? { ...requisitionRow, procurementCase: caseRowWithRequest } : null,
      preparer: preparer[0] ? { id: preparer[0].id, firstName: preparer[0].firstName, lastName: preparer[0].lastName } : null,
      grns,
      attachments: attachments.map(({ attachment, file }) => ({ ...attachment, file })),
    };
  }

  async attachToOrder(id: string, dto: AttachProcurementFileDto) {
    const po = await this.findOrderById(id);
    if (!po) throw new NotFoundException('Order not found');

    const file = await this.findFile(dto.fileId);
    if (!file) throw new NotFoundException('File not found');

    const [created] = await this.db.client
      .insert(procurementAttachment)
      .values({
        orderId: po.id,
        fileId: dto.fileId,
        label: dto.label?.trim() || null,
        visibility: dto.visibility,
      })
      .returning();

    return { ...created, file };
  }

  async downloadPo(id: string, userId: string) {
    return this.documentGenerator.generate(
      new PurchaseOrderDocument(this.documentGenerator),
      { options: { poId: id } },
      userId,
    );
  }

  async createGrn(userId: string, dto: CreateGrnDto) {
    const po = await this.findOrderById(dto.poId);
    if (!po) throw new NotFoundException('Order not found');
    if (!['approved', 'sent', 'acknowledged'].includes(po.status)) {
      throw new BadRequestException('GRN can only be raised for approved/sent/acknowledged orders');
    }

    const number = await this.nextNumber('GRN');
    const [grn] = await this.db.client
      .insert(procurementGRN)
      .values({
        grnNumber: number,
        poId: dto.poId,
        raisedBy: toBigInt(userId),
        receivedDate: new Date(dto.receivedDate),
        items: dto.items as any,
        overallCondition: dto.overallCondition,
        notes: dto.notes,
        status: 'pending',
      })
      .returning();
    return grn;
  }

  async confirmGrn(id: string, userId: string, dto: ConfirmGrnDto) {
    const grn = await this.findGrnById(id);
    if (!grn) throw new NotFoundException('GRN not found');
    const po = await this.findOrderById(grn.poId);

    const [updatedGrn] = await this.db.client
      .update(procurementGRN)
      .set({
        status: dto.status,
        confirmedByOfficer: true,
        confirmedAt: new Date(),
        confirmedBy: toBigInt(userId),
      })
      .where(eq(procurementGRN.id, id))
      .returning();

    if (dto.status === 'confirmed' && po) {
      await this.db.client
        .update(procurementOrder)
        .set({ status: 'received' })
        .where(and(eq(procurementOrder.id, grn.poId), ...this.orderConditions()));

      // Find all users with finance.approve permission or accountant role
      const financeRoleSlugs = ['administrator', 'admin', 'finance_manager', 'accountant'];
      const financePermissionSlugs = ['finance.approve', 'finance.manage'];
      const conditions: SQL[] = [];
      const tenantId = this.tenantContext.currentTenantId();
      if (tenantId) conditions.push(eq(userRole.tenantId, tenantId));
      const slugFilter = or(inArray(role.slug, financeRoleSlugs), inArray(permission.slug, financePermissionSlugs));
      if (slugFilter) conditions.push(slugFilter as SQL);

      const financeUsers = await this.db.client
        .selectDistinct({ profileId: userRole.profileId })
        .from(userRole)
        .leftJoin(role, eq(userRole.roleId, role.id))
        .leftJoin(rolePermission, eq(role.id, rolePermission.roleId))
        .leftJoin(permission, eq(rolePermission.permissionId, permission.id))
        .where(and(...conditions));

      const uniqueUserIds = Array.from(new Set<string>(financeUsers.map((u) => u.profileId.toString())));
      for (const fUserId of uniqueUserIds) {
        await this.notificationsService.create({
          userId: fUserId,
          type: 'procurement_ready_for_payment',
          title: `PO ${po.poNumber} ready for payment`,
          message: `GRN confirmed. Raise a Payment Voucher for ${po.poNumber}.`,
          data: { poId: grn.poId, grnId: id },
        });
      }
    }

    return updatedGrn;
  }

  async listIntake(userId: string, role: string) {
    const conditions = this.requestConditions();
    conditions.push(eq(requestInstance.status, 'approved'));
    conditions.push(eq(requestType.workflowType, 'procurement'));
    conditions.push(
      notExists(
        this.db.client
          .select({ id: procurementCase.requestId })
          .from(procurementCase)
          .where(eq(procurementCase.requestId, requestInstance.id)),
      ),
    );

    const rows = await this.db.client
      .select({ row: requestInstance, type: requestType, creator: profile })
      .from(requestInstance)
      .leftJoin(requestType, eq(requestInstance.requestTypeId, requestType.id))
      .leftJoin(profile, eq(requestInstance.createdBy, profile.id))
      .where(and(...conditions))
      .orderBy(desc(requestInstance.updatedAt));

    return rows.map(({ row, type, creator }) => ({
      ...row,
      requestType: type ? { id: type.id, name: type.name, workflowType: type.workflowType } : null,
      creator: creator ? { id: creator.id, firstName: creator.firstName, lastName: creator.lastName } : null,
    }));
  }

  async createCaseFromRequest(requestId: string, userId: string, dto: { note?: string }) {
    const request = await this.findRequestWithType(toBigInt(requestId));
    if (!request || request.status !== 'approved' || request.requestType?.workflowType !== 'procurement') {
      throw new BadRequestException('Approved procurement request required');
    }
    const data = request.data as Record<string, unknown> | null;
    const requisitionNumber = await this.nextNumber('PR');

    return this.db.client.transaction(async (tx) => {
      const [requisition] = await tx
        .insert(procurementRequisition)
        .values({
          requisitionNumber,
          tenantId: this.requiredTenantId(),
          title: String(data?.title || request.requestType?.name || `Request ${request.id.toString()}`),
          category: ['goods', 'services', 'works'].includes(String(data?.category || ''))
            ? (String(data?.category) as 'goods' | 'services' | 'works')
            : 'goods',
          paymentPattern: ['post_delivery', 'pre_payment', 'milestone'].includes(String(data?.payment_pattern || ''))
            ? (String(data?.payment_pattern) as 'post_delivery' | 'pre_payment' | 'milestone')
            : 'post_delivery',
          items: Array.isArray(data?.items) ? data.items : [],
          estimatedTotal: String(Number(request.totalAmount ?? 0)),
          justification: String(data?.justification || ''),
          budgetLineId: typeof data?.budget_line_id === 'string' ? data.budget_line_id : null,
          teamId: request.teamId,
          requestedBy: request.createdBy,
          status: 'approved',
        })
        .returning();

      const [caseRow] = await tx
        .insert(procurementCase)
        .values({
          requestId: request.id,
          requisitionId: requisition.id,
          assignedOfficerId: toBigInt(userId),
          status: 'new',
          category: String(data?.category || ''),
          note: dto.note?.trim() || null,
          createdBy: toBigInt(userId),
        })
        .returning();

      return caseRow;
    });
  }

  async createCaseFromApprovedRequest(requestId: string, userId: string, dto: { note?: string }) {
    return this.createCaseFromRequest(requestId, userId, dto);
  }
}
