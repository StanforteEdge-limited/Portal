import { useNavigate } from "react-router-dom";
import { Chip, Icon } from "@/shared";
import { formatDisplayDate } from "@stanforte/shared";
import { formatPersonName, requestCategoryFromRecord } from "@/pages/requests/request-helpers";
import { useRequestDetails } from "../context";
import { RequestSummarySection } from "./sections/RequestSummarySection";
import { WorkContextSection } from "./sections/WorkContextSection";
import { LeaveCoverageSection } from "./sections/LeaveCoverageSection";
import { RequestItemsTable } from "./sections/RequestItemsTable";
import { PaymentVouchersTable } from "./sections/PaymentVouchersTable";
import { SupportingDocumentsSection } from "./sections/SupportingDocumentsSection";
import { RequestTotalCard } from "./right-rail/RequestTotalCard";
import { StatusForYouCard } from "./right-rail/StatusForYouCard";
import { DownloadsSection } from "./right-rail/DownloadsSection";
import { NudgeSection } from "./right-rail/NudgeSection";
import { ApprovalWorkflowSection } from "./right-rail/ApprovalWorkflowSection";
import { ActivitySectionCard } from "./right-rail/ActivitySectionCard";

export function RequestDetailsLayout() {
  const navigate = useNavigate();
  const { workflowType, loading, error, request, parentLabel, parentPath, viewerStatus } = useRequestDetails();

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
        Loading request details...
      </div>
    );
  }
  if (error) {
    return (
      <div className="mt-6 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
        {error}
      </div>
    );
  }
  if (!request) return null;

  return (
    <>
      {/* Mobile header — hidden on desktop where PageHeader handles this */}
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
              {request.request_number || "Request details"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {`${request.request_type?.name || requestCategoryFromRecord(request)} • ${formatPersonName(request.creator)} • ${formatDisplayDate(request.created_at)}`}
            </p>
          </div>
          <Chip variant={viewerStatus.tone}>{viewerStatus.label}</Chip>
        </div>
      </div>

      {/* Responsive grid — right rail first in DOM so action cards appear at top on mobile */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:mt-6 lg:grid-cols-12">
        <div className="space-y-4 lg:order-2 lg:col-span-4 lg:self-start lg:sticky lg:top-28">
          <RequestTotalCard />
          <StatusForYouCard />
          <DownloadsSection />
          <NudgeSection />
          <ApprovalWorkflowSection />
          <ActivitySectionCard />
        </div>
        <div className="space-y-6 lg:order-1 lg:col-span-8">
          <RequestSummarySection />
          {workflowType !== "hr" ? <WorkContextSection /> : null}
          {workflowType === "hr" ? <LeaveCoverageSection /> : <RequestItemsTable />}
          {workflowType !== "hr" ? <PaymentVouchersTable /> : null}
          <SupportingDocumentsSection />
        </div>
      </div>
    </>
  );
}
