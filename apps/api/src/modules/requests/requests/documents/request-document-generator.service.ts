import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { PdfService } from '$common/pdf/pdf.service';
import { MailQueueService } from '$common/mail/mail-queue.service';
import { DeductionService } from '$modules/finance/finance/deduction.service';
import { toBigInt } from '$common/utils/ids';
import { fileAsset } from '$modules/storage/model';
import { profile } from '$modules/identity/users/model';
import { group as teamGroup } from '$modules/communication/groups/model';
import { organization } from '$modules/directory/organizations/model';
import { taxonomyTerm } from '$modules/requests/taxonomy/model';
import {
  requestCategory,
  requestGroup,
  requestInstance,
  requestItem,
  requestItemFile,
  requestType,
} from '$modules/requests/requests/model';
import {
  workflow,
  workflowHistory,
  workflowInstance,
  workflowStep,
  workflowStepApprover,
} from '$modules/requests/workflow/model';
import {
  financeDeductionType,
  financeDonor,
  financeFund,
  financeGrant,
  financePaymentVoucher,
  financePaymentVoucherFile,
  financePVDeduction,
  financeRequestDeduction,
  financeRequestDeductionRemittanceAllocation,
  financeRequestRemittance,
  financeSetting,
} from '$modules/finance/finance/model';
import { DocumentGeneratorService } from '$common/documents/document-generator.service';
import { DocumentIds, DocumentOutput, ThreadEntry, RequestThread, Signatories, ApprovalSummary, FullPaymentVoucher, RequestRemittanceAllocationSummary } from '$common/documents/document.types';

@Injectable()
export class RequestDocumentGeneratorService extends DocumentGeneratorService {
  constructor(
    private readonly db: DbService,
    pdfService: PdfService,
    mailQueue: MailQueueService,
    private readonly deductionService: DeductionService,
  ) {
    super(pdfService, mailQueue);
  }

  protected override async afterGenerated(ids: DocumentIds, userId: string, output: DocumentOutput, generatedAt: Date): Promise<void> {
    if (!ids.requestId) return;
    await this.recordArtifact(toBigInt(ids.requestId), {
      type: output.artifactType,
      file_name: output.fileName,
      generated_by: userId,
      generated_at: generatedAt.toISOString(),
    });
  }
  async fetchRemittedTrmSlips(
    requestId: string,
  ): Promise<Array<{ fileName: string; buffer: Buffer }>> {
    const remitted =
      await this.deductionService.listRemittedDeductionsForRequest(requestId);
    const slips: Array<{ fileName: string; buffer: Buffer }> = [];
    for (const rd of remitted) {
      const { buffer, fileName } = await this.deductionService.buildTrmSlipPdf(
        rd.id,
      );
      slips.push({ fileName, buffer });
    }
    return slips;
  }

