import { useState } from "react";
import { Link } from "react-router-dom";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { PageHeader } from "@/shared";
import { useCachedQuery } from "@/shared/lib/core";
import HrLeavePage from "./HrLeavePage";
import {
  getMyLeaveBalance,
  listRequests,
  type RequestRecord,
} from "@/pages/requests/requests-api";
import { formatDisplayDate } from "@stanforte/shared";
import {
  requestCategoryFromRecord,
  requestStatusTone,
} from "@/pages/requests/request-helpers";
import {
  Calendar,
  CalendarPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plane,
  HeartPulse,
  Coffee,
  HelpCircle,
  ChevronRight,
  Info,
  ArrowUpRight,
  FileText,
} from "lucide-react";

type LeaveRow = {
  id: string;
  requestId: string;
  type: string;
  submittedOn: string;
  fromDate: string;
  toDate: string;
  durationLabel: string;
  status: string;
  tone: "success" | "warning" | "pending" | "danger" | "neutral";
};

function isPendingStatus(status?: string | null) {
  const key = String(status || "").toLowerCase();
  return [
    "pending",
    "submitted",
    "approval",
    "under_review",
    "review",
    "draft",
    "prepared",
  ].includes(key);
}

function toLeaveRow(record: RequestRecord): LeaveRow {
  const data = record.data && typeof record.data === "object" ? record.data : {};
  const startDate = String(data.start_date || "");
  const endDate = String(data.end_date || "");
  const daysRequested = Number(data.days_requested);
  const requestId = String(record.id || "");

  return {
    id: String(record.request_number || `REQ-${requestId}`),
    requestId,
    type: String(record.request_type?.name || "Leave Request"),
    submittedOn: formatDisplayDate(record.created_at),
    fromDate: formatDisplayDate(startDate),
    toDate: formatDisplayDate(endDate),
    durationLabel:
      Number.isFinite(daysRequested) && daysRequested > 0
        ? `${daysRequested} day${daysRequested === 1 ? "" : "s"}`
        : "-",
    status: String(record.status || "draft").replaceAll("_", " "),
    tone: requestStatusTone(record.status),
  };
}

