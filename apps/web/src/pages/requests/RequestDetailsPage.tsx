import {
  ActivityFeed,
  Button,
  Chip,
  EmptyState,
  Icon,
  PageHeader,
  SelectField,
  SectionCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  StatCard,
  TextField,
  TextAreaField,
  useToast,
  WorkflowStepper,
  type WorkflowStep,
} from "@/shared";
import { formatCurrency } from "@stanforte/shared";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { cacheStore, useCachedQuery } from "@/shared/lib/core";
import {
  buildAppMobileNav,
  buildRequestsNavigation,
  requestsMobileNav,
} from "@/pages/requests/requests-data";
import {
  approveRequest,
  deleteRequest,
  downloadRequestArtifact,
  completeRequest,
  confirmRequest,
  disburseRequest,
  getRequest,
  getRequestActions,
  listMyOrganizations,
  listProjects,
  rejectRequest,
  returnRequest,
  listGroups,
  retireRequest,
  submitRequest,
} from "@/pages/requests/requests-api";
import { listEntityTags, listManagedTaxonomies } from "@/pages/requests/taxonomy-api";
import type { MyOrganization, ProjectOption, TeamOption } from "@/pages/requests/requests-api";
import { financeApi } from "@/shared/lib/core";
import { downloadBase64File } from "@/shared/lib/download";
import { formatDisplayDate } from "@stanforte/shared";
import {
  buildLeaveWorkflow,
  buildLoanWorkflow,
  buildWorkflow,
  deriveRequestWorkflowStatus,
  formatPersonName,
  formatRequestStatus,
  formatViewerRequestStatus,
  requestHasDraftHistory,
  workflowTypeFromRecord,
  requestStatusTone,
} from "@/pages/requests/request-helpers";
import { usePaymentRequest } from "./hooks/usePaymentRequest";
import { buildPaymentProgress, buildPaymentViewerStatus } from "./status/paymentStatus";
import { buildLeaveViewerStatus } from "./status/leaveStatus";
import { buildLoanViewerStatus, buildLoanProgress } from "./status/loanStatus";
import {
  RequestDetailsContext,
  type RequestDetailsContextValue,
} from "./details/context";
import { LeaveRequestDetail } from "./details/LeaveRequestDetail";
import { ProcurementRequestDetail } from "./details/ProcurementRequestDetail";
import { LoanRequestDetail } from "./details/LoanRequestDetail";
import { OtherRequestDetail } from "./details/OtherRequestDetail";
import { PaymentRequestDetail } from "./details/PaymentRequestDetail";
import { RequestActionCard } from "./details/shared/RequestActionCard";
import { RequestHeaderCard } from "./details/shared/RequestHeaderCard";
import { SupportingDocsSection } from "./details/shared/SupportingDocsSection";
import { ActivitySection } from "./details/shared/ActivitySection";
import { WorkflowStepperCard } from "./details/shared/WorkflowStepperCard";
import { NudgeSection } from "./details/shared/NudgeSection";
import { DownloadsSection } from "./details/shared/DownloadsSection";

function DownloadDropdown(props: {
  actionBusy: string;
  onDownloadRequestPdf: () => void;
  onDownloadFullDocument: () => void;
  includeFullDocument?: boolean;
}) {
  const {
    actionBusy,
    onDownloadRequestPdf,
    onDownloadFullDocument,
    includeFullDocument = true,
  } = props;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative w-full">
      <Button
        variant="secondary"
        className="w-full justify-between"
        onClick={() => setOpen((current) => !current)}
        disabled={actionBusy !== ""}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="download" className="text-[18px]" />
          Download
        </span>
        <Icon
          name={open ? "expand_less" : "expand_more"}
          className="text-[18px]"
        />
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-full min-w-[240px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onDownloadRequestPdf();
            }}
          >
            <Icon name="description" className="text-[18px]" />
            Request PDF
          </button>
          {includeFullDocument ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onDownloadFullDocument();
              }}
            >
              <Icon name="folder_zip" className="text-[18px]" />
              Full Document
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type RequestDetailsView = "mine" | "approvals" | "finance" | "hr";

type RequestDetailsPageProps = {
  detailView?: RequestDetailsView;
};