  async fetchRequestRemittanceAllocationSummary(
    requestId: string,
  ): Promise<RequestRemittanceAllocationSummary[]> {
    const requestIdValue = toBigInt(requestId);
    const rows = await this.db.client
      .select()
      .from(financeRequestDeduction)
      .where(eq(financeRequestDeduction.requestId, requestIdValue))
      .orderBy(asc(financeRequestDeduction.createdAt));
    if (rows.length === 0) return [];

    const deductionIds = rows.map((row) => row.id);
    const [requestRow, deductionTypes, allocations, pvDeductions] =
      await Promise.all([
        this.db.client
          .select({ data: requestInstance.data })
          .from(requestInstance)
          .where(eq(requestInstance.id, requestIdValue))
          .limit(1)
          .then((result) => result[0] ?? null),
        this.db.client
          .select({
            id: financeDeductionType.id,
            name: financeDeductionType.name,
            code: financeDeductionType.code,
          })
          .from(financeDeductionType)
          .where(
            inArray(
              financeDeductionType.id,
              Array.from(new Set(rows.map((row) => row.deductionTypeId))),
            ),
          ),
        this.db.client
          .select()
          .from(financeRequestDeductionRemittanceAllocation)
          .where(
            inArray(
              financeRequestDeductionRemittanceAllocation.requestDeductionId,
              deductionIds,
            ),
          )
          .orderBy(asc(financeRequestDeductionRemittanceAllocation.createdAt)),
        this.db.client
          .select()
          .from(financePVDeduction)
          .where(inArray(financePVDeduction.requestDeductionId, deductionIds)),
      ]);

    const remittanceIds = Array.from(
      new Set(allocations.map((allocation) => allocation.requestRemittanceId)),
    );
    const remittances = remittanceIds.length
      ? await this.db.client
          .select({
            id: financeRequestRemittance.id,
            remittanceNumber: financeRequestRemittance.remittanceNumber,
            reference: financeRequestRemittance.reference,
            remittedAt: financeRequestRemittance.remittedAt,
          })
          .from(financeRequestRemittance)
          .where(inArray(financeRequestRemittance.id, remittanceIds))
      : [];

    const voucherIds = Array.from(
      new Set(pvDeductions.map((deduction) => deduction.paymentVoucherId)),
    );
    const vouchers = voucherIds.length
      ? await this.db.client
          .select({
            id: financePaymentVoucher.id,
            voucherNumber: financePaymentVoucher.voucherNumber,
          })
          .from(financePaymentVoucher)
          .where(inArray(financePaymentVoucher.id, voucherIds))
      : [];

    const typeById = new Map(deductionTypes.map((type) => [type.id, type]));
    const remittanceById = new Map(
      remittances.map((remittance) => [remittance.id, remittance]),
    );
    const voucherById = new Map(
      vouchers.map((voucher) => [voucher.id, voucher]),
    );
    const pvByDeductionId = new Map(
      pvDeductions.map((deduction) => [
        deduction.requestDeductionId,
        deduction,
      ]),
    );
    const allocationsByDeductionId = new Map<string, any[]>();
    for (const allocation of allocations) {
      const list =
        allocationsByDeductionId.get(allocation.requestDeductionId) ?? [];
      list.push({
        ...allocation,
        requestRemittance:
          remittanceById.get(allocation.requestRemittanceId) ?? null,
      });
      allocationsByDeductionId.set(allocation.requestDeductionId, list);
    }

    return rows.map((row: any) => {
      const requestNumber =
        (requestRow?.data as any)?.request_number ?? String(row.requestId);
      const rowAllocations = allocationsByDeductionId.get(row.id) ?? [];
      const allocatedTotal = rowAllocations.reduce(
        (sum: number, allocation: any) =>
          sum + Number(allocation.allocatedAmount || 0),
        0,
      );
      const pvDeduction = pvByDeductionId.get(row.id);
      const voucher = pvDeduction
        ? voucherById.get(pvDeduction.paymentVoucherId)
        : null;
      const deductionType = typeById.get(row.deductionTypeId);
      return {
        deductionId: row.id,
        requestNumber,
        voucherNumber: voucher?.voucherNumber ?? null,
        deductionTypeName: deductionType?.name ?? "",
        deductionTypeCode: deductionType?.code ?? "",
        withheldAmount: Number(row.amount || 0),
        allocatedTotal,
        remainingBalance: Math.max(0, Number(row.amount || 0) - allocatedTotal),
        allocations: rowAllocations.map((allocation: any) => ({
          allocationId: allocation.id,
          remittanceNumber:
            allocation.requestRemittance?.remittanceNumber ?? "-",
          remittanceRef: allocation.requestRemittance?.reference ?? null,
          allocatedAmount: Number(allocation.allocatedAmount || 0),
          remittedAt: allocation.requestRemittance?.remittedAt ?? null,
        })),
      };
    });
  }

  async fetchRequest(id: string) {
    const request = await this.fetchHydratedRequest(toBigInt(id));
    if (!request) throw new NotFoundException("Request not found");
    return request;
  }

