import {
  Icon,
  PageHeader,
  EmptyState,
  useToast,
} from "@/shared";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { cacheStore, financeApi, useCachedQuery } from "@/shared/lib/core";
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
  listGroups,
  retireRequest,
  submitRequest,
} from "@/pages/requests/requests-api";
import {
  listEntityTags,
  listManagedTaxonomies,
} from "@/pages/requests/taxonomy-api";
import { downloadBase64File } from "@/shared/lib/download";
import { formatCurrency, formatDisplayDate } from "@stanforte/shared";
import {
  formatPersonName,
  formatRequestStatus,
  formatViewerRequestStatus,
  requestCategoryFromRecord,
  requestStatusTone,
} from "@/pages/requests/request-helpers";
import type { FinancePaymentVoucherRecord } from "@/shared";
import type { MyOrganization, ProjectOption, TeamOption } from "@/pages/requests/requests-api";
import {
  buildWorkflow,
  deriveRequestWorkflowStatus,
  requestHasDraftHistory,
} from "./utils/workflow";
import {
  RequestDetailsContext,
  initialDisburseForm,
  initialRetireForm,
  type RequestDetailsContextValue,
  type DeductionLine,
} from "./context";
import { RequestDetailsLayout } from "./components/RequestDetailsLayout";
import { DisburseDialog } from "./components/modals/DisburseDialog";
import { VoucherPreviewDialog } from "./components/modals/VoucherPreviewDialog";
import { RetireDialog } from "./components/modals/RetireDialog";

function resolveFinanceDetailView(): "mine" | "approvals" | "finance" {
  return "finance";
}

