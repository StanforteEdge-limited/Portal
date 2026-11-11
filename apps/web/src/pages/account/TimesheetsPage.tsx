import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useToast, PageHeader } from "@/shared";
import { useCachedQuery, timesheetApi } from "@/shared/lib/core";
import { formatDisplayDate, type TimesheetEntry } from "@stanforte/shared";
import TimesheetEditorSlideOver from "./TimesheetEditorSlideOver";
import {
  CalendarCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ChevronRight,
  Send,
  Edit2,
  FileText,
  Filter,
  RefreshCw,
} from "lucide-react";

export default function TimesheetsPage() {
  const { showToast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "submitted" | "approved">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: timesheetRows,
    loading,
    error,
    refetch,
  } = useCachedQuery(
    "timesheets:my-entries",
    () => timesheetApi.listMyEntries({ page: 1, per_page: 500 }),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  const timesheets: TimesheetEntry[] = useMemo(() => timesheetRows ?? [], [timesheetRows]);

  const summary = useMemo(() => {
    const totalHours = timesheets.reduce(
      (sum: number, r: TimesheetEntry) => sum + Number(r.hours || 0),
      0
    );
    const approvedHours = timesheets
      .filter((r: TimesheetEntry) => r.status === "approved")
      .reduce((sum: number, r: TimesheetEntry) => sum + Number(r.hours || 0), 0);

    const projectSet = new Set(timesheets.map((r: any) => r.project?.name).filter(Boolean));

    return {
      entries: timesheets.length,
      totalHours,
      approvedHours,
      submitted: timesheets.filter((r: TimesheetEntry) => r.status === "submitted").length,
      approved: timesheets.filter((r: TimesheetEntry) => r.status === "approved").length,
      draft: timesheets.filter((r: TimesheetEntry) => !r.status || r.status === "draft").length,
      projectCount: projectSet.size || 1,
    };
  }, [timesheets]);

  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((item: any) => {
      const statusKey = String(item.status || "draft").toLowerCase();
      if (activeTab === "draft" && statusKey !== "draft") return false;
      if (activeTab === "submitted" && statusKey !== "submitted") return false;
      if (activeTab === "approved" && statusKey !== "approved") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const projectName = String(item.project?.name || "").toLowerCase();
        const desc = String(item.description || "").toLowerCase();
        const fund = String(item.fund?.name || "").toLowerCase();
        return projectName.includes(q) || desc.includes(q) || fund.includes(q);
      }
      return true;
    });
  }, [timesheets, activeTab, searchQuery]);

  async function submitTimesheet(id: string) {
    try {
      await timesheetApi.submitMyEntry(id);
      showToast({ tone: "success", title: "Submitted", message: "Timesheet submitted for review." });
      void refetch();
    } catch (err: any) {
      showToast({
        tone: "danger",
        title: "Cannot submit",
        message: err?.message || "Failed to submit timesheet.",
      });
    }
  }

  return (
    <PortalLayout activeNav="Timesheets">
      <div className="space-y-6 w-full min-w-0">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Project Timesheets"
          description="Log billable hours against grant allocations, projects, and donor funds to feed monthly payroll."
          icon={CalendarCheck}
          iconColor="bg-cyan-50 text-cyan-600"
          actions={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-400" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setEditorOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Log Time Entry</span>
              </button>
            </div>
          }
        />

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Logged Hours */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Logged
                </div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {summary.totalHours.toFixed(1)} <span className="text-xs font-medium text-slate-400">hrs</span>
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {summary.entries} entries
            </span>
          </div>

          {/* Card 2: Approved Hours */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Approved Hours
                </div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {summary.approvedHours.toFixed(1)} <span className="text-xs font-medium text-slate-400">hrs</span>
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {summary.approved} signed-off
            </span>
          </div>

          {/* Card 3: Pending Submissions */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Pending Review
                </div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{summary.submitted}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              {summary.draft} drafts
            </span>
          </div>

          {/* Card 4: Active Projects */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Assigned Projects
                </div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{summary.projectCount}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Allocated
            </span>
          </div>
        </div>

        {/* Timesheets Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-200/70 p-1">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({timesheets.length})
              </button>
              <button
                onClick={() => setActiveTab("draft")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "draft"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Drafts ({summary.draft})
              </button>
              <button
                onClick={() => setActiveTab("submitted")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "submitted"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Submitted ({summary.submitted})
              </button>
              <button
                onClick={() => setActiveTab("approved")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === "approved"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Approved ({summary.approved})
              </button>
            </div>

            {/* Keyword Search */}
            <div className="relative w-full sm:w-64">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search project, fund, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-[#ff6900] focus:outline-none focus:ring-1 focus:ring-[#ff6900]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="mx-auto w-5 h-5 animate-spin text-slate-400 mb-2" />
              <span>Loading timesheet records...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-rose-50/50">
              <AlertCircle className="mx-auto w-6 h-6 text-rose-500 mb-2" />
              <p className="text-xs font-semibold text-rose-900">Unable to load timesheets</p>
              <p className="mt-1 text-xs text-rose-600">{String(error)}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredTimesheets.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery ? "No matching entries found" : "No timesheet entries yet"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? "Try adjusting your search keywords or clear the filter."
                  : 'Click "Log Time Entry" above to log your daily project hours and submit for manager sign-off.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Work Date</th>
                    <th className="py-3 px-5">Project &amp; Description</th>
                    <th className="py-3 px-5">Funding / Grant</th>
                    <th className="py-3 px-5">Hours</th>
                    <th className="py-3 px-5">Approval Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTimesheets.map((row: any) => {
                    const statusKey = String(row.status || "draft").toLowerCase();
                    const isDraftOrRejected = ["draft", "rejected"].includes(statusKey);

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        Draft
                      </span>
                    );
                    if (statusKey === "submitted") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                          <Clock className="h-3 w-3" />
                          <span>Submitted</span>
                        </span>
                      );
                    } else if (statusKey === "approved") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Approved</span>
                        </span>
                      );
                    } else if (statusKey === "rejected") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                          <AlertCircle className="h-3 w-3" />
                          <span>Rejected</span>
                        </span>
                      );
                    }

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-slate-900 whitespace-nowrap">
                          {row.work_date ? formatDisplayDate(row.work_date) : "—"}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-slate-900">{row.project?.name || "General Work"}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 max-w-sm mt-0.5">
                            {row.description || "No description provided"}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-600">
                          <div className="font-medium text-slate-800">{row.fund?.name || "Unrestricted Fund"}</div>
                          <div className="text-[10px] text-slate-400">{row.grant?.name || "General Operating"}</div>
                        </td>
                        <td className="py-3.5 px-5 font-black text-slate-900">
                          {Number(row.hours || 0).toFixed(1)}{" "}
                          <span className="text-[10px] font-medium text-slate-400">hrs</span>
                        </td>
                        <td className="py-3.5 px-5">{statusBadge}</td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          {isDraftOrRejected ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(row.id);
                                  setEditorOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                                title="Edit timesheet"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void submitTimesheet(row.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#ff6900] hover:bg-[#e05d00] text-white font-bold text-[11px] transition shadow-2xs"
                                title="Submit for review"
                              >
                                <Send className="h-3 w-3" />
                                <span>Submit</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Locked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Guidelines Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="p-2 rounded-xl bg-orange-50 text-[#ff6900] shrink-0 mt-0.5">
            <FileText className="h-4 w-4" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-slate-900">Timesheet Submission &amp; Payroll Guidelines</p>
            <ul className="text-slate-500 mt-1 list-disc pl-4 space-y-1">
              <li>Approved entries directly feed payroll allocations and project costing.</li>
              <li>Draft entries can be edited freely. Once submitted, records are locked for managerial review.</li>
              <li>Rejected entries can be adjusted and re-submitted at any time prior to the 25th of the calendar month.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Timesheet Editor Slide-Over */}
      {editorOpen && (
        <TimesheetEditorSlideOver
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          timesheetId={editingId}
          onSaved={() => {
            setEditorOpen(false);
            void refetch();
          }}
        />
      )}
    </PortalLayout>
  );
}
