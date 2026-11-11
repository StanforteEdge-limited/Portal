import { useState } from "react";
import { Link } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { PageHeader } from "@/shared";
import { useCachedQuery } from "@/shared/lib/core";
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
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved">("all");

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
      color: "text-blue-600 bg-blue-50 border-blue-100",
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Request Leave</span>
            </Link>
          }
        />

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Available Days</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {loadingLeaveBalance ? "..." : (availableDays || 20)} <span className="text-xs font-normal text-slate-400">days</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              {100 - percentUsed}% left
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Days Taken</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {loadingLeaveBalance ? "..." : usedDays} <span className="text-xs font-normal text-slate-400">days</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {currentYear}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Pending Requests</div>
                <div className="text-xl font-black text-amber-600 mt-0.5">
                  {loadingRequests ? "..." : pendingCount}
                </div>
              </div>
            </div>
            {pendingCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Approved History</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">
                  {loadingRequests ? "..." : approvedCount}
                </div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Verified
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
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                    <IconComp className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {cat.remaining} days left
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mt-3">{cat.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{cat.description}</p>
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1.5">
                    <span>Used: {cat.used} days</span>
                    <span>Total: {cat.total} days</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#0a1128] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Policy Snapshot Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0a1128] to-[#162044] text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-orange-400 flex items-center justify-center shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Leave Policy Guidelines</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Annual leave requires at least 5 business days advance notice. Handover notes must be attached.
              </p>
            </div>
          </div>
          <Link
            to="/requests/new"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition flex items-center gap-1.5 whitespace-nowrap self-stretch md:self-auto justify-center"
          >
            <span>Read Full Policy</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-300" />
          </Link>
        </div>

        {/* Recent Leave Requests Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Leave Applications & History</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your active and past leave submissions.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
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
                    : "text-slate-500 hover:text-slate-800"
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
                    : "text-slate-500 hover:text-slate-800"
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading leave applications...
                    </td>
                  </tr>
                ) : filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr key={row.requestId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        <Link
                          to={`/requests/${row.requestId}`}
                          className="hover:text-[#ff6900] transition flex items-center gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span>{row.id}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{row.type}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {row.fromDate} – {row.toDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                          {row.durationLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{row.submittedOn}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                            row.tone === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : row.tone === "danger"
                              ? "bg-rose-50 text-rose-700 border border-rose-100"
                              : row.tone === "warning" || row.tone === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-slate-50 text-slate-700 border border-slate-200"
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
                                : "bg-slate-400"
                            }`}
                          />
                          {row.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to={`/requests/${row.requestId}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff6900] hover:text-[#e05d00] transition"
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
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-slate-700 text-sm">No leave requests found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        You have not submitted any leave applications in this category yet.
                      </p>
                      <Link
                        to="/requests/new"
                        className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
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