  async fetchSignatories(): Promise<Signatories> {
    const [row] = await this.db.client
      .select({ config: financeSetting.config })
      .from(financeSetting)
      .where(eq(financeSetting.key, "default"))
      .limit(1);
    const data =
      row?.config &&
      typeof row.config === "object" &&
      !Array.isArray(row.config)
        ? (row.config as Record<string, any>)
        : {};
    const [preparedSig, reviewedSig, approvedSig] = await Promise.all([
      this.resolveSignatureDataUri(data?.prepared_by?.signature_file_id),
      this.resolveSignatureDataUri(data?.reviewed_by?.signature_file_id),
      this.resolveSignatureDataUri(data?.approved_by?.signature_file_id),
    ]);
    return {
      prepared_by: {
        name: data?.prepared_by?.name ?? "",
        title: data?.prepared_by?.title ?? "Accountant",
        signatureDataUri: preparedSig,
      },
      reviewed_by: {
        name: data?.reviewed_by?.name ?? "",
        title: data?.reviewed_by?.title ?? "Finance Manager / COO",
        signatureDataUri: reviewedSig,
      },
      approved_by: {
        name: data?.approved_by?.name ?? "",
        title: data?.approved_by?.title ?? "Executive Director",
        signatureDataUri: approvedSig,
      },
    };
  }

  async resolveSignatureDataUri(fileId: unknown): Promise<string | null> {
    if (typeof fileId !== "string" || !fileId) return null;
    const [asset] = await this.db.client
      .select()
      .from(fileAsset)
      .where(eq(fileAsset.id, fileId))
      .limit(1);
    if (!asset) return null;
    const buf = await this.readAssetFileBuffer(asset);
    if (!buf) return null;
    const ext = (asset.fileName ?? "").split(".").pop()?.toLowerCase() ?? "png";
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "svg"
          ? "image/svg+xml"
          : "image/png";
    return `data:${mime};base64,${buf.toString("base64")}`;
  }