export function FinanceRequestDetailsPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const [actionComment, setActionComment] = useState("");
  const [actionBusy, setActionBusy] = useState<string>("");
  const [showDisburseDialog, setShowDisburseDialog] = useState(false);
  const [showRetireDialog, setShowRetireDialog] = useState(false);
  const [showVoucherPreviewDialog, setShowVoucherPreviewDialog] =
    useState(false);
  const [previewVoucher, setPreviewVoucher] =
    useState<FinancePaymentVoucherRecord | null>(null);
  const [disburseMode, setDisburseMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingVoucherId, setEditingVoucherId] = useState<string>("");
  const [disburseForm, setDisburseForm] = useState(initialDisburseForm);
  const [disburseFiles, setDisburseFiles] = useState<
    Array<{ id: string; file_name: string }>
  >([]);
  const [disburseDeductions, setDisburseDeductions] = useState<DeductionLine[]>([]);
  const [showDisbursementMediaPicker, setShowDisbursementMediaPicker] =
    useState(false);
  const [showRetirementMediaPicker, setShowRetirementMediaPicker] =
    useState(false);
  const [retireForm, setRetireForm] = useState(initialRetireForm);
  const [showCertificateHonorForm, setShowCertificateHonorForm] =
    useState(false);
  const [retirementCertificateForm, setRetirementCertificateForm] = useState({
    declaration:
      "I hereby certify that the disbursed funds referenced above were used for official purposes in line with the approved request.",
    reason:
      "No supporting receipt is available for the full amount because the expense was settled without a formal receipt or the receipt could not be obtained in time for retirement.",
  });
  const defaultCertificateReason =
    "No supporting receipt is available for the full amount because the expense was settled without a formal receipt or the receipt could not be obtained in time for retirement.";

  const id = routeId || searchParams.get("id") || "";
  const detailView = resolveFinanceDetailView();
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
    { ttlMs: 1000 * 60 * 10, storage: "memory" },
  );
  const { data: organizations } = useCachedQuery(
    "requests:my-organizations",
    () => listMyOrganizations(),
    { ttlMs: 1000 * 60 * 10, storage: "memory" },
  );
  const { data: teams } = useCachedQuery(
    "requests:groups",
    () => listGroups(),
    { ttlMs: 1000 * 60 * 10, storage: "memory" },
  );
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
  const { data: financeAccountsRaw } = useCachedQuery(
    "finance:accounts:options",
    () => financeApi.listAccounts({ is_active: true }),
    { ttlMs: 1000 * 60 * 10, storage: "memory" },
  );
  const financeAccounts: any[] = Array.isArray(financeAccountsRaw) ? financeAccountsRaw : [];
  const { data: paymentVouchers, refetch: refetchPaymentVouchers } =
    useCachedQuery(
      `requests:detail:payment-vouchers:${id || "none"}`,
      () =>
        id
          ? financeApi.listRequestPaymentVouchers(id)
          : Promise.resolve([]),
      { ttlMs: 1000 * 60, storage: "memory" },
    );

  const workflowType = requestCategoryFromRecord(request || undefined);
  const statusTone = requestStatusTone(request?.status);
  const requestData =
    request?.data && typeof request.data === "object" ? request.data : {};
  const categoryTaxonomyKey = String(
    request?.request_type?.taxonomy_keys?.[0] || "",
  );
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
    projects?.find(
      (entry: ProjectOption) => entry.id === String(requestData.project_id || ""),
    )?.name ||
    String(requestData.project_name || requestData.project_id || "-");
  const teamName =
    teams?.find((entry: TeamOption) => entry.id === String(requestData.team_id || ""))
      ?.name || String(requestData.team_name || requestData.team_id || "-");
  const organizationName =
    organizations?.find(
      (entry: MyOrganization) =>
        entry.organization.id === String(requestData.organization_id || ""),
    )?.organization.name ||
    String(
      requestData.organization_name || requestData.organization_id || "-",
    );
  const lineItems = request?.items ?? [];
  const documents = lineItems.flatMap((item: any) => item.files ?? []);
  const requestTotal = Number(request?.total_amount || 0);
  const disbursedTotal = useMemo(
    () =>
      (paymentVouchers ?? []).reduce(
        (sum, voucher) => sum + Number((voucher.gross_amount ?? voucher.amount) || 0),
        0,
      ),
    [paymentVouchers],
  );
  const totalDeductions = useMemo(
    () =>
      (paymentVouchers ?? []).reduce(
        (sum, voucher) => {
          const gross = voucher.gross_amount !== undefined ? Number(voucher.gross_amount) : Number(voucher.amount || 0);
          const net = voucher.net_amount !== undefined ? Number(voucher.net_amount) : Number(voucher.amount || 0);
          return sum + (gross - net);
        },
        0,
      ),
    [paymentVouchers],
  );
  const retiredTotal = useMemo(
    () =>
      (paymentVouchers ?? []).reduce(
        (sum, voucher) => sum + Number(voucher.retired_amount || 0),
        0,
      ),
    [paymentVouchers],
  );
  const remainingDisbursement = Math.max(0, requestTotal - disbursedTotal);
  const defaultFinanceAccountId = financeAccounts?.[0]?.id ?? "";
  const pendingApprovals = request?.approvals?.pending ?? [];
  const completedApprovals = request?.approvals?.done ?? [];
  const workflowStatus = deriveRequestWorkflowStatus(request);
  const workflow = buildWorkflow(
    request,
    pendingApprovals,
    paymentVouchers ?? [],
    {
      showDraftStep:
        detailView === "mine" &&
        workflowStatus === "draft" &&
        requestHasDraftHistory(request),
    },
  );
  const parentPath =
    detailView === "approvals"
      ? "/requests/approvals"
      : detailView === "finance"
        ? "/finance/requests"
        : "/requests";
  const parentLabel =
    detailView === "approvals"
      ? "Approvals"
      : detailView === "finance"
        ? "Finance Requests"
        : "My Requests";
  const detailActiveLabel =
    detailView === "finance"
      ? "finance-requests"
      : detailView === "approvals"
        ? "Approvals"
        : "Request Details";
  const detailMobileNav =
    detailView === "finance"
      ? buildAppMobileNav("Finance")
      : requestsMobileNav;
  const canSubmit =
    (requestActions ?? []).includes("submit") && workflowStatus === "draft";
  const canEditDraft = workflowStatus === "draft";
  const roles = (user?.roles ?? []).map((entry) =>
    String(entry).trim().toLowerCase(),
  );
  const permissions = (user?.permissions ?? []).map((entry) =>
    String(entry).trim().toLowerCase(),
  );
  const availableActions = requestActions ?? [];
  const requestStatus = workflowStatus;
  const approvalActionsVisible =
    availableActions.includes("approve") ||
    availableActions.includes("reject");
  const financeActionsVisible = detailView === "finance";
  const ownerActionsVisible = detailView === "mine";

  const viewerStatus = useMemo(() => {
    if (!request)
      return { label: "Loading", hint: "", tone: "neutral" as const };
    if (approvalActionsVisible) {
      return {
        label: formatViewerRequestStatus(
          workflowStatus,
          availableActions,
          pendingApprovals[0]?.step,
        ),
        hint: financeActionsVisible
          ? "Finance is the current approver for this request. Clear it here for disbursement or the next finance step."
          : "You are the current approver for this step.",
        tone: "warning" as const,
      };
    }
    if (ownerActionsVisible && availableActions.includes("submit")) {
      return {
        label: formatViewerRequestStatus(
          workflowStatus,
          availableActions,
          pendingApprovals[0]?.step,
        ),
        hint: "You can still revise this before submission.",
        tone: "neutral" as const,
      };
    }
    if (financeActionsVisible && availableActions.includes("disburse")) {
      return {
        label: "Ready for Disbursement",
        hint: "Finance can now disburse the request and start voucher handling.",
        tone: "success" as const,
      };
    }
    if (ownerActionsVisible && availableActions.includes("confirm")) {
      return {
        label: formatViewerRequestStatus(
          workflowStatus,
          availableActions,
          pendingApprovals[0]?.step,
        ),
        hint: "Finance has disbursed this request. Confirm receipt here once the funds or voucher reach you.",
        tone: "warning" as const,
      };
    }
    if (ownerActionsVisible && availableActions.includes("retire")) {
      return {
        label: formatViewerRequestStatus(
          workflowStatus,
          availableActions,
          pendingApprovals[0]?.step,
        ),
        hint: "After spending the disbursed amount, submit retirement details and receipt support here.",
        tone: "warning" as const,
      };
    }
    if (financeActionsVisible && availableActions.includes("complete")) {
      return {
        label: formatViewerRequestStatus(
          workflowStatus,
          availableActions,
          pendingApprovals[0]?.step,
        ),
        hint: "Finance can verify the retirement and complete this request.",
        tone: "warning" as const,
      };
    }
    if (requestStatus === "approval") {
      const financeViewer =
        roles.some(
          (role) => role.includes("finance") || role === "accountant",
        ) || permissions.some((p) => p === "finance.approve");
      return {
        label: financeViewer ? "In Approval Workflow" : "In Review",
        hint: financeViewer
          ? "This request is progressing through the approval chain."
          : "Your request is currently under review.",
        tone: "warning" as const,
      };
    }
    if (requestStatus === "cleared") {
      return {
        label: "Ready for Disbursement",
        hint: "Finance can now prepare disbursement and voucher handling.",
        tone: "success" as const,
      };
    }
    return {
      label: formatViewerRequestStatus(
        workflowStatus,
        availableActions,
        pendingApprovals[0]?.step,
      ),
      hint: "This reflects the current workflow state for your view.",
      tone: statusTone,
    };
  }, [
    approvalActionsVisible,
    availableActions,
    financeActionsVisible,
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
    if (!request) return { label: "", hint: "" };
    if (requestStatus === "cleared") {
      return {
        label: "Ready for Disbursement",
        hint: "Finance can release the first payment voucher or split the request across multiple vouchers.",
      };
    }
    if (requestStatus === "disbursed") {
      if (requestTotal > 0 && disbursedTotal < requestTotal) {
        return {
          label: "Partially Disbursed",
          hint: `Remaining to be disbursed before requester confirmation.`,
        };
      }
      return {
        label: "Awaiting Confirmation",
        hint: "The disbursement is complete. The requester should confirm receipt before retirement.",
      };
    }
    if (requestStatus === "confirmed") {
      return {
        label: "Awaiting Retirement",
        hint: "The requester has confirmed receipt. Retirement support can now be submitted.",
      };
    }
    if (requestStatus === "retired") {
      return {
        label: "Awaiting Verification",
        hint: "Finance should verify the retirement records before the request can close.",
      };
    }
    if (requestStatus === "completed") {
      return {
        label: "Completed",
        hint: "The finance workflow has been fully closed.",
      };
    }
    return { label: "", hint: "" };
  }, [disbursedTotal, request, requestStatus, requestTotal]);

  const disbursementButtonLabel =
    requestStatus === "disbursed" &&
    requestTotal > 0 &&
    disbursedTotal < requestTotal
      ? "Disburse More"
      : "Disburse Request";

  useEffect(() => {
    if (!showDisburseDialog) return;
    if (disburseMode !== "create") return;
    if (disburseForm.paid_from_account_id || !defaultFinanceAccountId) return;
    setDisburseForm((current) => ({
      ...current,
      paid_from_account_id: defaultFinanceAccountId,
    }));
  }, [
    defaultFinanceAccountId,
    disburseForm.paid_from_account_id,
    disburseMode,
    showDisburseDialog,
  ]);

  const retireableVoucher = useMemo(
    () =>
      (paymentVouchers ?? []).find(
        (voucher) => Number(voucher.voucher_balance || 0) > 0,
      ) ||
      (paymentVouchers ?? [])[0] ||
      null,
    [paymentVouchers],
  );
  const selectedRetirementVoucher = useMemo(
    () =>
      (paymentVouchers ?? []).find(
        (voucher) => voucher.id === retireForm.voucher_id,
      ) || null,
    [paymentVouchers, retireForm.voucher_id],
  );
  const retirementAmountValue = Number(retireForm.retired_amount || 0);
  const retirementShortfall = selectedRetirementVoucher
    ? Math.max(
        0,
        Number(selectedRetirementVoucher.amount || 0) - retirementAmountValue,
      )
    : 0;
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
        ? detailView === "finance"
          ? `${window.location.origin}/finance/requests/${request.id}`
          : `${window.location.origin}/requests/${request.id}`
        : "";
    return [
      `Hi, please take a look at ${requestLabel}.`,
      link ? `Open: ${link}` : "",
      `Current status: ${formatViewerRequestStatus(request.status, availableActions, pendingApprovals[0]?.step)}`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [availableActions, detailView, pendingApprovals, request]);

  const summaryCards = useMemo(() => {
    if (!request) return [];
    if (workflowType === "leave") {
      return [
        {
          label: "Leave Dates",
          value: `${formatDisplayDate(String(requestData.start_date || ""))} - ${formatDisplayDate(String(requestData.end_date || ""))}`,
          tone: "neutral" as const,
        },
        {
          label: "Days Requested",
          value: String(requestData.days_requested || "-"),
          tone: "warning" as const,
        },
        {
          label: "Organization",
          value: organizationName,
          tone: "neutral" as const,
        },
      ];
    }
    return [
      {
        label: "Total Amount",
        value: formatCurrency(request.total_amount, request.currency),
        tone: "neutral" as const,
      },
      {
        label: "Due Date",
        value: formatDisplayDate(String(requestData.due_date || "")),
        tone: "neutral" as const,
      },
      {
        label: "Category",
        value: categoryName && categoryName !== "-" ? categoryName : "—",
        tone: "neutral" as const,
      },
    ];
  }, [availableActions, categoryName, workflowType, organizationName, pendingApprovals, request, requestData]);

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

    const done: ActivityItem[] = completedApprovals.map((entry: any) => ({
      title: `${entry.step} ${entry.action}`,
      description: entry.comment || "Workflow action completed.",
      time: formatDisplayDate(entry.at),
      tone: entry.action === "reject" ? "danger" : "success",
      icon: entry.action === "reject" ? "cancel" : "task_alt",
    }));

    const pending: ActivityItem[] = pendingApprovals.map((entry: any) => ({
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
        ["disburse", "retire", "retire_partial", "confirm", "complete"].includes(
          String(event.action || "").toLowerCase(),
        ),
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
          tone: to === "disbursed" || to === "completed" ? "success" : "warning",
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

    const voucherActivity: ActivityItem[] = (paymentVouchers ?? []).flatMap(
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
            (doneEntry: any) =>
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
    paymentVouchers,
    request?.created_at,
    request?.currency,
    request?.data,
  ]);

  function openVoucherEditor(voucher: FinancePaymentVoucherRecord) {
    setDisburseMode("edit");
    setEditingVoucherId(voucher.id);
    setDisburseFiles(
      voucher.evidence_files?.map((file) => ({
        id: file.id,
        file_name: file.file_name,
      })) ?? [],
    );
    setDisburseDeductions(
      voucher.deductions?.map((d) => ({
        deduction_type_id: d.deduction_type_id,
        rate: d.rate,
        gross_amount: d.gross_amount,
        deduction_amount: d.deduction_amount,
      })) ?? [],
    );
    setDisburseForm((current) => ({
      ...current,
      amount: String(voucher.amount ?? ""),
      method: voucher.method || current.method,
      transaction_ref: voucher.transaction_ref || current.transaction_ref,
      paid_from_account_id:
        voucher.paid_from_account?.id || current.paid_from_account_id,
      note: voucher.note || current.note,
      disbursed_at: voucher.disbursed_at
        ? String(voucher.disbursed_at).slice(0, 10)
        : current.disbursed_at,
      contact_id: voucher.contact_id || voucher.contact?.id || "",
    }));
    setShowDisbursementMediaPicker(false);
    setShowDisburseDialog(true);
  }

  function canEditVoucher(voucher: FinancePaymentVoucherRecord) {
    const hasRetirement =
      Number(voucher.retired_amount || 0) > 0 || Boolean(voucher.retired_at);
    return financeActionsVisible && !hasRetirement;
  }

  function openVoucherPreview(voucher: FinancePaymentVoucherRecord) {
    setPreviewVoucher(voucher);
    setShowVoucherPreviewDialog(true);
  }

  function openRetireDialog(voucher?: FinancePaymentVoucherRecord | null) {
    setRetireForm((current) => ({
      ...current,
      voucher_id:
        voucher?.id || retireableVoucher?.id || current.voucher_id,
      retired_amount:
        voucher || retireableVoucher
          ? String(
              voucher?.voucher_balance ||
                voucher?.amount ||
                retireableVoucher?.voucher_balance ||
                retireableVoucher?.amount ||
                "",
            )
          : current.retired_amount,
      refund_amount: "",
      refund_method: "bank_transfer",
      refund_reference: "",
      refund_date: new Date().toISOString().slice(0, 10),
    }));
    setShowCertificateHonorForm(false);
    setShowRetireDialog(true);
  }

  function closeDisburseDialog() {
    setShowDisburseDialog(false);
    setDisburseMode("create");
    setEditingVoucherId("");
    setDisburseDeductions([]);
  }

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
        await approveRequest(id, actionComment.trim() || undefined);
      } else if (action === "reject") {
        await rejectRequest(id, actionComment.trim() || undefined);
      } else if (action === "disburse") {
        const traceId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const disbursePayload = {
          amount: Number(disburseForm.amount || request?.total_amount || 0),
          method: disburseForm.method || undefined,
          transaction_ref: disburseForm.transaction_ref.trim() || undefined,
          paid_from_account_id:
            disburseForm.paid_from_account_id || undefined,
          note: disburseForm.note.trim() || undefined,
          disbursed_at: disburseForm.disbursed_at
            ? `${disburseForm.disbursed_at}T00:00:00.000Z`
            : undefined,
          evidence_file_id: disburseFiles[0]?.id,
          evidence_file_ids: disburseFiles.map((file) => file.id),
          contact_id: disburseForm.contact_id || undefined,
        };
        if (disburseMode === "edit" && editingVoucherId) {
          await financeApi.updatePaymentVoucher(
            id,
            editingVoucherId,
            disbursePayload,
          );
          try {
            await financeApi.applyPVDeductions(editingVoucherId, {
              deductions: disburseDeductions,
            });
          } catch {
            showToast({
              tone: "warning",
              title: "Deductions not saved",
              message:
                "Payment voucher updated but deductions could not be saved.",
            });
          }
        } else {
          const result = await disburseRequest(id, disbursePayload, { traceId });
          if (disburseDeductions.length > 0 && result?.voucher?.id) {
            try {
              await financeApi.applyPVDeductions(result.voucher.id, {
                deductions: disburseDeductions,
              });
            } catch {
              showToast({
                tone: "warning",
                title: "Deductions not saved",
                message:
                  "Disbursement recorded but deductions could not be saved — apply them from Finance > Payment Vouchers.",
              });
            }
          }
        }
      } else if (action === "confirm") {
        await confirmRequest(id);
      } else if (action === "retire") {
        const selectedVoucher =
          (paymentVouchers ?? []).find(
            (voucher) => voucher.id === retireForm.voucher_id,
          ) || null;
        const retiredAmount = retireForm.retired_amount.trim()
          ? Number(retireForm.retired_amount)
          : undefined;
        const shortfall = selectedVoucher
          ? Math.max(
              0,
              Number(selectedVoucher.amount || 0) -
                Number(retiredAmount || 0),
            )
          : 0;
        const refundAmount = retireForm.refund_amount.trim()
          ? Number(retireForm.refund_amount)
          : 0;
        const hasRefundDetails =
          refundAmount >= shortfall &&
          Boolean(retireForm.refund_method.trim()) &&
          Boolean(retireForm.refund_reference.trim());
        const hasRefundEvidence =
          retireForm.retirement_file_ids.length > 0;

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
          voucher_id: retireForm.voucher_id || undefined,
          retired_amount: retiredAmount,
          notes:
            retireForm.notes.trim() || actionComment.trim() || undefined,
          retirement_file_ids: retireForm.retirement_file_ids.length
            ? retireForm.retirement_file_ids
            : undefined,
          breakdown: shortfall > 0
            ? {
              refund: {
                required_amount: shortfall,
                refund_amount: refundAmount || undefined,
                refund_method: retireForm.refund_method || undefined,
                refund_reference:
                  retireForm.refund_reference.trim() || undefined,
                refund_date: retireForm.refund_date || undefined,
                evidence_file_ids: retireForm.retirement_file_ids,
              },
            }
            : undefined,
        });
      } else if (action === "complete") {
        await completeRequest(id);
      }
      setActionComment("");
      setShowDisburseDialog(false);
      setShowRetireDialog(false);
      setDisburseMode("create");
      setEditingVoucherId("");
      setDisburseForm({ ...initialDisburseForm });
      setDisburseFiles([]);
      setRetireForm({ ...initialRetireForm });
      setShowCertificateHonorForm(false);
      setRetirementCertificateForm({
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
        refetchPaymentVouchers(),
      ]);
      showToast({
        title: "Request updated",
        message:
          action === "submit"
            ? "The request has been submitted into workflow."
            : action === "approve"
              ? financeActionsVisible
                ? "The request has been cleared for disbursement or the next finance step."
                : "Your approval has been recorded."
              : action === "reject"
                ? "Your rejection has been recorded."
                : action === "disburse"
                  ? disburseMode === "edit"
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
      showToast({
        title: "Action failed",
        message:
          error instanceof Error
            ? error.message
            : "We couldn't complete that action just now.",
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
    id,
    detailView,
    request,
    loading,
    error,
    refetch,
    refetchRequestActions,
    refetchPaymentVouchers,
    requestData,
    workflowType,
    statusTone,
    categoryName,
    requestTags,
    projectName,
    teamName,
    organizationName,
    lineItems,
    documents,
    requestTotal,
    disbursedTotal,
    totalDeductions,
    retiredTotal,
    remainingDisbursement,
    defaultFinanceAccountId,
    financeAccounts,
    paymentVouchers: paymentVouchers ?? null,
    pendingApprovals,
    completedApprovals,
    workflowStatus,
    workflow,
    parentPath,
    parentLabel,
    detailActiveLabel,
    canSubmit,
    canEditDraft,
    roles,
    permissions,
    availableActions,
    requestStatus,
    approvalActionsVisible,
    financeActionsVisible,
    ownerActionsVisible,
    viewerStatus,
    financeProgress,
    disbursementButtonLabel,
    canShowNudge,
    nudgeHeadline,
    nudgeMessage,
    summaryCards,
    activityItems,
    retireableVoucher,
    selectedRetirementVoucher,
    retirementShortfall,
    actionBusy,
    setActionBusy,
    actionComment,
    setActionComment,
    showDisburseDialog,
    showRetireDialog,
    showVoucherPreviewDialog,
    previewVoucher,
    disburseMode,
    editingVoucherId,
    disburseForm,
    setDisburseForm,
    disburseFiles,
    setDisburseFiles,
    disburseDeductions,
    setDisburseDeductions,
    showDisbursementMediaPicker,
    showRetirementMediaPicker,
    retireForm,
    setRetireForm,
    showCertificateHonorForm,
    retirementCertificateForm,
    setRetirementCertificateForm,
    defaultCertificateReason,
    currentUserId,
    setShowDisburseDialog,
    setShowRetireDialog,
    setShowVoucherPreviewDialog,
    setPreviewVoucher,
    setShowDisbursementMediaPicker,
    setShowRetirementMediaPicker,
    setShowCertificateHonorForm,
    openVoucherEditor,
    canEditVoucher,
    openVoucherPreview,
    openRetireDialog,
    closeDisburseDialog,
    handleDownloadArtifact,
    handleDeleteDraft,
    handleWorkflowAction,
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
          includeRequestDetails: detailView !== "finance",
          requestDetailsPath: `/requests/${id}`,
          requestDetailsParent:
            detailView === "finance" ? "finance" : "requests",
        })}
        activeLabel={detailActiveLabel}
        user={{ name: "Alex Sterling", role: "Fleet Operations" }}
        mobileNav={detailMobileNav}
      >
        <div
          aria-hidden={showRetireDialog || showDisburseDialog || showVoucherPreviewDialog || undefined}
        >
          <div className="hidden lg:block">
            <PageHeader
              breadcrumbs={
                detailView === "finance"
                  ? [
                    { label: "Finance", path: "/finance" },
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
                  ? `${request?.request_type?.name || requestCategoryFromRecord(request)} • ${formatPersonName(request.creator)} • ${formatDisplayDate(request.created_at)}`
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
                  {canEditDraft ? (
                    <Link
                      to={`/requests/new/form?edit=${id}&typeId=${request?.request_type?.id || ""}`}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                    >
                      <Icon name="edit" className="text-[18px]" />
                      Edit Draft
                    </Link>
                  ) : null}
                </div>
              }
            />
          </div>

          <RequestDetailsLayout />
        </div>

        {showDisburseDialog ? <DisburseDialog /> : null}
        {showVoucherPreviewDialog && previewVoucher ? (
          <VoucherPreviewDialog />
        ) : null}
        {showRetireDialog ? <RetireDialog /> : null}
      </AppShell>
    </RequestDetailsContext.Provider>
  );
}

export default FinanceRequestDetailsPage;
