import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery } from "@/shared/lib/core";
import {
  listRoles,
  deleteRole,
  listPermissions,
  type Role,
  type RolePermission,
} from "./admin-roles-api";
import AdminRoleSlideOver from "./AdminRoleSlideOver";
import AdminPermissionSlideOver from "./AdminPermissionSlideOver";
import {
  ShieldCheck,
  Key,
  Users,
  Lock,
  Plus,
  Pencil,
  Trash2,
  Search,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Layers,
} from "lucide-react";

type ActiveTab = "roles" | "permissions";

export default function AdminRolesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("roles");
  const [search, setSearch] = useState("");
  const [listKey, setListKey] = useState(0);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null | boolean>(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [viewingPermission, setViewingPermission] = useState<RolePermission | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  function notify(text: string, tone: "success" | "error" = "success") {
    setToastMsg({ text, tone });
    setTimeout(() => setToastMsg(null), 4000);
  }

  const { data: rolesData, loading: rolesLoading } = useCachedQuery(
    `admin:roles:${listKey}:${search}`,
    () => listRoles({ search: search || undefined, per_page: 100 }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const { data: permissionsData, loading: permissionsLoading } = useCachedQuery(
    `admin:permissions:${listKey}`,
    () => listPermissions(),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const roles: Role[] = Array.isArray((rolesData as any)?.data?.items)
    ? (rolesData as any).data.items
    : Array.isArray(rolesData)
    ? rolesData
    : [];

  const permissions: RolePermission[] = Array.isArray((permissionsData as any)?.data?.items)
    ? (permissionsData as any).data.items
    : Array.isArray(permissionsData)
    ? permissionsData
    : [];

  const totalAssignedUsers = useMemo(() => {
    return roles.reduce((sum, r) => sum + (r.users?.length ?? 0), 0);
  }, [roles]);

  const groupedPermissions = useMemo(() => {
    const map: Record<string, RolePermission[]> = {};
    for (const p of permissions) {
      const module = (p as any).module || "Core & Platform";
      if (!map[module]) map[module] = [];
      map[module].push(p);
    }
    return map;
  }, [permissions]);

  async function handleDeleteRole(role: Role) {
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      setDeletingRoleId(role.id);
      await deleteRole(role.id);
      notify(`Role "${role.name}" removed.`);
      setListKey((k) => k + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Unable to delete role.", "error");
    } finally {
      setDeletingRoleId(null);
    }
  }

  return (
    <PortalLayout activeNav="Roles">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        <PageHeader
          title="Workforce access and roles"
          description="Define operational permissions, assign approval authority, and review privilege levels"
          actions={
            activeTab === "roles" ? (
              <button
                type="button"
                onClick={() => setShowCreateRole(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                <span>Create role</span>
              </button>
            ) : undefined
          }
        />

        {/* Toast */}
        {toastMsg && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5 border ${
              toastMsg.tone === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-600/15"
                : "bg-rose-50 text-rose-800 border-rose-600/15"
            }`}
          >
            {toastMsg.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" strokeWidth={1.5} />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Configured roles</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {roles.length.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">System & workspace roles</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Permissions catalog</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {permissions.length.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Granular capabilities</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Role assignments</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {totalAssignedUsers.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Active member bindings</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Access policy</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline">
              RBAC
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Tenant-scoped enforcement</p>
          </article>
        </div>

        {/* Filter and Tab Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-900/[0.06] self-start">
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 ${
                activeTab === "roles"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
              <span>Roles directory</span>
              <span className="font-mono text-neutral-500 tabular-nums">{roles.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("permissions")}
              className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 ${
                activeTab === "permissions"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Key className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
              <span>Permissions</span>
              <span className="font-mono text-neutral-500 tabular-nums">{permissions.length}</span>
            </button>
          </div>

          {activeTab === "roles" && (
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" strokeWidth={1.5} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/15"
              />
            </div>
          )}
        </div>

        {/* Roles Tab */}
        {activeTab === "roles" && (
          <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/80 border-b border-neutral-900/[0.08]">
                    <th className="py-3 px-5 text-xs font-medium text-neutral-500">Role name</th>
                    <th className="py-3 px-5 text-xs font-medium text-neutral-500">Identifier</th>
                    <th className="py-3 px-5 text-right text-xs font-medium text-neutral-500">Permissions</th>
                    <th className="py-3 px-5 text-right text-xs font-medium text-neutral-500">Members</th>
                    <th className="py-3 px-5 text-xs font-medium text-neutral-500">Status</th>
                    <th className="py-3 px-5 text-right text-xs font-medium text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                  {rolesLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-neutral-500">
                        Loading roles
                      </td>
                    </tr>
                  ) : roles.length > 0 ? (
                    roles.map((role) => (
                      <tr key={role.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                        <td className="py-3.5 px-5">
                          <div className="font-medium text-neutral-900">{role.name}</div>
                          {role.description && (
                            <div className="text-xs text-neutral-500 mt-0.5">{role.description}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <code className="text-xs bg-neutral-100 border border-neutral-900/[0.06] px-2 py-0.5 rounded-md font-mono text-neutral-700">
                            {role.slug}
                          </code>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-xs text-neutral-700 tabular-nums">
                          {role.permissions?.length ?? 0}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-xs text-neutral-700 tabular-nums">
                          {role.users?.length ?? 0}
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-xs border ${
                              role.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-600/15"
                                : "bg-neutral-100 text-neutral-600 border-neutral-900/[0.08]"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                role.is_active ? "bg-emerald-600" : "bg-neutral-400"
                              }`}
                            />
                            {role.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingRole(role)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Edit role"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            {role.slug !== "administrator" && role.slug !== "owner" && (
                              <button
                                type="button"
                                disabled={deletingRoleId === role.id}
                                onClick={() => void handleDeleteRole(role)}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150 disabled:opacity-40"
                                title="Delete role"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-neutral-500">
                        No roles found matching your query
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === "permissions" && (
          <div className="space-y-6">
            {permissionsLoading ? (
              <div className="p-10 text-center text-sm text-neutral-500 bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs">
                Loading permissions catalog
              </div>
            ) : Object.keys(groupedPermissions).length > 0 ? (
              Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module} className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs overflow-hidden">
                  <div className="px-5 py-3.5 bg-neutral-50/80 border-b border-neutral-900/[0.08] flex items-center justify-between">
                    <h3 className="text-sm font-medium text-neutral-900">
                      {module}
                    </h3>
                    <span className="text-xs font-mono text-neutral-500 tabular-nums">
                      {perms.length} capabilities
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-900/[0.08] text-xs font-medium text-neutral-500">
                          <th className="py-3 px-5">Capability</th>
                          <th className="py-3 px-5">Identifier</th>
                          <th className="py-3 px-5">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                        {perms.map((perm) => (
                          <tr
                            key={perm.id}
                            onClick={() => setViewingPermission(perm)}
                            className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 cursor-pointer transition-colors duration-150"
                          >
                            <td className="py-3.5 px-5 font-medium text-neutral-900">{perm.name}</td>
                            <td className="py-3.5 px-5">
                              <code className="text-xs bg-neutral-100 border border-neutral-900/[0.06] px-2 py-0.5 rounded-md font-mono text-neutral-700">
                                {perm.slug}
                              </code>
                            </td>
                            <td className="py-3.5 px-5 text-sm text-neutral-500">{perm.description || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-neutral-500 bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs">
                No permissions registered yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role SlideOvers */}
      {showCreateRole && (
        <AdminRoleSlideOver
          onClose={() => setShowCreateRole(false)}
          onSaved={() => {
            setShowCreateRole(false);
            setListKey((k) => k + 1);
          }}
        />
      )}
      {editingRole !== false && (
        <AdminRoleSlideOver
          role={typeof editingRole === "object" ? editingRole : null}
          onClose={() => setEditingRole(false)}
          onSaved={() => {
            setEditingRole(false);
            setListKey((k) => k + 1);
          }}
        />
      )}

      {/* Permission SlideOvers */}
      {viewingPermission && (
        <AdminPermissionSlideOver
          permission={viewingPermission}
          onClose={() => setViewingPermission(null)}
        />
      )}
    </PortalLayout>
  );
}