  async fetchApprovals(
    workflowInstanceId: string | null | undefined,
  ): Promise<ApprovalSummary> {
    if (!workflowInstanceId) return { done: [], pending: [] };
    const instance =
      await this.fetchHydratedWorkflowInstance(workflowInstanceId);
    if (!instance) return { done: [], pending: [] };
    const stepMap = new Map<string, string>(
      (instance.workflow.steps as any[]).map((s) => [String(s.id), s.name]),
    );
    const performerIds = Array.from(
      new Set(
        instance.history
          .map((e) => (e.performedBy ? e.performedBy.toString() : null))
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const performers = performerIds.length
      ? await this.db.client
          .select(this.profileSelect())
          .from(profile)
          .where(
            inArray(
              profile.id,
              (performerIds as string[]).map((id) => toBigInt(id)),
            ),
          )
      : [];
    const performerMap = new Map<
      string,
      { name: string; email: string | null }
    >(
      performers.map((u) => {
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
        return [
          u.id.toString(),
          { name: name || u.username || u.email, email: u.email ?? null },
        ];
      }),
    );
    const done = instance.history
      .filter((e) => ["approve", "reject", "auto_approve"].includes(e.action))
      .map((e) => ({
        action: e.action,
        step: e.fromStepId
          ? (stepMap.get(e.fromStepId) ?? "Unknown step")
          : "Unknown step",
        performed_by: e.performedBy ? e.performedBy.toString() : null,
        performed_by_name: e.performedBy
          ? (performerMap.get(e.performedBy.toString())?.name ?? null)
          : null,
        performed_by_email: e.performedBy
          ? (performerMap.get(e.performedBy.toString())?.email ?? null)
          : null,
        comment: e.comment,
        at: e.createdAt,
      }));
    const pending =
      instance.status === "pending" && instance.currentStep
        ? instance.currentStep.approvers.map((a) => ({
            step: instance.currentStep?.name ?? "Current step",
            approver_type: a.approverType,
            approver_id: a.approverId,
          }))
        : [];
    return { done, pending };
  }

  async fetchPaymentVouchers(requestId: string): Promise<FullPaymentVoucher[]> {
    const vouchers = await this.db.client
      .select()
      .from(financePaymentVoucher)
      .where(eq(financePaymentVoucher.requestId, toBigInt(requestId)))
      .orderBy(asc(financePaymentVoucher.disbursedAt));
    return this.hydratePaymentVouchers(vouchers) as Promise<
      FullPaymentVoucher[]
    >;
  }

  async fetchPaymentVoucher(
    requestId: string,
    voucherId: string,
  ): Promise<FullPaymentVoucher> {
    const [row] = await this.db.client
      .select()
      .from(financePaymentVoucher)
      .where(
        and(
          eq(financePaymentVoucher.requestId, toBigInt(requestId)),
          eq(financePaymentVoucher.id, voucherId),
        ),
      )
      .limit(1);
    const [pv] = await this.hydratePaymentVouchers(row ? [row] : []);
    if (!pv) throw new NotFoundException("Payment voucher not found");
    return pv as any;
  }

  async recordArtifact(requestId: bigint, artifact: Record<string, string>) {
    const [request] = await this.db.client
      .select({ data: requestInstance.data })
      .from(requestInstance)
      .where(eq(requestInstance.id, requestId))
      .limit(1);
    const base =
      request?.data &&
      typeof request.data === "object" &&
      !Array.isArray(request.data)
        ? ({ ...(request.data as Record<string, unknown>) } as Record<
            string,
            unknown
          >)
        : {};
    const currentArtifacts = Array.isArray(base.generated_artifacts)
      ? (base.generated_artifacts as unknown[])
      : [];
    await this.db.client
      .update(requestInstance)
      .set({
        data: {
          ...base,
          ...(artifact.voucher_no
            ? { voucher_number: artifact.voucher_no }
            : {}),
          generated_artifacts: [...currentArtifacts, artifact],
        } as any,
      })
      .where(eq(requestInstance.id, requestId));
  }

  async resolveNameFromReference(
    value: unknown,
    kind: "team" | "organization" | "taxonomy_term",
  ): Promise<string> {
    if (value === undefined || value === null || value === "") return "-";
    const raw = String(value);
    try {
      if (kind === "team" && /^\d+$/.test(raw)) {
        const [team] = await this.db.client
          .select({ name: teamGroup.name })
          .from(teamGroup)
          .where(eq(teamGroup.id, toBigInt(raw)))
          .limit(1);
        return team?.name ?? raw;
      }
      if (kind === "organization" && /^\d+$/.test(raw)) {
        const [org] = await this.db.client
          .select({ name: organization.name })
          .from(organization)
          .where(eq(organization.id, toBigInt(raw)))
          .limit(1);
        return org?.name ?? raw;
      }
      if (kind === "taxonomy_term" && this.looksLikeUuid(raw)) {
        const [term] = await this.db.client
          .select({ label: taxonomyTerm.label })
          .from(taxonomyTerm)
          .where(eq(taxonomyTerm.id, raw))
          .limit(1);
        return term?.label ?? raw;
      }
      return raw;
    } catch {
      return raw;
    }
  }

  async fetchThread(requestId: string): Promise<RequestThread> {
    const request = await this.fetchHydratedRequest(toBigInt(requestId));
    if (!request) throw new NotFoundException("Request not found");

    const data = (request.data ?? {}) as Record<string, unknown>;
    const creatorName =
      `${request.creator.firstName ?? ""} ${request.creator.lastName ?? ""}`.trim() ||
      request.creator.username ||
      request.creator.email;
    const purpose =
      typeof data.purpose === "string" && data.purpose ? data.purpose : null;

    const fileMap = new Map<string, { name: string; id: string }>();
    for (const item of request.items) {
      const addFile = (f: any) => {
        if (f?.id && f?.fileName)
          fileMap.set(f.id, { name: f.fileName, id: f.id });
      };
      addFile(item.file);
      (item.files ?? []).forEach((a: any) => addFile(a.file));
    }

    // Collect any file IDs referenced in data.items[] that aren't already in fileMap
    const dataItems = Array.isArray(data.items) ? (data.items as any[]) : [];
    const missingFileIds = new Set<string>();
    for (const di of dataItems) {
      const ids: string[] = [];
      if (di?.file_id && typeof di.file_id === "string") ids.push(di.file_id);
      if (Array.isArray(di?.file_ids))
        ids.push(
          ...di.file_ids
            .map((f: any) => (typeof f === "string" ? f : f?.id))
            .filter(Boolean),
        );
      for (const fid of ids) {
        if (!fileMap.has(fid)) missingFileIds.add(fid);
      }
    }
    if (missingFileIds.size > 0) {
      const extra = await this.db.client
        .select({ id: fileAsset.id, fileName: fileAsset.fileName })
        .from(fileAsset)
        .where(inArray(fileAsset.id, Array.from(missingFileIds)));
      for (const f of extra) {
        if (f.fileName) fileMap.set(f.id, { id: f.id, name: f.fileName });
      }
    }

    const attachments = Array.from(fileMap.values());

    const customComment =
      typeof data.submission_comment === "string" &&
      data.submission_comment.trim()
        ? data.submission_comment.trim()
        : null;
    const autoComment = purpose
      ? `Please make payment for the listed items. ${purpose}.`
      : "Please make payment for the listed items.";
    const baseComment = customComment ?? autoComment;
    const filesSuffix =
      attachments.length > 0
        ? `Supporting documents attached: ${attachments.map((a) => a.name).join(", ")}.`
        : null;
    const submissionComment = filesSuffix
      ? `${baseComment} ${filesSuffix}`
      : baseComment;

    const thread: ThreadEntry[] = [
      {
        type: "submission",
        actor_name: creatorName,
        actor_email: request.creator.email,
        role_label: "Requester",
        comment: submissionComment,
        at: request.createdAt,
        attachments,
      },
    ];

    const isManualImport = Boolean(data.manual_import);

    // Fetch all workflow instances for this request to gather history across returns/resubmissions
    const instances = await this.fetchWorkflowInstancesForRequest(requestId);

    // If manual import or no workflow instances, we only have submission entry and manual approvals (if any)
    if (isManualImport || instances.length === 0) {
      const manualApprovals = Array.isArray(data.manual_approvals)
        ? (data.manual_approvals as any[])
        : [];
      const roleOrder = ["team_lead", "accountant", "coo", "ed"];
      const roleLabelMap: Record<string, string> = {
        team_lead: "Team Lead",
        accountant: "Accountant",
        coo: "COO",
        ed: "Executive Director",
      };
      const sorted = [...manualApprovals].sort(
        (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
      );
      for (const ap of sorted) {
        if (!ap?.name && !ap?.date) continue;
        thread.push({
          type: "approval",
          actor_name: ap.name ?? null,
          actor_email: null,
          role_label: roleLabelMap[ap.role] ?? String(ap.role),
          comment: ap.comment ?? null,
          at: ap.date ? new Date(ap.date) : request.createdAt,
        });
      }
      return thread;
    }

    const stepMap = new Map<string, string>();
    const historyEntries: any[] = [];

    for (const inst of instances) {
      for (const step of inst.workflow.steps) {
        stepMap.set(step.id, step.name);
      }
      historyEntries.push(...inst.history);
    }

    const performerIds = [
      ...new Set(
        historyEntries
          .map((e) => e.performedBy?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const performers = performerIds.length
      ? await this.db.client
          .select(this.profileSelect())
          .from(profile)
          .where(
            inArray(
              profile.id,
              performerIds.map((id) => toBigInt(id)),
            ),
          )
      : [];
    const performerMap = new Map(
      performers.map((u) => {
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
        return [
          u.id.toString(),
          { name: name || u.username || u.email, email: u.email },
        ];
      }),
    );

    const stateEvents = Array.isArray(data.state_events)
      ? (data.state_events as any[])
      : [];
    const stateEventsByUser = new Map<string, any[]>();
    for (const se of stateEvents) {
      if (se.by && se.comment && typeof se.comment === "string") {
        const existing = stateEventsByUser.get(se.by) ?? [];
        existing.push(se);
        stateEventsByUser.set(se.by, existing);
      }
    }

    const relevantActions = new Set([
      "approve",
      "reject",
      "auto_approve",
      "return",
      "cancel",
    ]);
    for (const entry of historyEntries) {
      if (!relevantActions.has(entry.action)) continue;
      const performer = entry.performedBy
        ? performerMap.get(entry.performedBy.toString())
        : null;
      const step = entry.fromStepId
        ? (stepMap.get(entry.fromStepId) ?? null)
        : null;
      const entryType: ThreadEntry["type"] =
        entry.action === "approve" || entry.action === "auto_approve"
          ? "approval"
          : entry.action === "reject"
            ? "rejection"
            : "return";
      let comment: string | null = entry.comment ?? null;
      if (!comment && performer && entry.action !== "cancel") {
        const userSe = stateEventsByUser.get(entry.performedBy?.toString());
        if (userSe) {
          const entryTime = entry.createdAt.getTime();
          const closest = userSe.reduce(
            (best, se) => {
              const seTime = new Date(se.at).getTime();
              return Math.abs(seTime - entryTime) < Math.abs(best.diff)
                ? { se, diff: seTime - entryTime }
                : best;
            },
            { se: userSe[0], diff: Infinity },
          );
          if (closest.diff !== Infinity && Math.abs(closest.diff) < 10000) {
            comment = closest.se.comment;
          }
        }
      }
      // Fallback for historical approvals where comment was never recorded
      if (!comment) {
        if (entry.action === "approve" || entry.action === "auto_approve")
          comment = "Approved.";
        else if (entry.action === "reject") comment = "Rejected.";
        else if (entry.action === "return") comment = "Returned for revision.";
      }
      thread.push({
        type: entryType,
        actor_name: (performer as any)?.name ?? "System",
        actor_email: (performer as any)?.email ?? null,
        role_label:
          step ?? (entry.action === "auto_approve" ? "System" : "Approver"),
        comment,
        at: entry.createdAt,
      });
    }

    return thread;
  }

  async fetchFileAssetsByIds(ids: string[]): Promise<any[]> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return [];
    return this.db.client
      .select()
      .from(fileAsset)
      .where(inArray(fileAsset.id, uniqueIds));
  }

  private profileSelect() {
    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
    };
  }

  private async fetchHydratedRequest(id: bigint): Promise<any | null> {
    const [request] = await this.db.client
      .select()
      .from(requestInstance)
      .where(eq(requestInstance.id, id))
      .limit(1);
    if (!request) return null;

    const [items, requestTypeRow, groupRow, creator, orgRow, teamRow] =
      await Promise.all([
        this.db.client
          .select()
          .from(requestItem)
          .where(eq(requestItem.requestId, id))
          .orderBy(asc(requestItem.createdAt)),
        request.requestTypeId
          ? this.db.client
              .select()
              .from(requestType)
              .where(eq(requestType.id, request.requestTypeId))
              .limit(1)
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
        request.groupId
          ? this.db.client
              .select()
              .from(requestGroup)
              .where(eq(requestGroup.id, request.groupId))
              .limit(1)
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
        request.createdBy
          ? this.db.client
              .select(this.profileSelect())
              .from(profile)
              .where(eq(profile.id, request.createdBy))
              .limit(1)
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
        request.organizationId
          ? this.db.client
              .select()
              .from(organization)
              .where(eq(organization.id, request.organizationId))
              .limit(1)
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
        request.teamId
          ? this.db.client
              .select({ id: teamGroup.id, name: teamGroup.name })
              .from(teamGroup)
              .where(eq(teamGroup.id, request.teamId))
              .limit(1)
              .then((rows) => rows[0] ?? null)
          : Promise.resolve(null),
      ]);

    const itemIds = items.map((item) => item.id);
    const itemFileRows = itemIds.length
      ? await this.db.client
          .select()
          .from(requestItemFile)
          .where(inArray(requestItemFile.requestItemId, itemIds))
          .orderBy(asc(requestItemFile.sortOrder))
      : [];
    const fileIds = Array.from(
      new Set([
        ...items
          .map((item) => item.fileId)
          .filter((id): id is string => Boolean(id)),
        ...itemFileRows.map((row) => row.fileId),
      ]),
    );
    const files = fileIds.length
      ? await this.db.client
          .select()
          .from(fileAsset)
          .where(inArray(fileAsset.id, fileIds))
      : [];
    const fileById = new Map(files.map((file) => [file.id, file]));
    const filesByItemId = new Map<string, any[]>();
    for (const row of itemFileRows) {
      const list = filesByItemId.get(row.requestItemId) ?? [];
      list.push({ ...row, file: fileById.get(row.fileId) ?? null });
      filesByItemId.set(row.requestItemId, list);
    }

    let hydratedRequestType: any = requestTypeRow;
    if (requestTypeRow?.categoryId) {
      const [category] = await this.db.client
        .select()
        .from(requestCategory)
        .where(eq(requestCategory.id, requestTypeRow.categoryId))
        .limit(1);
      hydratedRequestType = { ...requestTypeRow, category: category ?? null };
    }

    return {
      ...request,
      items: items.map((item) => ({
        ...item,
        file: item.fileId ? (fileById.get(item.fileId) ?? null) : null,
        files: filesByItemId.get(item.id) ?? [],
      })),
      requestType: hydratedRequestType,
      group: groupRow,
      creator,
      organization: orgRow,
      team: teamRow,
    };
  }

  private async fetchHydratedWorkflowInstance(id: string): Promise<any | null> {
    const [instance] = await this.db.client
      .select()
      .from(workflowInstance)
      .where(eq(workflowInstance.id, id))
      .limit(1);
    if (!instance) return null;
    const [currentStep, history, workflowRow] = await Promise.all([
      instance.currentStepId
        ? this.db.client
            .select()
            .from(workflowStep)
            .where(eq(workflowStep.id, instance.currentStepId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
      this.db.client
        .select()
        .from(workflowHistory)
        .where(eq(workflowHistory.instanceId, id))
        .orderBy(asc(workflowHistory.createdAt)),
      instance.workflowId
        ? this.db.client
            .select()
            .from(workflow)
            .where(eq(workflow.id, instance.workflowId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
    ]);
    const [approvers, steps] = await Promise.all([
      currentStep
        ? this.db.client
            .select()
            .from(workflowStepApprover)
            .where(eq(workflowStepApprover.stepId, currentStep.id))
        : Promise.resolve([]),
      workflowRow
        ? this.db.client
            .select()
            .from(workflowStep)
            .where(eq(workflowStep.workflowId, workflowRow.id))
            .orderBy(asc(workflowStep.order))
        : Promise.resolve([]),
    ]);
    return {
      ...instance,
      currentStep: currentStep ? { ...currentStep, approvers } : null,
      history,
      workflow: workflowRow ? { ...workflowRow, steps } : { steps: [] },
    };
  }

  private async fetchWorkflowInstancesForRequest(
    requestId: string,
  ): Promise<any[]> {
    const instances = await this.db.client
      .select()
      .from(workflowInstance)
      .where(
        and(
          eq(workflowInstance.entityType, "request"),
          eq(workflowInstance.entityId, requestId),
        ),
      )
      .orderBy(asc(workflowInstance.createdAt));
    const hydrated: any[] = [];
    for (const instance of instances) {
      const workflowRow = instance.workflowId
        ? await this.db.client
            .select()
            .from(workflow)
            .where(eq(workflow.id, instance.workflowId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : null;
      const [history, steps] = await Promise.all([
        this.db.client
          .select()
          .from(workflowHistory)
          .where(eq(workflowHistory.instanceId, instance.id))
          .orderBy(asc(workflowHistory.createdAt)),
        workflowRow
          ? this.db.client
              .select()
              .from(workflowStep)
              .where(eq(workflowStep.workflowId, workflowRow.id))
              .orderBy(asc(workflowStep.order))
          : Promise.resolve([]),
      ]);
      hydrated.push({
        ...instance,
        history,
        workflow: workflowRow ? { ...workflowRow, steps } : { steps: [] },
      });
    }
    return hydrated;
  }

  private async hydratePaymentVouchers(vouchers: any[]): Promise<any[]> {
    if (vouchers.length === 0) return [];
    const voucherIds = vouchers.map((voucher) => voucher.id);
    const [deductions, attachments] = await Promise.all([
      this.db.client
        .select()
        .from(financePVDeduction)
        .where(inArray(financePVDeduction.paymentVoucherId, voucherIds)),
      this.db.client
        .select()
        .from(financePaymentVoucherFile)
        .where(inArray(financePaymentVoucherFile.voucherId, voucherIds))
        .orderBy(asc(financePaymentVoucherFile.sortOrder)),
    ]);
    const typeIds = Array.from(
      new Set(deductions.map((deduction) => deduction.deductionTypeId)),
    );
    const fileIds = Array.from(
      new Set([
        ...vouchers
          .map((voucher) => voucher.evidenceFileId)
          .filter((id): id is string => Boolean(id)),
        ...attachments.map((attachment) => attachment.fileId),
      ]),
    );
    const fundIds = Array.from(
      new Set(
        vouchers
          .map((voucher) => voucher.fundId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const grantIds = Array.from(
      new Set(
        vouchers
          .map((voucher) => voucher.grantId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const [types, files, funds, grants] = await Promise.all([
      typeIds.length
        ? this.db.client
            .select()
            .from(financeDeductionType)
            .where(inArray(financeDeductionType.id, typeIds))
        : Promise.resolve([]),
      fileIds.length
        ? this.db.client
            .select()
            .from(fileAsset)
            .where(inArray(fileAsset.id, fileIds))
        : Promise.resolve([]),
      fundIds.length
        ? this.db.client
            .select({
              id: financeFund.id,
              name: financeFund.name,
              code: financeFund.code,
            })
            .from(financeFund)
            .where(inArray(financeFund.id, fundIds))
        : Promise.resolve([]),
      grantIds.length
        ? this.db.client
            .select({
              id: financeGrant.id,
              name: financeGrant.name,
              code: financeGrant.code,
              donorId: financeGrant.donorId,
            })
            .from(financeGrant)
            .where(inArray(financeGrant.id, grantIds))
        : Promise.resolve([]),
    ]);
    const donorIds = Array.from(
      new Set(
        grants
          .map((grant) => grant.donorId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const donors = donorIds.length
      ? await this.db.client
          .select({ id: financeDonor.id, name: financeDonor.name })
          .from(financeDonor)
          .where(inArray(financeDonor.id, donorIds))
      : [];

    const typeById = new Map(types.map((type) => [type.id, type]));
    const fileById = new Map(files.map((file) => [file.id, file]));
    const fundById = new Map(funds.map((fund) => [fund.id, fund]));
    const donorById = new Map(donors.map((donor) => [donor.id, donor]));
    const grantById = new Map(
      grants.map((grant) => [
        grant.id,
        {
          ...grant,
          donor: grant.donorId ? (donorById.get(grant.donorId) ?? null) : null,
        },
      ]),
    );
    const deductionsByVoucherId = new Map<string, any[]>();
    for (const deduction of deductions) {
      const list = deductionsByVoucherId.get(deduction.paymentVoucherId) ?? [];
      list.push({
        ...deduction,
        deductionType: typeById.get(deduction.deductionTypeId) ?? null,
      });
      deductionsByVoucherId.set(deduction.paymentVoucherId, list);
    }
    const attachmentsByVoucherId = new Map<string, any[]>();
    for (const attachment of attachments.filter(
      (attachment) => attachment.fileKind === "evidence",
    )) {
      const list = attachmentsByVoucherId.get(attachment.voucherId) ?? [];
      list.push({
        ...attachment,
        file: fileById.get(attachment.fileId) ?? null,
      });
      attachmentsByVoucherId.set(attachment.voucherId, list);
    }

    return vouchers.map((voucher) => ({
      ...voucher,
      deductions: deductionsByVoucherId.get(voucher.id) ?? [],
      evidenceFile: voucher.evidenceFileId
        ? (fileById.get(voucher.evidenceFileId) ?? null)
        : null,
      attachments: attachmentsByVoucherId.get(voucher.id) ?? [],
      grant: voucher.grantId ? (grantById.get(voucher.grantId) ?? null) : null,
      fund: voucher.fundId ? (fundById.get(voucher.fundId) ?? null) : null,
    }));
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
