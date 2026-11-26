import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@/shared/router-adapter";
import { StanforteLogo } from "@/components/brand/StanforteLogo";
import {
  Activity,
  Building2,
  CheckCircle2,
  CreditCard,
  GitCommitHorizontal,
  Inbox,
  LogOut,
  RefreshCw,
  Rocket,
  Shield,
  ShieldAlert,
  TrendingUp,
  Users,
  AlertTriangle,
} from "lucide-react";

const API_BASE =
  ((import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:3000/v1").replace(
    /\/+$/,
    "",
  );

type TabKey =
  | "overview"
  | "organizations"
  | "payments"
  | "deployments"
  | "security"
  | "inquiries";

function formatNgn(amount: number) {
  return `₦${Number(amount || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 0,
  })}`;
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${seconds % 60}s`;
}

export default function CeoDashboardPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<{
    id: string;
    email: string;
    fullName: string;
    title: string;
  } | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch(`${API_BASE}/ceo/auth/me`, {
        credentials: "include",
      });
      if (meRes.status === 401) {
        navigate("/ceo/login", { replace: true });
        return;
      }
      const meJson = await meRes.json();
      setAdmin(meJson?.data?.admin ?? meJson?.admin ?? null);

      const ovRes = await fetch(`${API_BASE}/ceo/overview`, {
        credentials: "include",
      });
      if (ovRes.ok) {
        const ovJson = await ovRes.json();
        setData(ovJson?.data ?? ovJson);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleLogout() {
    await fetch(`${API_BASE}/ceo/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    navigate("/ceo/login", { replace: true });
  }

  async function toggleOrgStatus(orgId: string, currentStatus: string) {
    const next = currentStatus === "active" ? "suspended" : "active";
    setBusyId(`org:${orgId}`);
    try {
      const res = await fetch(`${API_BASE}/ceo/organizations/${orgId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        notify(`Organization status updated to ${next}.`);
        await loadData();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function updateInquiryStatus(id: string, status: string) {
    setBusyId(`inq:${id}`);
    try {
      const res = await fetch(`${API_BASE}/ceo/inquiries/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        notify(`Inquiry marked as ${status.replace("_", " ")}.`);
        await loadData();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6900] border-t-transparent animate-spin" />
      </div>
    );
  }

  const kpis = data?.kpis ?? {};
  const revenueSeries: Array<{ month: string; revenueNgn: number; organizations: number }> =
    data?.charts?.revenueSeries ?? [];
  const planDistribution: Array<{ plan: string; count: number; revenueNgn: number }> =
    data?.charts?.planDistribution ?? [];
  const maxRev = Math.max(...revenueSeries.map((r) => r.revenueNgn), 1);
  const lastDep = data?.deployment?.lastDeployment;

  const tabs: Array<{ id: TabKey; label: string; icon: any; badge?: number }> = [
    { id: "overview", label: "Executive Overview", icon: TrendingUp },
    { id: "organizations", label: "Organizations", icon: Building2, badge: kpis.totalOrganizations },
    { id: "payments", label: "Revenue & Payments", icon: CreditCard },
    { id: "deployments", label: "Deployments", icon: Rocket },
    { id: "security", label: "Security & Audit", icon: Shield, badge: kpis.securityAlerts },
    { id: "inquiries", label: "Support Reports", icon: Inbox, badge: kpis.openInquiries },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col lg:flex-row">
      {/* Dark Graphite Sidebar (retaining brand palette) */}
      <aside className="w-full lg:w-64 bg-[#141415] text-[#ededed] border-b lg:border-b-0 lg:border-r border-white/[0.08] flex flex-col shrink-0">
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <StanforteLogo variant="dark" className="h-7" />
          <span className="px-2 py-0.5 rounded bg-[#ff6900]/15 text-[#ff6900] text-[10px] font-mono border border-[#ff6900]/30">
            CEO
          </span>
        </div>

        <nav className="p-3 flex-1 space-y-1 overflow-x-auto flex lg:flex-col gap-1 lg:gap-0.5">
          {tabs.map((t) => {
            const IconComp = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-[#ff6900] text-white"
                    : "text-[#a1a1a6] hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <IconComp className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span>{t.label}</span>
                </span>
                {typeof t.badge === "number" && t.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white/[0.08] text-[#ededed]"
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.08] space-y-3 hidden lg:block">
          <div className="text-xs">
            <div className="font-medium text-white truncate">
              {admin?.fullName || "Executive Director"}
            </div>
            <div className="text-[#85858b] truncate font-mono text-[11px]">
              {admin?.email || "ceo@stanforteedge.com"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full h-9 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-[#ededed] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Executive Canvas */}
      <main className="flex-1 min-w-0 p-6 sm:p-8 max-w-[1440px] mx-auto w-full space-y-6">
        {/* Top Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-[#ff6900] uppercase tracking-wider">
              Platform Executive Console
            </p>
            <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight font-headline">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            {lastDep && (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-600/15 text-emerald-800 text-xs font-mono inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  Live {lastDep.version} ({lastDep.commit_sha})
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => void loadData()}
              className="h-9 px-3.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {toast && (
          <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-600/20 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* KPI Cards Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Monthly Recurring Revenue</span>
              <TrendingUp className="h-4 w-4 text-[#ff6900]" />
            </div>
            <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {formatNgn(kpis.mrrNgn)}
            </div>
            <div className="text-xs text-neutral-500 tabular-nums">
              ARR Run-Rate: <span className="font-medium text-neutral-800">{formatNgn(kpis.arrNgn)}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Active Organizations</span>
              <Building2 className="h-4 w-4 text-[#ff6900]" />
            </div>
            <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {kpis.activeOrganizations ?? 0}{" "}
              <span className="text-sm font-normal text-neutral-400">
                / {kpis.totalOrganizations ?? 0}
              </span>
            </div>
            <div className="text-xs text-neutral-500 tabular-nums">
              {kpis.activeUsers ?? 0} active users across all tenants
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Last Deployment</span>
              <Rocket className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-semibold text-neutral-900 font-mono">
              {lastDep?.version || "v2.4.0"}
            </div>
            <div className="text-xs text-neutral-500">
              Uptime {formatUptime(data?.deployment?.runtime?.uptimeSeconds ?? 0)} ·{" "}
              {data?.deployment?.runtime?.nodeVersion || "Node 20"}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Security &amp; Support Queue</span>
              <Shield className="h-4 w-4 text-[#ff6900]" />
            </div>
            <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
              {kpis.openInquiries ?? 0}{" "}
              <span className="text-sm font-normal text-neutral-400">open reports</span>
            </div>
            <div className="text-xs text-neutral-500 tabular-nums">
              {kpis.securityAlerts ?? 0} flagged login accounts · 6/6 controls active
            </div>
          </div>
        </section>

        {/* TAB: OVERVIEW (Charts + Last Deployment + Security Posture) */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Revenue Growth Bar Chart */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">
                    Platform Revenue Trajectory (NGN)
                  </h2>
                  <p className="text-xs text-neutral-500">
                    6-month recurring revenue growth across active subscriptions
                  </p>
                </div>
                <span className="text-xs font-mono text-[#ff6900] bg-orange-50 px-2.5 py-1 rounded-md">
                  Paystack Live
                </span>
              </div>

              <div className="grid grid-cols-6 gap-3 items-end h-52 pt-4">
                {revenueSeries.map((pt) => {
                  const pct = Math.max(12, Math.round((pt.revenueNgn / maxRev) * 100));
                  return (
                    <div key={pt.month} className="flex flex-col items-center gap-2 h-full justify-end">
                      <span className="text-[11px] font-mono text-neutral-600 tabular-nums">
                        {formatNgn(pt.revenueNgn)}
                      </span>
                      <div className="w-full max-w-[48px] bg-neutral-100 rounded-t-xl h-36 flex items-end overflow-hidden">
                        <div
                          className="w-full bg-[#ff6900] hover:bg-[#ea580c] transition-all rounded-t-xl"
                          style={{ height: `${pct}%` }}
                          title={`${pt.month}: ${formatNgn(pt.revenueNgn)} (${pt.organizations} orgs)`}
                        />
                      </div>
                      <span className="text-xs font-medium text-neutral-600">
                        {pt.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan Distribution & Security Posture */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
                <h2 className="text-base font-semibold text-neutral-900">
                  Subscriptions by Tier
                </h2>
                <div className="space-y-3">
                  {planDistribution.map((p) => (
                    <div key={p.plan} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize font-medium text-neutral-800">
                          {p.plan}
                        </span>
                        <span className="font-mono text-neutral-600 tabular-nums">
                          {p.count} orgs · {formatNgn(p.revenueNgn)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className="h-full bg-[#ff6900] rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(10, (p.count / Math.max(kpis.totalOrganizations || 1, 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#141415] text-[#ededed] rounded-2xl p-6 space-y-3 border border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Security Controls</h2>
                  <span className="text-[11px] font-mono text-emerald-400">ALL ACTIVE</span>
                </div>
                <ul className="space-y-2 text-xs text-[#a1a1a6]">
                  {(data?.security?.controls ?? []).map((c: any) => (
                    <li key={c.name} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>{c.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ORGANIZATIONS */}
        {activeTab === "organizations" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">
                Registered Tenant Organizations
              </h2>
              <span className="text-xs font-mono text-neutral-500">
                {(data?.organizations ?? []).length} total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500 border-b border-neutral-100">
                  <tr>
                    <th className="py-3 px-6">Organization</th>
                    <th className="py-3 px-6">Subdomain</th>
                    <th className="py-3 px-6">Plan</th>
                    <th className="py-3 px-6">Members</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(data?.organizations ?? []).map((org: any) => (
                    <tr key={org.id} className="hover:bg-neutral-50/70">
                      <td className="py-3.5 px-6 font-medium text-neutral-900">
                        {org.name}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs text-neutral-600">
                        {org.slug}
                      </td>
                      <td className="py-3.5 px-6 capitalize text-xs font-medium">
                        {org.plan}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs tabular-nums">
                        {org.member_count}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            org.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              org.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                          />
                          {org.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          disabled={busyId === `org:${org.id}`}
                          onClick={() => void toggleOrgStatus(org.id, org.status)}
                          className="h-8 px-3 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-xs font-medium text-neutral-700 cursor-pointer disabled:opacity-50"
                        >
                          {org.status === "active" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: PAYMENTS & REVENUE */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">
                Active Subscriptions &amp; Paystack Billing
              </h2>
              <span className="text-xs font-mono text-[#ff6900]">
                MRR: {formatNgn(kpis.mrrNgn)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs text-neutral-500 border-b border-neutral-100">
                  <tr>
                    <th className="py-3 px-6">Tenant ID</th>
                    <th className="py-3 px-6">Plan</th>
                    <th className="py-3 px-6">Amount</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Period End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(data?.payments?.subscriptions ?? []).map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-neutral-50/70">
                      <td className="py-3.5 px-6 font-mono text-xs">#{sub.tenant_id}</td>
                      <td className="py-3.5 px-6 font-medium text-neutral-900">
                        {sub.plan_name}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs tabular-nums">
                        {formatNgn(Number(sub.amount_minor || 0) / 100)}/mo
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 capitalize">
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-neutral-500">
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: DEPLOYMENTS */}
        {activeTab === "deployments" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Deployment Pipeline &amp; Release History
                </h2>
                <p className="text-xs text-neutral-500">
                  Runtime: {data?.deployment?.runtime?.nodeVersion} · Uptime{" "}
                  {formatUptime(data?.deployment?.runtime?.uptimeSeconds ?? 0)}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-mono">
                Health: {data?.deployment?.runtime?.health?.status || "ok"}
              </span>
            </div>
            <div className="divide-y divide-neutral-100">
              {(data?.deployment?.history ?? []).map((dep: any) => (
                <div
                  key={dep.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/70"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-semibold text-neutral-900">
                        {dep.version}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-xs font-mono">
                        <GitCommitHorizontal className="h-3 w-3" />
                        {dep.commit_sha}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 capitalize">
                        {dep.status}
                      </span>
                      <span className="text-xs text-neutral-400 capitalize">
                        {dep.environment}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600">{dep.notes}</p>
                  </div>
                  <div className="text-xs text-neutral-500 sm:text-right shrink-0">
                    <div>{dep.deployed_by}</div>
                    <div className="font-mono text-[11px]">
                      {new Date(dep.deployed_at).toLocaleString()} ({dep.duration_seconds}s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: SECURITY LOGS */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[#ff6900]" />
                  <span>Flagged Accounts &amp; Failed Logins</span>
                </h2>
                <span className="text-xs font-mono text-neutral-500">
                  {(data?.security?.flaggedAccounts ?? []).length} accounts
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-xs text-neutral-500 border-b border-neutral-100">
                    <tr>
                      <th className="py-3 px-6">Email</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Failed Attempts</th>
                      <th className="py-3 px-6">Lockout Until</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {(data?.security?.flaggedAccounts ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-neutral-500">
                          No locked or flagged accounts detected.
                        </td>
                      </tr>
                    ) : (
                      (data?.security?.flaggedAccounts ?? []).map((acc: any) => (
                        <tr key={acc.id}>
                          <td className="py-3 px-6 font-mono text-xs">{acc.email}</td>
                          <td className="py-3 px-6 capitalize text-xs">{acc.status}</td>
                          <td className="py-3 px-6 font-mono text-xs">
                            {acc.failed_login_attempts}
                          </td>
                          <td className="py-3 px-6 text-xs text-neutral-500">
                            {acc.lockout_until
                              ? new Date(acc.lockout_until).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#ff6900]" />
                  <span>Recent Audit Trail</span>
                </h2>
                <span className="text-xs font-mono text-neutral-500">
                  {(data?.security?.auditLogs ?? []).length} events
                </span>
              </div>
              <div className="divide-y divide-neutral-100 text-xs">
                {(data?.security?.auditLogs ?? []).length === 0 ? (
                  <div className="p-8 text-center text-neutral-500">
                    Audit stream active — no anomalies recorded yet.
                  </div>
                ) : (
                  (data?.security?.auditLogs ?? []).map((log: any) => (
                    <div
                      key={log.id}
                      className="px-6 py-3 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5">
                        <span className="font-mono font-medium text-neutral-900">
                          {log.action}
                        </span>
                        <span className="text-neutral-500 ml-2">
                          {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""}
                        </span>
                      </div>
                      <div className="text-neutral-500 font-mono">
                        {log.actor_email || "system"} ·{" "}
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: SUPPORT REPORTS / CONTACT INBOX */}
        {activeTab === "inquiries" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-neutral-900">
                Contact &amp; Support Reports
              </h2>
              <span className="text-xs font-mono text-neutral-500">
                {(data?.inquiries ?? []).length} total
              </span>
            </div>
            <div className="divide-y divide-neutral-100">
              {(data?.inquiries ?? []).map((inq: any) => (
                <div
                  key={inq.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-neutral-50/70"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-neutral-500">
                        {inq.reference}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-orange-50 text-[#c2410c] text-[11px] font-medium capitalize">
                        {String(inq.category).replace("_", " ")}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                          inq.status === "resolved"
                            ? "bg-emerald-50 text-emerald-700"
                            : inq.status === "in_progress"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {String(inq.status).replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-900">
                      {inq.subject}
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">
                      {inq.message}
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      {inq.name} ({inq.email})
                      {inq.organization ? ` · ${inq.organization}` : ""} ·{" "}
                      {new Date(inq.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {inq.status !== "resolved" && (
                      <button
                        type="button"
                        disabled={busyId === `inq:${inq.id}`}
                        onClick={() => void updateInquiryStatus(inq.id, "resolved")}
                        className="h-8 px-3 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium cursor-pointer disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