export default function LeavePage() {
  const { user } = useAuth();
  const { mode, isAdmin } = useWorkspace();
  const isAdminView = mode === "admin" && isAdmin;
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved">("all");

  if (isAdminView) {
    return <HrLeavePage />;
  }

  const {
    data: leaveBalanceData,
    loading: loadingLeaveBalance,
    error: leaveBalanceError,
  } = useCachedQuery(
    `requests:leave-balance:${currentYear}`,
    () => getMyLeaveBalance({ year: currentYear }),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  const {
    data: allRequests,
    loading: loadingRequests,
    error: requestsError,
  } = useCachedQuery(
    "requests:list:mine:leave-page",
    () => listRequests({ only_mine: "true" }),
    { ttlMs: 1000 * 60 * 2, storage: "memory" },
  );

  const leaveRequests = (allRequests ?? []).filter(
    (record) => requestCategoryFromRecord(record) === "leave",
  );
  const leaveRows = leaveRequests.map(toLeaveRow);

  const filteredRows = leaveRows.filter((row) => {
    if (activeTab === "pending") return isPendingStatus(row.status);
    if (activeTab === "approved") return row.tone === "success";
    return true;
  });

  const approvedCount = leaveRows.filter((row) => row.tone === "success").length;
  const pendingCount = leaveRequests.filter((row) => isPendingStatus(row.status)).length;

  const leaveSummary = leaveBalanceData?.summary ?? [];
  const availableDays = leaveSummary.reduce(
    (sum, item) => sum + Number(item.available_days || 0),
    0,
  );
  const entitledDays = leaveSummary.reduce(
    (sum, item) => sum + Number(item.entitled_days || 0),
    0,
  );
  const usedDays = Math.max(entitledDays - availableDays, 0);
  const percentUsed = entitledDays > 0 ? Math.round((usedDays / entitledDays) * 100) : 0;

  // Preset leave categories for visual breakdown
  const categoryCards = [
    {
      title: "Annual Leave",
      icon: Plane,
      color: "text-neutral-700 bg-neutral-100 border-neutral-200",
      total: 20,
      used: Math.min(usedDays, 14),
      remaining: Math.max(availableDays, 6),
      description: "Standard paid vacation allowance",
    },
    {
      title: "Sick Leave",
      icon: HeartPulse,
      color: "text-rose-600 bg-rose-50 border-rose-100",
      total: 10,
      used: 0,
      remaining: 10,
      description: "Certified health or medical leave",
    },
    {
      title: "Casual / Personal",
      icon: Coffee,
      color: "text-amber-600 bg-amber-50 border-amber-100",
      total: 5,
      used: 1,
      remaining: 4,
      description: "Short notice urgent personal matters",
    },
  ];

  return (
    <PortalLayout activeNav="HR & Workforce">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Leave & Absence Tracker"
          description="Manage personal leave balances, monitor annual entitlements, and track request approvals."
          icon={Calendar}
          iconColor="bg-emerald-50 text-emerald-600"
          actions={
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#e05d00] text-white text-xs font-medium shadow-sm transition active:scale-[0.98]"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Request Leave</span>
            </Link>
          }
        />

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Available Days */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-100 shadow-2xs hover:border-neutral-200/80 transition-colors flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                {100 - percentUsed}% left
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Available Days</div>
              <div className="text-lg sm:text-xl font-semibold text-neutral-900 mt-0.5">
                {loadingLeaveBalance ? "..." : (availableDays || 20)} <span className="text-[11px] sm:text-xs font-normal text-neutral-400">days</span>
              </div>
            </div>
          </div>

          {/* Card 2: Days Taken */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-100 shadow-2xs hover:border-neutral-200/80 transition-colors flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full shrink-0">
                {currentYear}
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Days Taken</div>
              <div className="text-lg sm:text-xl font-semibold text-neutral-900 mt-0.5">
                {loadingLeaveBalance ? "..." : usedDays} <span className="text-[11px] sm:text-xs font-normal text-neutral-400">days</span>
              </div>
            </div>
          </div>

          {/* Card 3: Pending Requests */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-100 shadow-2xs hover:border-neutral-200/80 transition-colors flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              {pendingCount > 0 ? (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white shrink-0" />
              ) : null}
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Pending Requests</div>
              <div className="text-lg sm:text-xl font-semibold text-amber-600 mt-0.5">
                {loadingRequests ? "..." : pendingCount}
              </div>
            </div>
          </div>

          {/* Card 4: Approved History */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-100 shadow-2xs hover:border-neutral-200/80 transition-colors flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full shrink-0">
                Verified
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Approved History</div>
              <div className="text-lg sm:text-xl font-semibold text-neutral-900 mt-0.5">
                {loadingRequests ? "..." : approvedCount}
              </div>
            </div>
          </div>
        </div>

        {/* Leave Allowance Breakdown by Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categoryCards.map((cat) => {
            const IconComp = cat.icon;
            const pct = Math.round((cat.used / cat.total) * 100);
            return (
              <div
                key={cat.title}
                className="p-5 rounded-2xl bg-white border border-neutral-100 shadow-2xs hover:border-neutral-200/80 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-400">
                    {cat.remaining} days left
                  </span>
                </div>
                <h3 className="font-medium text-neutral-900 text-sm mt-3">{cat.title}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">{cat.description}</p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1.5">
                    <span>Used: {cat.used} days</span>
                    <span>Total: {cat.total} days</span>
                  </div>
                  <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#C2410C] h-2 rounded-full transition-colors duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Policy Snapshot Card - Clean White Theme */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-100 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#C2410C] flex items-center justify-center shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-neutral-900">Leave Policy Guidelines</h4>
              <p className="text-xs text-neutral-500 mt-0.5">
                Annual leave requires at least 5 business days advance notice. Handover notes must be attached.
              </p>
            </div>
          </div>
          <Link
            to="/documents"
            className="px-4 py-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-700 transition flex items-center gap-1.5 whitespace-nowrap self-stretch md:self-auto justify-center"
          >
            <span>Read Full Policy</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-neutral-400" />
          </Link>
        </div>

        {/* Recent Leave Requests Table */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-medium text-neutral-900">Leave Applications & History</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Review your active and past leave submissions.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-neutral-100/80 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "all"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                All ({leaveRows.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "pending"
                    ? "bg-white text-amber-600 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("approved")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "approved"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Approved ({approvedCount})
              </button>
            </div>
          </div>

          {leaveBalanceError && (
            <div className="p-4 mx-5 my-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Could not load leave balance: {leaveBalanceError}</span>
            </div>
          )}

          {/* Mobile Card List (< 768px) */}
          <div className="block md:hidden divide-y divide-neutral-100">
            {loadingRequests ? (
              <div className="py-8 text-center text-xs text-neutral-400">Loading leave applications...</div>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <div key={row.requestId} className="p-4 active:bg-neutral-50 transition flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-neutral-900 text-sm">{row.type}</div>
                      <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{row.id}</span>
                        <span>•</span>
                        <span>{row.submittedOn}</span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold text-[10px] shrink-0 ${
                        row.tone === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : row.tone === "danger"
                          ? "bg-rose-50 text-rose-700 border border-rose-100"
                          : row.tone === "warning" || row.tone === "pending"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-neutral-50 text-neutral-700 border border-neutral-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          row.tone === "success"
                            ? "bg-emerald-500"
                            : row.tone === "danger"
                            ? "bg-rose-500"
                            : row.tone === "warning" || row.tone === "pending"
                            ? "bg-amber-500"
                            : "bg-neutral-400"
                        }`}
                      />
                      {row.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-600 bg-neutral-50 px-3 py-2 rounded-xl">
                    <span className="font-medium">{row.fromDate} – {row.toDate}</span>
                    <span className="font-semibold text-neutral-800">{row.durationLabel}</span>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <Link
                      to={`/requests/${row.requestId}`}
                      className="min-h-[40px] px-3 inline-flex items-center gap-1 text-xs font-medium text-[#C2410C] hover:text-[#e05d00] transition"
                    >
                      <span>View Request Details</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400">No leave requests found.</div>
            )}
          </div>

          {/* Desktop Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/75 text-neutral-500 font-medium border-b border-neutral-100">
                <tr>
                  <th className="py-3.5 px-5">Request ID</th>
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Date Range</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400">
                      Loading leave applications...
                    </td>
                  </tr>
                ) : filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr key={row.requestId} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3.5 px-5 font-medium text-neutral-900">
                        <Link
                          to={`/requests/${row.requestId}`}
                          className="hover:text-[#C2410C] transition flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5 text-neutral-400" />
                          <span>{row.id}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-neutral-800">{row.type}</span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 font-medium">
                        {row.fromDate} – {row.toDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 font-semibold text-neutral-700">
                          {row.durationLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500">{row.submittedOn}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-xs ${
                            row.tone === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : row.tone === "danger"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : row.tone === "warning" || row.tone === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-neutral-50 text-neutral-700 border border-neutral-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.tone === "success"
                                ? "bg-emerald-500"
                                : row.tone === "danger"
                                ? "bg-rose-500"
                                : row.tone === "warning" || row.tone === "pending"
                                ? "bg-amber-500"
                                : "bg-neutral-400"
                            }`}
                          />
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to={`/requests/${row.requestId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#C2410C] hover:text-[#e05d00] transition"
                        >
                          <span>Details</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-50 text-neutral-400 flex items-center justify-center mx-auto mb-2">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-neutral-700 text-sm">No leave requests found</p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        You have not submitted any leave applications in this category yet.
                      </p>
                      <Link
                        to="/requests/new"
                        className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-xs font-medium text-neutral-700 transition"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        <span>Submit New Request</span>
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
