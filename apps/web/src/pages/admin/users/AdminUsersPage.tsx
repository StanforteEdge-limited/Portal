import { useState, type MouseEvent } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { PageHeader } from "@/shared";
import { adminUsersApi, resourceApi, useCachedQuery } from "@/shared/lib/core";
import type { AdminUser } from "@stanforte/shared";
import AdminUserCreateSlideOver from "./AdminUserCreateSlideOver";
import {
  Users,
  UserCheck,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  UserPlus,
  ArrowRight,
  Building2,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  XCircle,
  UploadCloud,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const typeLabel: Record<string, string> = {
  staff: "Staff",
  vendor: "Vendor",
  client: "Client",
  board_member: "Board Member",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [listKey, setListKey] = useState(0);

  const { data, loading, error } = useCachedQuery(
    `admin:users:${listKey}:${search}:${typeFilter}:${statusFilter}:${orgFilter}`,
    () =>
      adminUsersApi.listUsers({
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        organization_id: orgFilter || undefined,
        per_page: 100,
      }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const users: AdminUser[] = Array.isArray(data?.data) ? data.data : [];

  const { data: organizations } = useCachedQuery(
    "admin:users:organizations",
    () => resourceApi.listOrganizations(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const organizationNameById = new Map(
    (organizations as any)?.data?.items?.map((org: any) => [String(org.id), org.name]) ?? []
  );

  const total = (data as any)?.data?.meta?.total ?? users.length;
  const active = users.filter((u) => u.status === "active").length;
  const pending = users.filter((u) => u.status === "pending").length;
  const suspended = users.filter((u) => u.status === "suspended" || u.status === "inactive").length;
  const activePercent = total > 0 ? Math.round((active / total) * 100) : 100;

  return (
    <PortalLayout activeNav="HR & Workforce">
      {/* Modern Unified Page Header (No Breadcrumbs) */}
      <PageHeader
        title="HR & Workforce Directory"
        description="Manage organization members, employee directories, roles, and access permissions."
        icon={Users}
        iconColor="bg-blue-50 text-blue-600"
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/users/bulk")}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition flex items-center gap-2"
            >
              <UploadCloud className="h-4 w-4 text-slate-500" />
              <span>Bulk Import</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] active:scale-95 text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add User</span>
            </button>
          </div>
        }
      />

      {/* 2. Stat Metric Cards (Matching the design system screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Workforce */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Total Workforce</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {total.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>↑ 12% vs last month</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Active Members */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Active Members</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {active.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold text-emerald-600">
              {activePercent}% online / verified
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Pending Invites */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Pending Invites</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {pending.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Awaiting activation
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Inactive / Suspended */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-500">Suspended / Inactive</span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {suspended.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Requires review
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none transition focus:bg-white focus:border-[#ff6900]"
            />
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 focus:bg-white focus:border-[#ff6900]"
            >
              <option value="">All Types</option>
              <option value="staff">Staff</option>
              <option value="vendor">Vendor</option>
              <option value="client">Client</option>
              <option value="board_member">Board Member</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 focus:bg-white focus:border-[#ff6900]"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Organization Filter */}
          <div className="lg:col-span-3">
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-700 focus:bg-white focus:border-[#ff6900]"
            >
              <option value="">All Organizations</option>
              {(organizations as any)?.data?.items?.map((org: any) => (
                <option key={org.id} value={String(org.id)}>
                  {org.name}
                </option>
              )) ?? null}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Modern Data Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Organization / Unit
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Account Type
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading workforce directory...</div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">No users found</div>
                    <div className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || typeFilter || statusFilter || orgFilter
                        ? "Try clearing or adjusting your search filters to find members."
                        : "No users have been added to this workspace yet."}
                    </div>
                    {(search || typeFilter || statusFilter || orgFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setTypeFilter("");
                          setStatusFilter("");
                          setOrgFilter("");
                        }}
                        className="mt-4 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;
                  const initials = fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const primaryFromMembership = (u.organizations ?? []).find(
                    (org) => org.id === u.primary_organization_id || org.is_primary,
                  );
                  const orgName = String(
                    primaryFromMembership?.name ||
                    (u.primary_organization_id
                      ? organizationNameById.get(String(u.primary_organization_id)) || ""
                      : "") ||
                    u.primary_organization?.name ||
                    "-"
                  );

                  return (
                    <tr
                      key={u.id}
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* User Info Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-50 border border-orange-200/60 text-[#ff6900] font-bold text-xs flex items-center justify-center shrink-0">
                            {initials || "U"}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors">
                              {fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Organization Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate max-w-[180px]">{orgName}</span>
                        </div>
                      </td>

                      {/* Type Column */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-slate-700 capitalize">
                          {typeLabel[u.type] ?? u.type}
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4">
                        {u.status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : u.status === "pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            {u.status || "Inactive"}
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/admin/users/${u.id}`}
                          onClick={(e: MouseEvent) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-[#ff6900] hover:bg-orange-50 transition"
                        >
                          <span>View</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Meta info */}
        <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Showing <strong className="text-slate-800">{users.length}</strong> of{" "}
            <strong className="text-slate-800">{total}</strong> members
          </span>
          <span className="text-[11px] text-slate-400">
            Real-time multi-tenant sync enabled
          </span>
        </div>
      </div>

      {/* SlideOver for Creating a New User */}
      {showCreate ? (
        <AdminUserCreateSlideOver
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setListKey((k) => k + 1);
          }}
        />
      ) : null}
    </PortalLayout>
  );
}
