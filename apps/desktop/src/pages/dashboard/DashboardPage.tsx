import {
  Button,
  Chip,
  PageHeader,
  SectionCard,
} from "@/shared";
import { hasAnyPermission, humanize, userFirstName } from "@stanforte/shared";
import { Link } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { getMyAttendance } from "@/pages/hr/attendance/attendance-api";
import {
  buildAppMobileNav,
  buildRequestsNavigation,
} from "@/pages/requests/requests-data";
import { listApprovals, listRequests } from "@/pages/requests/requests-api";
import {
  formatDisplayDate,
  formatRequestStatus,
  requestCategoryFromRecord,
  requestStatusTone,
} from "@/pages/requests/request-helpers";
import {
  getWorkspaceProfile,
  listWorkspaceNotifications,
} from "@/shared/api/workspace-api";
import { useCachedQuery } from "@/shared/lib/core";

function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatTodayLong(now = new Date()) {
  return now.toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function requestIcon(typeName?: string | null, category?: string) {
  const name = String(typeName || "").toLowerCase();
  if (category === "hr" || name.includes("leave")) return "beach_access";
  if (
    name.includes("petty") ||
    name.includes("cash") ||
    name.includes("expense")
  )
    return "payments";
  if (name.includes("equipment") || name.includes("asset")) return "hardware";
  if (name.includes("travel")) return "flight_takeoff";
  return category === "financial" ? "receipt_long" : "description";
}

function requestSubtitle(row: {
  request_number?: string;
  created_at?: string;
  data?: Record<string, unknown> | null;
  items?: Array<{ description?: string }>;
}) {
  const purpose = typeof row.data?.purpose === "string" ? row.data.purpose : "";
  const firstItem = row.items?.[0]?.description || "";
  const detail = purpose || firstItem || row.request_number || "Request";
  return `${detail} • ${formatDisplayDate(row.created_at)}`;
}

function summaryCardTone(count: number) {
  return count > 0 ? "text-brand-900" : "text-slate-500";
}

function attentionHint(status: string, isApproval = false): {
  label: string;
  tone: "warning" | "danger" | "pending" | "neutral";
} {
  if (isApproval) return { label: "Approval needed", tone: "pending" };
  const s = String(status || "").toLowerCase();
  if (s === "draft") return { label: "Not submitted", tone: "warning" };
  if (s === "returned") return { label: "Revision needed", tone: "danger" };
  if (s === "disbursed") return { label: "Retirement required", tone: "warning" };
  return { label: "Needs attention", tone: "neutral" };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: profile } = useCachedQuery(
    "dashboard:profile",
    () => getWorkspaceProfile(),
    {
      ttlMs: 1000 * 60,
      storage: "memory",
    },
  );
  const { data: requests, loading: loadingRequests } = useCachedQuery(
    "dashboard:requests",
    () => listRequests({ only_mine: "true" }),
    {
      ttlMs: 1000 * 30,
      storage: "memory",
    },
  );
  const { data: approvals } = useCachedQuery(
    "dashboard:approvals",
    () => listApprovals(),
    {
      ttlMs: 1000 * 30,
      storage: "memory",
    },
  );
  const { data: attendance } = useCachedQuery(
    "dashboard:attendance",
    () => {
      const today = new Date().toISOString().slice(0, 10);
      return getMyAttendance({ from: today, to: today });
    },
    {
      ttlMs: 1000 * 30,
      storage: "memory",
    },
  );
  const { data: notifications } = useCachedQuery(
    "dashboard:notifications",
    () => listWorkspaceNotifications("unread"),
    {
      ttlMs: 1000 * 30,
      storage: "memory",
    },
  );

  const myRequests = requests ?? [];
  const myApprovals = approvals ?? [];
  const pendingStatuses = [
    "draft",
    "sent",
    "approval",
    "submitted",
    "under_review",
    "review",
    "prepared",
  ];
  const doneStatuses = ["approved", "completed", "disbursed", "confirmed"];
  const activeRequests = myRequests.filter(
    (item) => !doneStatuses.includes(String(item.status || "").toLowerCase()),
  ).length;
  const pendingApprovals = myApprovals.filter((item) =>
    pendingStatuses.includes(String(item.status || "").toLowerCase()),
  ).length;
  const organization =
    profile?.organizations?.find((item) => item.is_primary) ||
    profile?.organizations?.[0];
  const groups = profile?.teams ?? [];
  const primaryGroup = groups[0];
  const today = attendance?.today;

  // Requests needing staff action
  const ATTENTION_STATUSES = ["draft", "returned", "disbursed"];
  const attentionRequests = myRequests.filter((r) =>
    ATTENTION_STATUSES.includes(String(r.status || "").toLowerCase()),
  ).slice(0, 5);
  const pendingApprovalItems = myApprovals
    .filter((item) =>
      pendingStatuses.includes(String(item.status || "").toLowerCase()),
    )
    .slice(0, 3);
  const canApprove = hasAnyPermission(user, ["requests.approve"]);
  const attentionVisible = attentionRequests.length + (canApprove ? pendingApprovalItems.length : 0);

  const unreadNotifications = notifications ?? [];
  const latestNotice = unreadNotifications[0];
  const isClockedIn = attendance?.current_state?.is_clocked_in;
  let nextShiftLabel = "";
  let nextShiftDetail = "";
  let nextShiftMode = "";

  if (isClockedIn && today?.first_in_at) {
    nextShiftLabel = "Clocked In";
    nextShiftDetail = formatTime(today.first_in_at);
    nextShiftMode = humanize(String(today.attendance_mode || today.expected_mode || "onsite"));
  } else if (attendance?.policy?.start_time) {
    const policy = attendance.policy;
    const now = new Date();
    const workWeekdays = [...new Set([
      ...(policy.onsite_weekdays ?? []),
      ...(policy.remote_weekdays ?? []),
    ])];
    const effectiveWorkdays = workWeekdays.length > 0 ? workWeekdays : [1, 2, 3, 4, 5];
    const [endHour, endMin] = policy.end_time.split(":").map(Number);
    const shiftEndToday = new Date();
    shiftEndToday.setHours(endHour, endMin, 0, 0);
    const todayIsWorkday = effectiveWorkdays.includes(now.getDay());
    const shiftOverToday = now >= shiftEndToday;
    nextShiftLabel = "Next Shift";
    if (todayIsWorkday && !shiftOverToday) {
      nextShiftDetail = `Today, ${policy.start_time}`;
      nextShiftMode = humanize(String(today?.expected_mode || "onsite"));
    } else {
      nextShiftDetail = "No upcoming shift";
      for (let i = 1; i <= 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        if (effectiveWorkdays.includes(d.getDay())) {
          const dateLabel = i === 1
            ? "Tomorrow"
            : d.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" });
          nextShiftDetail = `${dateLabel}, ${policy.start_time}`;
          const nextDay = d.getDay();
          const isRemote = (policy.remote_weekdays ?? []).includes(nextDay);
          nextShiftMode = humanize(isRemote ? "remote" : (today?.expected_mode || "onsite"));
          break;
        }
      }
      if (!nextShiftDetail || nextShiftDetail === "No upcoming shift") {
        nextShiftMode = "";
      }
    }
  } else {
    nextShiftLabel = "No Shift";
    nextShiftDetail = "No shift scheduled";
    nextShiftMode = "";
  }
  const financeViewer = hasAnyPermission(user, ["finance.view", "finance.manage"]);

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="Dashboard"
      user={{
        name: userFirstName(user),
        role: profile?.employee_profile?.job_title || "Staff",
      }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <div className="hidden lg:block">
        <PageHeader
          breadcrumbs={[{ label: "Dashboard" }]}
          title={`${greeting()}, ${userFirstName(user)}.`}
          description={`${formatTodayLong()} • ${organization?.name || "No primary organization"}${primaryGroup ? ` • ${primaryGroup.name}` : ""}`}
          actions={
            <Link to="/requests/new" className="inline-flex">
              <Button className="gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                New Request
              </Button>
            </Link>
          }
        />

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="grid gap-4 md:grid-cols-3">
              <article className="section-card flex items-center justify-between p-6">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Active Requests
                  </p>
                  <p
                    className={[
                      "mt-3 text-[2.4rem] font-semibold leading-none tracking-tight",
                      summaryCardTone(activeRequests),
                    ].join(" ")}
                  >
                    {activeRequests}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-900">
                  <span className="material-symbols-outlined">
                    pending_actions
                  </span>
                </div>
              </article>

              {canApprove ? (
              <article className="section-card flex items-center justify-between p-6">
                <div>
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Pending Approvals
                  </p>
                  <p
                    className={[
                      "mt-3 text-[2.4rem] font-semibold leading-none tracking-tight",
                      summaryCardTone(pendingApprovals),
                    ].join(" ")}
                  >
                    {pendingApprovals}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-900">
                  <span className="material-symbols-outlined">verified</span>
                </div>
              </article>
              ) : null}

<article className="section-card flex items-center justify-between p-6">
                 <div>
                   <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                     {nextShiftLabel}
                   </p>
                   <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                     {nextShiftDetail}
                   </p>
                   {nextShiftMode && (
                     <p className="mt-1 text-sm text-slate-500">
                       {nextShiftMode}
                     </p>
                   )}
                 </div>
                 <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isClockedIn ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-700"}`}>
                   <span className="material-symbols-outlined">{isClockedIn ? "timer" : "schedule"}</span>
                 </div>
               </article>
            </div>

            <section className="relative overflow-hidden rounded-[1.5rem] bg-brand-900 p-8 text-white shadow-card">
              <div className="absolute right-[-2rem] top-[-2rem] h-32 w-32 rounded-full bg-white/5" />
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                    <span className="material-symbols-outlined text-3xl">
                      {attendance?.current_state?.is_clocked_in
                        ? "badge"
                        : "meeting_room"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/70">
                      Today&apos;s Attendance
                    </p>
                    <h3 className="mt-2 text-3xl font-semibold tracking-tight">
                      {attendance?.current_state?.is_clocked_in
                        ? "Clocked In"
                        : "Not Clocked In"}
                    </h3>
                    <div className="mt-3 flex items-center gap-2 text-sm text-white/85">
                      <span
                        className={[
                          "inline-block h-2 w-2 rounded-full",
                          attendance?.current_state?.is_clocked_in
                            ? "bg-emerald-300"
                            : "bg-rose-300",
                        ].join(" ")}
                      />
                      <span>
                        {today
                          ? `${humanize(String(today.attendance_mode || today.expected_mode || "onsite"))} • First in ${formatTime(today.first_in_at)}`
                          : "No attendance record yet today."}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/85">
                    Mode:{" "}
                    {humanize(
                      String(
                        today?.attendance_mode ||
                          today?.expected_mode ||
                          "onsite",
                      ),
                    )}
                  </div>
                  <Link to="/attendance" className="inline-flex">
                    <Button
                      variant="secondary"
                      className="!border-white/10 !bg-white !text-brand-900 hover:!bg-slate-100"
                    >
                      Open Attendance
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            <SectionCard
              title="Needs Your Attention"
              action={
                <Link
                  to="/requests"
                  className="text-sm font-semibold text-brand-900"
                >
                  View all
                </Link>
              }
            >
              <div className="divide-y divide-slate-100">
                {/* Pending approvals first — only for users with requests.approve */}
                {canApprove && pendingApprovalItems.map((row) => {
                  const category = requestCategoryFromRecord(row);
                  const hint = attentionHint(row.status, true);
                  return (
                    <Link
                      key={`approval-${row.id}`}
                      to={`/requests/approvals`}
                      className="flex items-center justify-between gap-4 px-1 py-4 transition hover:bg-slate-50/70"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-900">
                          <span className="material-symbols-outlined">
                            {requestIcon(row.request_type?.name, category)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {row.request_type?.name ||
                              row.request_number ||
                              "Request"}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {requestSubtitle(row)}
                          </p>
                        </div>
                      </div>
                      <Chip variant={hint.tone}>{hint.label}</Chip>
                    </Link>
                  );
                })}

                {/* Own requests needing action */}
                {attentionRequests.map((row) => {
                  const category = requestCategoryFromRecord(row);
                  const hint = attentionHint(row.status);
                  return (
                    <Link
                      key={row.id}
                      to={`/requests/${row.id}`}
                      className="flex items-center justify-between gap-4 px-1 py-4 transition hover:bg-slate-50/70"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <span className="material-symbols-outlined">
                            {requestIcon(row.request_type?.name, category)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {row.request_type?.name ||
                              row.request_number ||
                              "Request"}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {requestSubtitle(row)}
                          </p>
                        </div>
                      </div>
                      <Chip variant={hint.tone}>{hint.label}</Chip>
                    </Link>
                  );
                })}

                {!loadingRequests && attentionVisible === 0 ? (
                  <div className="flex items-center gap-3 px-1 py-8">
                    <span className="material-symbols-outlined text-emerald-500">
                      check_circle
                    </span>
                    <p className="text-sm text-slate-500">
                      All caught up — no requests need your attention right now.
                    </p>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <section className="rounded-[1.5rem] bg-brand-900 p-6 text-white shadow-card">
              <div className="mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">bolt</span>
                <h3 className="font-headline text-lg font-semibold tracking-tight">
                  Quick Actions
                </h3>
              </div>

              <div className="space-y-3">
                <Link
                  to="/requests/new"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 transition hover:bg-white/15"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined">
                      add_circle
                    </span>
                    <span className="text-sm font-medium">New Request</span>
                  </div>
                  <span className="material-symbols-outlined text-white/60">
                    arrow_forward
                  </span>
                </Link>

                <Link
                  to="/attendance"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 transition hover:bg-white/15"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined">
                      history_edu
                    </span>
                    <span className="text-sm font-medium">Submit Timecard</span>
                  </div>
                  <span className="material-symbols-outlined text-white/60">
                    arrow_forward
                  </span>
                </Link>

                <Link
                  to="/requests/new"
                  className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 transition hover:bg-white/15"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined">
                      event_busy
                    </span>
                    <span className="text-sm font-medium">Request Leave</span>
                  </div>
                  <span className="material-symbols-outlined text-white/60">
                    arrow_forward
                  </span>
                </Link>

                {financeViewer ? (
                  <Link
                    to="/finance"
                    className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 transition hover:bg-white/15"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined">
                        account_balance_wallet
                      </span>
                      <span className="text-sm font-medium">Finance Admin</span>
                    </div>
                    <span className="material-symbols-outlined text-white/60">
                      arrow_forward
                    </span>
                  </Link>
                ) : null}
              </div>
            </section>

            <SectionCard
              title="Team Context"
              action={
                unreadNotifications.length > 0 ? (
                  <span className="rounded-md bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-900">
                    {unreadNotifications.length} new
                  </span>
                ) : undefined
              }
              className="bg-slate-50/80"
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Primary Context
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {organization?.name || "No primary organization"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {primaryGroup?.name || "No group assigned"}
                  </p>
                </div>

                {latestNotice ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-brand-900">
                        campaign
                      </span>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-900">
                        Announcement
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">
                      {latestNotice.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {latestNotice.message}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                    No new team announcements right now.
                  </div>
                )}
              </div>
            </SectionCard>

            <section className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-6 text-white shadow-card">
              <div className="absolute bottom-0 right-0 p-4 opacity-20">
                <span className="material-symbols-outlined text-7xl">
                  blur_on
                </span>
              </div>
              <div className="relative">
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/70">
                  Stanforte Edge
                </p>
                <p className="mt-2 font-headline text-2xl font-semibold leading-tight">
                  Shared Prosperity for modern operations
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        <div className="pt-1">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
            Dashboard
          </p>
          <h1 className="page-title mt-2 text-[clamp(1.7rem,7vw,2.2rem)]">{`${greeting()}, ${userFirstName(user)}.`}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            {formatTodayLong()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <article className="section-card p-4">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
              Active Requests
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {activeRequests}
            </p>
          </article>
          {canApprove ? (
          <article className="section-card p-4">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
              Approvals
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {pendingApprovals}
            </p>
          </article>
          ) : null}
        </div>

        <section className="rounded-[1.5rem] bg-brand-900 p-5 text-white shadow-card">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-white/70">
            Today&apos;s Attendance
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">
            {attendance?.current_state?.is_clocked_in
              ? "Clocked In"
              : "Not Clocked In"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-white/80">
            {today
              ? `${humanize(String(today.attendance_mode || today.expected_mode || "onsite"))} • First in ${formatTime(today.first_in_at)}`
              : "No attendance record yet today."}
          </p>
          <Link to="/attendance" className="mt-4 inline-flex">
            <Button
              variant="secondary"
              className="!border-white/10 !bg-white !text-brand-900 hover:!bg-slate-100"
            >
              Open Attendance
            </Button>
          </Link>
        </section>

        <SectionCard
          title="Needs Your Attention"
          action={
            <Link
              to="/requests"
              className="text-sm font-semibold text-brand-900"
            >
              View all
            </Link>
          }
        >
          <div className="space-y-3">
            {pendingApprovalItems.map((row) => {
              const hint = attentionHint(row.status, true);
              return (
                <Link
                  key={`approval-${row.id}`}
                  to="/requests/approvals"
                  className="block rounded-2xl border border-brand-100 bg-brand-50/40 p-4 transition hover:bg-brand-50"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {row.request_type?.name || row.request_number || "Request"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDisplayDate(row.created_at)}
                  </p>
                  <div className="mt-3">
                    <Chip variant={hint.tone}>{hint.label}</Chip>
                  </div>
                </Link>
              );
            })}
            {attentionRequests.map((row) => {
              const hint = attentionHint(row.status);
              return (
                <Link
                  key={row.id}
                  to={`/requests/${row.id}`}
                  className="block rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {row.request_type?.name || row.request_number || "Request"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDisplayDate(row.created_at)}
                  </p>
                  <div className="mt-3">
                    <Chip variant={hint.tone}>{hint.label}</Chip>
                  </div>
                </Link>
              );
            })}
            {!loadingRequests && attentionVisible === 0 ? (
              <div className="flex items-center gap-2 py-4">
                <span className="material-symbols-outlined text-emerald-500 text-[18px]">
                  check_circle
                </span>
                <p className="text-sm text-slate-500">All caught up.</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