function detailPathForView(view: RequestDetailsView, id: string) {
  if (view === "finance") return `/finance/requests/${id}`;
  if (view === "approvals") return `/requests/approvals/${id}`;
  if (view === "hr") return `/hr/requests/${id}`;
  return `/requests/${id}`;
}

export function RequestDetailsPage(props: RequestDetailsPageProps = {}) {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const [actionComment, setActionComment] = useState("");
  const [actionBusy, setActionBusy] = useState<string>("");
  const id = routeId || searchParams.get("id") || "";
  const detailView = props.detailView ?? "mine";
  const { user } = useAuth();
  const currentUserId = user?.id ? String(user.id) : undefined;
  const { showToast } = useToast();

  const {
    data: request,
    loading,
    error,
    refetch,
  } = useCachedQuery(
    `requests:detail:${id || "none"}`,
    () => {
      if (!id) return Promise.resolve(null);
      return getRequest(id);
    },
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: requestActions, refetch: refetchRequestActions } =
    useCachedQuery(
      `requests:actions:${id || "none"}`,
      () => {
        if (!id) return Promise.resolve([]);
        return getRequestActions(id);
      },
      { ttlMs: 1000 * 60, storage: "memory" },
    );
  const { data: projects } = useCachedQuery(
    "requests:projects",
    () => listProjects(),
    {
      ttlMs: 1000 * 60 * 10,
      storage: "memory",
    },
  );
  const { data: organizations } = useCachedQuery(
    "requests:my-organizations",
    () => listMyOrganizations(),
    {
      ttlMs: 1000 * 60 * 10,
      storage: "memory",
    },
  );
  const { data: teams } = useCachedQuery("requests:groups", () => listGroups(), {
    ttlMs: 1000 * 60 * 10,
    storage: "memory",
  });
  const { data: managedTaxonomies } = useCachedQuery(
    "requests:taxonomies",
    () => listManagedTaxonomies({ include_inactive: false }),
    { ttlMs: 1000 * 60 * 10, storage: "memory" },
  );
  const { data: tagsResponse } = useCachedQuery(
    `requests:detail:tags:${id || "none"}`,
    () =>
      id
        ? listEntityTags("request", id, "request_tags")
        : Promise.resolve({ taxonomy: null, tags: [] }),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const workflowType = workflowTypeFromRecord(request || undefined);
  const workflowStatus = deriveRequestWorkflowStatus(request);
  const statusTone = requestStatusTone(workflowStatus);
  const requestData =
    request?.data && typeof request.data === "object" ? request.data : {};
  const categoryTaxonomyKey = String(request?.request_type?.taxonomy_keys?.[0] || "");
  const categoryTaxonomy = managedTaxonomies?.find(
    (taxonomy) => taxonomy.key === categoryTaxonomyKey,
  );
  const categoryName =
    categoryTaxonomy?.terms?.find(
      (entry) => entry.id === String(requestData.category_id || ""),
    )?.label ||
    String(requestData.category_name || requestData.category_id || "-");
  const requestTags = tagsResponse?.tags ?? [];
  const projectName =
    projects?.find((entry: ProjectOption) => entry.id === String(requestData.project_id || ""))
      ?.name ||
    String(requestData.project_name || requestData.project_id || "-");
  const teamName = request?.team?.name || String(requestData.team_name || requestData.team_id || "-");
  const handoverUserId = String(requestData.handover_user_id || "");
  const handoverColleagueName = useMemo(() => {
    if (!handoverUserId) return "-";
    for (const team of teams ?? []) {
      for (const member of team.members ?? []) {
        const memberId = String(member.userId || member.user.id || "");
        if (memberId !== handoverUserId) continue;
        return (
          `${member.user.firstName ?? ""} ${member.user.lastName ?? ""}`.trim() ||
          member.user.username ||
          member.user.email ||
          handoverUserId
        );
      }
    }
    return handoverUserId;
  }, [handoverUserId, teams]);
  const organizationName = request?.organization?.name || String(requestData.organization_name || requestData.organization_id || "-");
  const lineItems = request?.items ?? [];
  const documents = lineItems.flatMap((item) => item.files ?? []);
  const requestTotal = Number(request?.total_amount || 0);
  const availableActions = requestActions ?? [];
  const finance = usePaymentRequest(id, requestTotal, availableActions, {
    skip: workflowType !== "payment",
  });
  const pendingApprovals = request?.approvals?.pending ?? [];
  const completedApprovals = request?.approvals?.done ?? [];
  const showDraftStep =
    detailView === "mine" &&
    workflowStatus === "draft" &&
    requestHasDraftHistory(request);
  const workflow =
    workflowType === "leave"
      ? buildLeaveWorkflow(request, pendingApprovals, { showDraftStep })
      : workflowType === "loan"
        ? buildLoanWorkflow(request, pendingApprovals, { showDraftStep })
        : buildWorkflow(request, pendingApprovals, finance.paymentVouchers ?? [], {
            showDraftStep,
          });
  const parentPath =
    detailView === "hr"
      ? "/hr/leave"
      : detailView === "mine" && workflowType === "leave"
      ? "/leave"
      : detailView === "approvals"
        ? "/requests/approvals"
        : detailView === "finance"
          ? "/finance/requests"
          : "/requests";
  const parentLabel =
    detailView === "hr"
      ? "HR Requests"
      : detailView === "mine" && workflowType === "leave"
      ? "Leave Tracker"
      : detailView === "approvals"
        ? "Approvals"
        : detailView === "finance"
          ? "Finance Requests"
          : "My Requests";
  const detailActiveLabel =
    detailView === "hr"
      ? "hr-leave"
      : detailView === "finance"
      ? "Finance Requests"
      : detailView === "approvals"
        ? "Approvals"
        : "Request Details";
  const detailMobileNav =
    detailView === "finance"
      ? buildAppMobileNav("Finance")
      : detailView === "hr"
        ? buildAppMobileNav("HR")
        : requestsMobileNav;
  const canSubmit =
    (requestActions ?? []).includes("submit") &&
    ["draft", "returned"].includes(workflowStatus);
  const canEditRequest = ["draft", "returned"].includes(workflowStatus);
  const roles = (user?.roles ?? []).map((entry) =>
    String(entry).trim().toLowerCase(),
  );
  const permissions = (user?.permissions ?? []).map((entry) =>
    String(entry).trim().toLowerCase(),
  );
  const requestStatus = workflowStatus;
  const approvalActionsVisible =
    availableActions.includes("approve") ||
    availableActions.includes("reject") ||
    availableActions.includes("return");
  // Finance clearing uses "approve" action key — hide approve/reject/return buttons
  // in the team lead approvals view when the pending step belongs to Finance.
  // Finance users must act from /finance/requests/:id instead.
  const isFinancePendingStep = pendingApprovals.some(
    (p: any) =>
      p?.approver_id === "finance.approve" || p?.approver_id === "accountant",
  );
  const handlerActionsVisible = detailView === "finance";
  const ownerActionsVisible = detailView === "mine";
  const viewerStatus = useMemo(() => {
    if (!request) {
      return { label: "Loading", hint: "", tone: "neutral" as const };
    }
    const pendingStep = pendingApprovals[0]?.step;
    if (workflowType === "leave") {
      return buildLeaveViewerStatus({
        approvalActionsVisible,
        ownerActionsVisible,
        requestStatus,
        workflowStatus,
        availableActions,
        pendingStep,
        statusTone,
      });
    }
    if (workflowType === "loan") {
      return buildLoanViewerStatus({
        approvalActionsVisible,
        ownerActionsVisible,
        handlerActionsVisible,
        requestStatus,
        workflowStatus,
        availableActions,
        pendingStep,
        roles,
        permissions,
        statusTone,
        handlerRoleLabel: request?.request_type?.handler_role_label,
      });
    }
    return buildPaymentViewerStatus({
      approvalActionsVisible,
      ownerActionsVisible,
      handlerActionsVisible,
      requestStatus,
      workflowStatus,
      availableActions,
      pendingStep,
      roles,
      permissions,
      statusTone,
      workflowType,
    });
  }, [
    approvalActionsVisible,
    availableActions,
    workflowType,
    handlerActionsVisible,
    ownerActionsVisible,
    pendingApprovals,
    permissions,
    request,
    requestStatus,
    workflowStatus,
    roles,
    statusTone,
  ]);

  const financeProgress = useMemo(() => {
    if (!request || workflowType !== "payment") return { label: "", hint: "" };
    return buildPaymentProgress({
      requestStatus,
      requestTotal,
      disbursedTotal: finance.disbursedTotal,
      remainingDisbursement: finance.remainingDisbursement,
      currency: request.currency,
    });
  }, [
    finance.disbursedTotal,
    finance.remainingDisbursement,
    workflowType,
    request,
    requestStatus,
    requestTotal,
  ]);

  const loanProgress = useMemo(() => {
    if (!request || workflowType !== "loan") return { label: "", hint: "" };
    return buildLoanProgress({
      requestStatus,
      requestTotal,
      disbursedTotal: 0,
      repaidTotal: 0,
      currency: request.currency,
    });
  }, [workflowType, request, requestStatus, requestTotal]);

  const disbursementButtonLabel =
    requestStatus === "disbursed" &&
      requestTotal > 0 &&
      finance.disbursedTotal < requestTotal
      ? "Disburse More"
      : "Disburse Request";
  const canShowNudge =
    !availableActions.length &&
    Boolean(request) &&
    !["completed", "cancelled", "rejected"].includes(requestStatus);
  const nudgeHeadline = pendingApprovals[0]?.step
    ? `Waiting on ${pendingApprovals[0].step}`
    : "Request waiting on review";
  const nudgeMessage = useMemo(() => {
    if (!request) return "";
    const requestLabel = request.request_number || `Request #${request.id}`;
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}${detailPathForView(detailView, request.id)}`
        : "";
    return [
      `Hi, please take a look at ${requestLabel}.`,
      link ? `Open: ${link}` : "",
      `Current status: ${formatViewerRequestStatus(request.status, availableActions, pendingApprovals[0]?.step, workflowType)}`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [availableActions, detailView, pendingApprovals, request, workflowType]);

  async function handleDownloadArtifact(
    action: "request_pdf" | "full_document" | "pv_pdf",
    voucherId?: string,
  ) {
    if (!id) return;
    const busyKey =
      action === "request_pdf"
        ? "download_request_pdf"
        : action === "full_document"
          ? "download_full_document"
          : `download_pv:${voucherId || "default"}`;
    try {
      setActionBusy(busyKey);
      const file = await downloadRequestArtifact(id, {
        action,
        voucher_id: voucherId,
      });
      downloadBase64File(file.file_name, file.mime_type, file.content_base64);
      showToast({
        title: "Download ready",
        message:
          action === "request_pdf"
            ? "The request PDF has been downloaded."
            : action === "full_document"
              ? "The full request document has been downloaded."
              : "The payment voucher has been downloaded.",
        tone: "success",
      });
    } catch (error) {
      showToast({
        title: "Download failed",
        message:
          error instanceof Error
            ? error.message
            : "We couldn't generate that download right now.",
        tone: "danger",
      });
    } finally {
      setActionBusy("");
    }
  }

  async function handleDeleteDraft() {
    if (!id) return;
    const shouldDelete =
      typeof window === "undefined"
        ? false
        : window.confirm("Delete this draft request? This cannot be undone.");
    if (!shouldDelete) return;
    try {
      setActionBusy("delete");
      await deleteRequest(id);
      cacheStore.invalidateCache("requests:list:mine");
      cacheStore.invalidateCache(`requests:detail:${id}`);
      cacheStore.invalidateCache(`requests:actions:${id}`);
      showToast({
        title: "Draft deleted",
        message: "The request draft has been removed.",
        tone: "success",
      });
      navigate(parentPath, { replace: true });
    } catch (error) {
      showToast({
        title: "Delete failed",
        message:
          error instanceof Error
            ? error.message
            : "We couldn't delete the draft right now.",
        tone: "danger",
      });
    } finally {
      setActionBusy("");
    }
  }

  const activityItems = useMemo(() => {
    type ActivityItem = {
      title: string;
      description: string;
      time: string;
      tone: "neutral" | "success" | "warning" | "pending" | "danger";
      icon: string;
    };

    const created: ActivityItem[] =
      detailView === "mine" && request?.created_at
        ? [
          {
            title: "Request created",
            description: "The request was saved into the workflow.",
            time: formatDisplayDate(request.created_at),
            tone: "neutral",
            icon: "add_task",
          },
        ]
        : [];

    const done: ActivityItem[] = completedApprovals.map((entry) => {
      const actor = [
        entry.performed_by_name || null,
        entry.performed_by_email ? `<${entry.performed_by_email}>` : null,
      ].filter(Boolean).join(" ");
      const actionLabel = entry.action === "reject" ? "Rejected" : entry.action === "auto_approve" ? "Auto-approved" : "✓ " + (entry.comment || "Approved");
      return {
        title: entry.step,
        description: actor ? `${actor}\n${actionLabel}` : actionLabel,
        time: formatDisplayDate(entry.at),
        tone: entry.action === "reject" ? "danger" : "success",
        icon: entry.action === "reject" ? "cancel" : "task_alt",
      };
    });

    const pending: ActivityItem[] = pendingApprovals.map((entry) => ({
      title: `${entry.step} pending`,
      description: `Waiting on ${entry.approver_type.replaceAll("_", " ")} action.`,
      time: "Pending",
      tone: "pending",
      icon: "schedule",
    }));

    const stateEvents = Array.isArray(request?.data?.state_events)
      ? request.data.state_events
      : [];

    const stateActivity: ActivityItem[] = stateEvents
      .filter((event: Record<string, unknown>) =>
        [
          "disburse",
          "retire",
          "retire_partial",
          "confirm",
          "complete",
        ].includes(String(event.action || "").toLowerCase()),
      )
      .map((event: Record<string, unknown>) => {
        const action = String(event.action || "").toLowerCase();
        const to = String(event.to || "").toLowerCase();
        return {
          title:
            action === "disburse"
              ? "Request disbursed"
              : action === "confirm"
                ? "Receipt confirmed"
                : action === "complete"
                  ? "Request completed"
                  : "Retirement updated",
          description: String(event.comment || "Workflow state updated."),
          time: formatDisplayDate(String(event.at || "")),
          tone:
            to === "disbursed" || to === "completed" ? "success" : "warning",
          icon:
            action === "disburse"
              ? "payments"
              : action === "confirm"
                ? "task_alt"
                : action === "complete"
                  ? "verified"
                  : "receipt_long",
        };
      });

    const voucherActivity: ActivityItem[] = (finance.paymentVouchers ?? []).flatMap(
      (voucher) => {
        const items: ActivityItem[] = [
          {
            title: `${voucher.voucher_number} disbursed`,
            description: [
              formatCurrency(voucher.amount, request?.currency),
              voucher.method
                ? `via ${formatRequestStatus(voucher.method)}`
                : null,
              voucher.note || null,
            ]
              .filter(Boolean)
              .join(" • "),
            time: formatDisplayDate(voucher.disbursed_at),
            tone: "success",
            icon: "payments",
          },
        ];
        if (voucher.retired_at) {
          items.push({
            title: `${voucher.voucher_number} retired`,
            description:
              voucher.retired_amount > 0
                ? `Retired ${formatCurrency(voucher.retired_amount, request?.currency)}`
                : "Retirement submitted.",
            time: formatDisplayDate(voucher.retired_at),
            tone:
              voucher.retirement_status === "verified" ? "success" : "warning",
            icon:
              voucher.retirement_status === "verified"
                ? "verified"
                : "receipt_long",
          });
        }
        if (voucher.verified_at) {
          items.push({
            title: `${voucher.voucher_number} verified`,
            description:
              "Finance verified the retirement and closed the voucher.",
            time: formatDisplayDate(voucher.verified_at),
            tone: "success",
            icon: "task_alt",
          });
        }
        return items;
      },
    );

    return [
      ...created,
      ...done,
      ...pending.filter(
        (entry) =>
          !completedApprovals.some(
            (doneEntry) =>
              String(doneEntry.step || "")
                .trim()
                .toLowerCase() ===
              entry.title
                .replace(/ pending$/i, "")
                .trim()
                .toLowerCase(),
          ),
      ),
      ...stateActivity,
      ...voucherActivity,
    ];
  }, [
    completedApprovals,
    detailView,
    pendingApprovals,
    finance.paymentVouchers,
    request?.created_at,
    request?.currency,
    request?.data,
  ]);

  async function handleWorkflowAction(
    action:
      | "submit"
      | "approve"
      | "reject"
      | "return"
      | "disburse"
      | "confirm"
      | "retire"
      | "complete",
  ) {
    if (!id) return;
    try {
      setActionBusy(action);
      if (action === "submit") {
        await submitRequest(id, actionComment.trim() || undefined);
      } else if (action === "approve") {
        const comment = actionComment.trim();
        if (!comment) {
          showToast({ tone: "warning", title: "Decision note required", message: "Please add a comment before approving." });
          return;
        }
        await approveRequest(id, comment);
      } else if (action === "reject") {
        const comment = actionComment.trim();
        if (!comment) {
          showToast({ tone: "warning", title: "Decision note required", message: "Please add a comment before rejecting." });
          return;
        }
        await rejectRequest(id, comment);
      } else if (action === "return") {
        const reason = actionComment.trim();
        if (!reason) {
          showToast({
            tone: "warning",
            title: "Return note required",
            message:
              "Please add a reason so the requester knows what to correct before resubmitting.",
          });
          return;
        }
        await returnRequest(id, reason);
      } else if (action === "disburse") {
        const traceId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const disbursePayload = {
          amount: Number(finance.disburseForm.amount || request?.total_amount || 0),
          method: finance.disburseForm.method || undefined,
          transaction_ref: finance.disburseForm.transaction_ref.trim() || undefined,
          paid_from_account_id: finance.disburseForm.paid_from_account_id || undefined,
          note: finance.disburseForm.note.trim() || undefined,
          disbursed_at: finance.disburseForm.disbursed_at
            ? `${finance.disburseForm.disbursed_at}T00:00:00.000Z`
            : undefined,
          evidence_file_id: finance.disburseFiles[0]?.id,
          evidence_file_ids: finance.disburseFiles.map((file) => file.id),
        };
        if (finance.disburseMode === "edit" && finance.editingVoucherId) {
          await financeApi.updatePaymentVoucher(
            id,
            finance.editingVoucherId,
            disbursePayload,
          );
        } else {
          await disburseRequest(id, disbursePayload, { traceId });
        }
      } else if (action === "confirm") {
        await confirmRequest(id);
      } else if (action === "retire") {
        const selectedVoucher =
          (finance.paymentVouchers ?? []).find(
            (voucher) => voucher.id === finance.retireForm.voucher_id,
          ) || null;
        const retiredAmount = finance.retireForm.retired_amount.trim()
          ? Number(finance.retireForm.retired_amount)
          : undefined;
        const shortfall = selectedVoucher
          ? Math.max(0, Number(selectedVoucher.amount || 0) - Number(retiredAmount || 0))
          : 0;
        const refundAmount = finance.retireForm.refund_amount.trim()
          ? Number(finance.retireForm.refund_amount)
          : 0;
        const hasRefundDetails =
          refundAmount >= shortfall &&
          Boolean(finance.retireForm.refund_method.trim()) &&
          Boolean(finance.retireForm.refund_reference.trim());
        const hasRefundEvidence = finance.retireForm.retirement_file_ids.length > 0;

        if (shortfall > 0 && !hasRefundDetails && !hasRefundEvidence) {
          showToast({
            title: "Refund evidence required",
            message:
              "You retired less than disbursed. Add refund details or upload refund evidence before submitting.",
            tone: "warning",
          });
          return;
        }

        await retireRequest(id, {
          voucher_id: finance.retireForm.voucher_id || undefined,
          retired_amount: retiredAmount,
          notes: finance.retireForm.notes.trim() || actionComment.trim() || undefined,
          retirement_file_ids: finance.retireForm.retirement_file_ids.length
            ? finance.retireForm.retirement_file_ids
            : undefined,
          breakdown:
            shortfall > 0
              ? {
                  refund: {
                    required_amount: shortfall,
                    refund_amount: refundAmount || undefined,
                    refund_method: finance.retireForm.refund_method || undefined,
                    refund_reference:
                      finance.retireForm.refund_reference.trim() || undefined,
                    refund_date: finance.retireForm.refund_date || undefined,
                    evidence_file_ids: finance.retireForm.retirement_file_ids,
                  },
                }
              : undefined,
        });
      } else if (action === "complete") {
        await completeRequest(id);
      }
      setActionComment("");
      finance.closeDisburseDialog();
      finance.closeRetireDialog();
      finance.setDisburseForm({
        amount: "",
        method: "bank_transfer",
        transaction_ref: "",
        paid_from_account_id: "",
        note: "",
        disbursed_at: new Date().toISOString().slice(0, 10),
      });
      finance.setDisburseFiles([]);
      finance.setRetireForm({
        voucher_id: "",
        retired_amount: "",
        notes: "",
        retirement_file_ids: [],
        refund_amount: "",
        refund_method: "bank_transfer",
        refund_reference: "",
        refund_date: new Date().toISOString().slice(0, 10),
      });
      finance.setShowCertificateHonorForm(false);
      finance.setRetirementCertificateForm({
        declaration:
          "I hereby certify that the disbursed funds referenced above were used for official purposes in line with the approved request.",
        reason:
          "No supporting receipt is available for the full amount because the expense was settled without a formal receipt or the receipt could not be obtained in time for retirement.",
      });
      [
        "requests:list:mine",
        "requests:list:approvals",
        "finance-admin:requests",
        "finance-vouchers:list",
        `requests:detail:${id}`,
        `requests:actions:${id}`,
        `requests:detail:payment-vouchers:${id}`,
      ].forEach((key) => cacheStore.invalidateCache(key));
      await Promise.allSettled([
        refetch(),
        refetchRequestActions(),
        finance.refetchPaymentVouchers(),
      ]);
      showToast({
        title: "Request updated",
        message:
          action === "submit"
            ? "The request has been submitted into workflow."
            : action === "approve"
              ? handlerActionsVisible
                ? "The request has been cleared for disbursement or the next finance step."
                : "Your approval has been recorded."
              : action === "reject"
                ? "Your rejection has been recorded."
                : action === "disburse"
                  ? finance.disburseMode === "edit"
                    ? "The payment voucher has been updated."
                    : "The request has been marked as disbursed."
                  : action === "confirm"
                    ? "Receipt confirmation has been recorded."
                    : action === "retire"
                      ? "Retirement details have been submitted."
                      : "The request has been completed.",
        tone: "success",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "We couldn't complete that action just now.";
      const staleActionState = [
        "workflow instance is not active",
        "workflow instance not found",
        "request is not pending approval",
      ].some((snippet) => errorMessage.toLowerCase().includes(snippet));

      if (staleActionState && id) {
        [
          "requests:list:mine",
          "requests:list:approvals",
          "finance-admin:requests",
          "finance-vouchers:list",
          `requests:detail:${id}`,
          `requests:actions:${id}`,
          `requests:detail:payment-vouchers:${id}`,
        ].forEach((key) => cacheStore.invalidateCache(key));

        await Promise.allSettled([
          refetch(),
          refetchRequestActions(),
          finance.refetchPaymentVouchers(),
        ]);

        showToast({
          title: "Request already updated",
          message:
            "The action was applied, and this view has been refreshed to show the latest status.",
          tone: "warning",
        });
        return;
      }

      showToast({
        title: "Action failed",
        message: errorMessage,
        tone: "danger",
      });
    } finally {
      setActionBusy("");
    }
  }

  async function copyNudge() {
    try {
      await navigator.clipboard.writeText(nudgeMessage);
      showToast({
        title: "Reminder copied",
        message: "You can paste the nudge into chat or email.",
        tone: "success",
      });
    } catch {
      showToast({
        title: "Copy failed",
        message: "We couldn't copy the reminder text right now.",
        tone: "danger",
      });
    }
  }

  const contextValue: RequestDetailsContextValue = {
    request: request ?? null,
    requestData: requestData as Record<string, unknown>,
    requestTotal,
    workflowType,
    workflowStatus,
    requestStatus,
    handlerRoleLabel: request?.request_type?.handler_role_label ?? null,
    detailView,
    parentPath,
    parentLabel,
    currentUserId,
    availableActions,
    approvalActionsVisible,
    ownerActionsVisible,
    handlerActionsVisible,
    isFinancePendingStep,
    canSubmit,
    canEditRequest,
    viewerStatus,
    financeProgress,
    loanProgress,
    workflow,
    pendingApprovals,
    completedApprovals,
    finance,
    disbursementButtonLabel,
    categoryName,
    projectName,
    teamName,
    organizationName,
    handoverColleagueName,
    lineItems,
    documents,
    requestTags: requestTags as Array<{ id: string; label: string }>,
    canShowNudge,
    nudgeHeadline,
    nudgeMessage,
    activityItems,
    actionBusy,
    actionComment,
    setActionComment,
    handleWorkflowAction,
    handleDownloadArtifact,
    handleDeleteDraft,
    copyNudge,
  };

  if (!id) {
    return (
      <AppShell
        navigation={buildRequestsNavigation()}
        activeLabel="My Requests"
        user={{ name: "Alex Sterling", role: "Fleet Operations" }}
        mobileNav={requestsMobileNav}
      >
        <div className="shell-panel flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <EmptyState
            title="No request selected"
            description="Open a request from the list so we can show its details."
          />
          <Link
            to={parentPath}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
          >
            Back to {parentLabel}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <RequestDetailsContext.Provider value={contextValue}>
      <AppShell
        navigation={buildRequestsNavigation({
          includeRequestDetails:
            detailView === "mine" || detailView === "approvals",
          requestDetailsPath: detailPathForView(detailView, id),
          requestDetailsParent: detailView === "finance" ? "finance" : "requests",
        })}
        activeLabel={detailActiveLabel}
        user={{ name: "Alex Sterling", role: "Fleet Operations" }}
        mobileNav={detailMobileNav}
      >
        {/* Desktop header */}
        <div className="hidden lg:block">
          <PageHeader
            breadcrumbs={
              detailView === "finance"
                ? [
                    { label: "Finance", path: "/finance" },
                    { label: parentLabel, path: parentPath },
                    { label: request?.request_number || "Details" },
                  ]
                : detailView === "hr"
                  ? [
                      { label: "HR", path: "/hr" },
                      { label: parentLabel, path: parentPath },
                      { label: request?.request_number || "Details" },
                    ]
                  : [
                      { label: "Requests", path: parentPath },
                      { label: parentLabel, path: parentPath },
                      { label: request?.request_number || "Details" },
                    ]
            }
            title={
              request?.request_number ||
              (loading ? "Loading request..." : "Request details")
            }
            description={
              request
                ? `${request?.request_type?.name || workflowTypeFromRecord(request)} • ${formatPersonName(request.creator)} • ${formatDisplayDate(request.created_at)}`
                : "Review the request details, activity, and next step."
            }
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={parentPath}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                >
                  <Icon name="arrow_back" className="text-[18px]" />
                  Back to {parentLabel}
                </Link>
                {canEditRequest ? (
                  <Link
                    to={`${workflowType === "leave" ? "/leave/new/form" : "/requests/new/form"}?edit=${id}&typeId=${request?.request_type?.id || ""}`}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                  >
                    <Icon name="edit" className="text-[18px]" />
                    {workflowStatus === "returned" ? "Edit Returned Request" : "Edit Draft"}
                  </Link>
                ) : null}
              </div>
            }
          />
        </div>

        {/* Mobile header */}
        <div className="pt-1 lg:hidden">
          <button
            type="button"
            onClick={() => navigate(parentPath)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            Back to {parentLabel}
          </button>

          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                {parentLabel}
              </p>
              <h1 className="page-title mt-2 text-[clamp(1.7rem,7vw,2.2rem)]">
                {request?.request_number || "Request details"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {request
                  ? `${request.request_type?.name || workflowTypeFromRecord(request)} • ${formatPersonName(request.creator)} • ${formatDisplayDate(request.created_at)}`
                  : "Loading..."}
              </p>
            </div>
            {request ? (
              <Chip variant={viewerStatus.tone}>{viewerStatus.label}</Chip>
            ) : null}
          </div>
        </div>

        {/* Shared content — responsive single layout */}
        {loading ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Loading request details...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
            {error}
          </div>
        ) : request ? (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Right rail — first in DOM so action card appears top on mobile */}
            <div className="space-y-4 lg:order-2 lg:col-span-4">
              <RequestHeaderCard />
              <RequestActionCard />
              <DownloadsSection />
              <NudgeSection />
              <WorkflowStepperCard />
            </div>
            {/* Main content — visually left on desktop */}
            <div className="space-y-6 lg:order-1 lg:col-span-8">
              {workflowType === "procurement" ? <ProcurementRequestDetail /> :
               workflowType === "leave" ? <LeaveRequestDetail /> :
               workflowType === "loan" ? <LoanRequestDetail /> :
               workflowType === "payment" ? <PaymentRequestDetail /> :
               <OtherRequestDetail />}
              <SupportingDocsSection />
              <ActivitySection />
            </div>
          </div>
        ) : null}
      </AppShell>
    </RequestDetailsContext.Provider>
  );
}

export default RequestDetailsPage;
