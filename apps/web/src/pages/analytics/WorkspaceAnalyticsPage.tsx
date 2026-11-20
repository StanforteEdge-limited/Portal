import { useMemo, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { ArrowRight, Download, ChevronRight } from "lucide-react";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { httpRequest, useCachedQuery } from "@/shared/lib/core";

type TimeRange = "week" | "month" | "quarter";

type RequestItem = {
  id?: string | number;
  status?: string;
  request_type?: { name?: string } | string | null;
  type_name?: string;
  created_at?: string;
  reference_number?: string;
  title?: string;
};

type EmployeeItem = {
  id?: string | number;
  status?: string;
  employment_status?: string;
  department?: { name?: string } | string | null;
};

function extractItems<T>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function extractTotal(payload: any, fallback: number): number {
  const total = payload?.data?.meta?.total ?? payload?.meta?.total ?? payload?.total;
  return typeof total === "number" ? total : fallback;
}

export default function WorkspaceAnalyticsPage() {
  const { isAdmin } = useWorkspace();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");

  const { data: requestsRes, loading: loadingRequests } = useCachedQuery(
    `analytics:requests:${timeRange}`,
    () => httpRequest<any>("/requests?per_page=100").catch(() => null),
    { ttlMs: 60_000, storage: "memory" }
  );

  const { data: employeesRes, loading: loadingEmployees } = useCachedQuery(
    "analytics:employees",
    () => httpRequest<any>("/employees?per_page=100").catch(() => null),
    { ttlMs: 60_000, storage: "memory" }
  );

  const { data: approvalsRes } = useCachedQuery(
    "analytics:approvals",
    () => httpRequest<any>("/requests/approvals?per_page=50").catch(() => null),
    { ttlMs: 60_000, storage: "memory" }
  );

  const requests = useMemo(() => extractItems<RequestItem>(requestsRes), [requestsRes]);
  const employees = useMemo(() => extractItems<EmployeeItem>(employeesRes), [employeesRes]);
  const approvals = useMemo(() => extractItems<RequestItem>(approvalsRes), [approvalsRes]);

  const totalRequests = extractTotal(requestsRes, requests.length);
  const totalEmployees = extractTotal(employeesRes, employees.length);
  const pendingApprovals = extractTotal(approvalsRes, approvals.length);

  const statusBuckets = useMemo(() => {
    const counts = {
      pending: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
      draft: 0,
    };
    for (const req of requests) {
      const s = String(req.status || "pending").toLowerCase();
      if (s.includes("approve") || s.includes("complete") || s.includes("disburs")) counts.approved += 1;
      else if (s.includes("reject") || s.includes("declin") || s.includes("cancel")) counts.rejected += 1;
      else if (s.includes("draft")) counts.draft += 1;
      else if (s.includes("review") || s.includes("progress")) counts.in_review += 1;
      else counts.pending += 1;
    }
    return [
      { key: "pending", label: "Pending", value: counts.pending, accent: true },
      { key: "in_review", label: "In review", value: counts.in_review, accent: false },
      { key: "approved", label: "Approved", value: counts.approved, accent: false },
      { key: "rejected", label: "Rejected", value: counts.rejected, accent: false },
      { key: "draft", label: "Draft", value: counts.draft, accent: false },
    ];
  }, [requests]);

  const approvalRate = useMemo(() => {
    const decided = statusBuckets
      .filter((b) => b.key === "approved" || b.key === "rejected")
      .reduce((sum, b) => sum + b.value, 0);
    if (decided === 0) return "—";
    const approved = statusBuckets.find((b) => b.key === "approved")?.value ?? 0;
    return `${Math.round((approved / decided) * 100)}%`;
  }, [statusBuckets]);

  const departmentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const emp of employees) {
      const deptName =
        typeof emp.department === "string"
          ? emp.department
          : emp.department?.name || "Unassigned";
      map.set(deptName, (map.get(deptName) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [employees]);

  const maxBucket = Math.max(1, ...statusBuckets.map((b) => b.value));
  const maxDept = Math.max(1, ...departmentCounts.map((d) => d.count));
  const loading = loadingRequests || loadingEmployees;

  return (
    <PortalLayout activeNav="Analytics">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-neutral-900/[0.08]">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-[28px] leading-tight font-medium text-neutral-900 tracking-tight font-headline">
              Organization analytics
            </h1>
            <p className="text-sm text-neutral-500 max-w-2xl">
              Live operational volume across requests, approval queues, and active workforce units.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-900/[0.06]">
              {(
                [
                  { id: "week", label: "7 days" },
                  { id: "month", label: "30 days" },
                  { id: "quarter", label: "Quarter" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTimeRange(option.id)}
                  className={`px-3 h-7 rounded-md text-xs font-medium transition-colors duration-150 ${
                    timeRange === option.id
                      ? "bg-white text-neutral-900 shadow-2xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-neutral-50 text-neutral-900 text-sm font-medium transition-colors duration-150"
            >
              <Download className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
              <span>Export summary</span>
            </button>
          </div>
        </header>

        {/* Compact KPI Row — Numbers Only */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <article className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-5 space-y-2">
            <p className="text-xs text-neutral-500">Active workforce</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {loading ? "—" : totalEmployees.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">Registered employee records</p>
          </article>

          <article className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-5 space-y-2">
            <p className="text-xs text-neutral-500">Total requests</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {loading ? "—" : totalRequests.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">Tracked across all workflows</p>
          </article>

          <article className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-5 space-y-2">
            <p className="text-xs text-neutral-500">Pending approvals</p>
            <p className="text-[28px] leading-none font-medium text-[#c2410c] font-headline tabular-nums">
              {loading ? "—" : pendingApprovals.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">Awaiting review action</p>
          </article>

          <article className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-5 space-y-2">
            <p className="text-xs text-neutral-500">Approval rate</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {loading ? "—" : approvalRate}
            </p>
            <p className="text-xs text-neutral-500">Share of decided requests</p>
          </article>
        </section>

        {/* Primary Chart (2/3) + Ranked Department List (1/3) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-medium text-neutral-900 font-headline">
                  Request pipeline by status
                </h2>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Distribution of the latest {requests.length} workspace requests
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500 tabular-nums">
                {requests.length} sampled
              </span>
            </div>

            {requests.length === 0 && !loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-neutral-900/[0.10] rounded-xl p-6">
                <p className="text-sm font-medium text-neutral-900">No request volume recorded yet</p>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                  Submit or approve requisitions to populate the workflow distribution chart.
                </p>
              </div>
            ) : (
              <div className="relative h-64 flex flex-col justify-end">
                {/* Muted horizontal reference grid */}
                <div className="absolute inset-0 bottom-8 flex flex-col justify-between pointer-events-none">
                  {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                    <div key={ratio} className="flex items-center gap-3">
                      <span className="w-8 text-right text-xs font-mono text-neutral-400 tabular-nums">
                        {Math.round(maxBucket * ratio)}
                      </span>
                      <div className="flex-1 border-b border-neutral-900/[0.06]" />
                    </div>
                  ))}
                </div>

                {/* Bars */}
                <div className="relative z-10 grid grid-cols-5 gap-4 items-end h-56 pl-11 pr-2">
                  {statusBuckets.map((bucket) => {
                    const heightPct = Math.max(4, Math.round((bucket.value / maxBucket) * 100));
                    return (
                      <div key={bucket.key} className="flex flex-col items-center justify-end h-full gap-2">
                        <span className="text-xs font-mono text-neutral-600 tabular-nums">
                          {bucket.value}
                        </span>
                        <div className="w-full max-w-[48px] flex-1 flex items-end">
                          <div
                            className={`w-full rounded-t-md transition-[height] duration-300 ${
                              bucket.accent ? "bg-[#ff6900]" : "bg-neutral-300"
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-600 truncate max-w-full">
                          {bucket.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-neutral-900/[0.06] flex items-center justify-between flex-wrap gap-3 text-xs text-neutral-500">
              <span>Accent marks pending items requiring action</span>
              {isAdmin ? (
                <Link
                  to="/finance/reports"
                  className="inline-flex items-center gap-1.5 font-medium text-[#c2410c] hover:underline"
                >
                  <span>Open financial reports</span>
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
              ) : null}
            </div>
          </div>

          {/* Ranked Department Breakdown */}
          <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-neutral-900 font-headline">
                  Headcount by unit
                </h2>
                <span className="text-xs font-mono text-neutral-500 tabular-nums">
                  {departmentCounts.length} units
                </span>
              </div>

              {departmentCounts.length === 0 ? (
                <p className="text-sm text-neutral-500 py-8">
                  No department assignments found for the current directory.
                </p>
              ) : (
                <div className="space-y-4">
                  {departmentCounts.map((dept, index) => (
                    <div key={dept.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-800 truncate pr-3">{dept.name}</span>
                        <span className="font-mono text-xs text-neutral-600 tabular-nums shrink-0">
                          {dept.count}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            index === 0 ? "bg-[#ff6900]" : "bg-neutral-400"
                          }`}
                          style={{ width: `${Math.round((dept.count / maxDept) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-900/[0.06] space-y-2">
              <Link
                to="/hr/attendance"
                className="flex items-center justify-between text-sm text-neutral-700 hover:text-neutral-900 py-1 transition-colors duration-150"
              >
                <span>Workforce attendance logs</span>
                <ChevronRight className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
              </Link>
              <Link
                to="/requests/approvals"
                className="flex items-center justify-between text-sm text-neutral-700 hover:text-neutral-900 py-1 transition-colors duration-150"
              >
                <span>Approval queue</span>
                <ChevronRight className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}
