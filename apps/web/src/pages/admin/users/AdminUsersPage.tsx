import { SelectBox } from "@/components/ui/select";
import { useState, type MouseEvent } from "react";
import { Link, useNavigate } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { adminUsersApi, resourceApi, useCachedQuery } from "@/shared/lib/core";
import type { AdminUser } from "@stanforte/shared";
import AdminUserCreateSlideOver from "./AdminUserCreateSlideOver";
import {
  Users,
  Search,
  UserPlus,
  Building2,
  UploadCloud,
  ChevronRight,
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
    <PortalLayout activeNav="Employees">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        <PageHeader
          title="Workforce directory"
          description="Manage organization members, account types, and access status"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/admin/users/bulk")}
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-neutral-50 text-neutral-900 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              >
                <UploadCloud className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                <span>Bulk import</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] active:scale-[0.98] text-white text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              >
                <UserPlus className="h-4 w-4" strokeWidth={1.5} />
                <span>Add user</span>
              </button>
            </div>
          }
        />

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <article className="bg-white p-5 rounded-2xl border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Total workforce</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {total.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">Registered user accounts</p>
          </article>

          <article className="bg-white p-5 rounded-2xl border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Active members</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {active.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500 tabular-nums">
              {activePercent}% of directory active
            </p>
          </article>

          <article className="bg-white p-5 rounded-2xl border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Pending invites</p>
            <p className="text-[28px] leading-none font-medium text-[#c2410c] font-headline tabular-nums">
              {pending.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">Awaiting activation</p>
          </article>

          <article className="bg-white p-5 rounded-2xl border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Suspended or inactive</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {suspended.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500">Requires access review</p>
          </article>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-900/[0.08] shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" strokeWidth={1.5} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users"
                className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-neutral-900/[0.12] rounded-lg text-neutral-900 placeholder:text-neutral-400 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
              />
            </div>

            <div className="lg:col-span-2">
              <SelectBox
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-neutral-900/[0.12] rounded-lg outline-none text-neutral-700 focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
              >
                <option value="">All types</option>
                <option value="staff">Staff</option>
                <option value="vendor">Vendor</option>
                <option value="client">Client</option>
                <option value="board_member">Board member</option>
              </SelectBox>
            </div>

            <div className="lg:col-span-2">
              <SelectBox
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-neutral-900/[0.12] rounded-lg outline-none text-neutral-700 focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </SelectBox>
            </div>

            <div className="lg:col-span-3">
              <SelectBox
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-white border border-neutral-900/[0.12] rounded-lg outline-none text-neutral-700 focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
              >
                <option value="">All organizations</option>
                {(organizations as any)?.data?.items?.map((org: any) => (
                  <option key={org.id} value={String(org.id)}>
                    {org.name}
                  </option>
                )) ?? null}
              </SelectBox>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-neutral-900/[0.08] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 border-b border-neutral-900/[0.08]">
                  <th className="px-5 py-3 text-xs font-medium text-neutral-500">Employee</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-500">Organization</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-500">Account type</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-500">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-500">Joined</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-neutral-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                {loading && users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-neutral-500">
                      <div className="inline-block w-5 h-5 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Loading workforce directory</div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <Users className="h-6 w-6 text-neutral-400 mx-auto mb-2" strokeWidth={1.5} />
                      <div className="text-sm font-medium text-neutral-900">No users found</div>
                      <div className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                        {search || typeFilter || statusFilter || orgFilter
                          ? "Try clearing or adjusting your search filters"
                          : "No users have been added to this workspace yet"}
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
                          className="mt-4 h-8 px-3 rounded-lg border border-neutral-900/[0.10] bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
                        >
                          Reset filters
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
                      "—"
                    );

                    return (
                      <tr
                        key={u.id}
                        onClick={() => navigate(`/admin/users/${u.id}`)}
                        className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150 cursor-pointer group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-900/[0.06] text-neutral-700 font-medium text-xs flex items-center justify-center shrink-0">
                              {initials || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-neutral-900 group-hover:text-[#c2410c] transition-colors duration-150 truncate">
                                {fullName}
                              </div>
                              <div className="text-xs text-neutral-500 mt-0.5 truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 text-sm text-neutral-700">
                            <Building2 className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
                            <span className="truncate max-w-[200px]">{orgName}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-sm text-neutral-600 capitalize">
                          {typeLabel[u.type] ?? u.type}
                        </td>

                        <td className="px-5 py-3.5">
                          {u.status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-600/15">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          ) : u.status === "pending" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-600/15">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-600/15 capitalize">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              {u.status || "Inactive"}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-xs font-mono text-neutral-500 tabular-nums">
                          {formatDate(u.created_at)}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <Link
                            to={`/admin/users/${u.id}`}
                            onClick={(e: MouseEvent) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                          >
                            <span>View</span>
                            <ChevronRight className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-neutral-50/60 border-t border-neutral-900/[0.08] flex items-center justify-between text-xs text-neutral-500">
            <span className="tabular-nums">
              Showing <span className="font-medium text-neutral-900">{users.length}</span> of{" "}
              <span className="font-medium text-neutral-900">{total}</span> members
            </span>
            <span className="font-mono text-neutral-400">Multi-tenant sync</span>
          </div>
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
