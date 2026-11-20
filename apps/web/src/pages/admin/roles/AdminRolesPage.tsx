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
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Workforce Access & Roles"
          description="Define operational permissions, assign approval authority, and audit organizational privilege levels."
          icon={ShieldCheck}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            activeTab === "roles" ? (
              <button
                type="button"
                onClick={() => setShowCreateRole(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-medium shadow-sm transition active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Role</span>
              </button>
            ) : undefined
          }
        />

        {/* Toast */}
        {toastMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              toastMsg.tone === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {toastMsg.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Configured roles</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {roles.length}
            </p>
            <p className="text-xs text-neutral-500">System and workspace roles</p>
          </article>

          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Permissions catalog</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {permissions.length}
            </p>
            <p className="text-xs text-neutral-500">Granular module capabilities</p>
          </article>

          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Role assignments</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {totalAssignedUsers}
            </p>
            <p className="text-xs text-neutral-500">Active member bindings</p>
          </article>

          <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Access policy</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline">
              RBAC
            </p>
            <p className="text-xs text-neutral-500">Tenant-scoped enforcement</p>
          </article>
        </div>

        {/* Filter and Tab Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "roles"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Roles Directory ({roles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("permissions")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "permissions"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              <span>Permissions List ({permissions.length})</span>
            </button>
          </div>

          {activeTab === "roles" && (
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-semibold text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Roles Tab */}
        {activeTab === "roles" && (
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/75 text-neutral-500 font-medium border-b border-neutral-100">
                  <tr>
                    <th className="py-3.5 px-5">Role Name</th>
                    <th className="py-3.5 px-4">Slug Identifier</th>
                    <th className="py-3.5 px-4">Permissions</th>
                    <th className="py-3.5 px-4">Assigned Users</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {rolesLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        Loading roles...
                      </td>
                    </tr>
                  ) : roles.length > 0 ? (
                    roles.map((role) => (
                      <tr key={role.id} className="hover:bg-neutral-50/60 transition">
                        <td className="py-3.5 px-5">
                          <div className="font-medium text-neutral-900">{role.name}</div>
                          {role.description && (
                            <div className="text-xs text-neutral-400 mt-0.5">{role.description}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <code className="text-xs bg-neutral-100 px-2 py-0.5 rounded-md font-mono text-neutral-700">
                            {role.slug}
                          </code>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-neutral-700">
                          {role.permissions?.length ?? 0} privileges
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-neutral-700">
                          {role.users?.length ?? 0} members
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-xs ${
                              role.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                role.is_active ? "bg-emerald-500" : "bg-neutral-400"
                              }`}
                            />
                            {role.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingRole(role)}
                              className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 transition"
                              title="Edit Role"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {role.slug !== "administrator" && role.slug !== "owner" && (
                              <button
                                type="button"
                                disabled={deletingRoleId === role.id}
                                onClick={() => void handleDeleteRole(role)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition disabled:opacity-40"
                                title="Delete Role"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-neutral-400">
                        No roles found matching your query.
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
              <div className="p-8 text-center text-neutral-400 bg-white rounded-2xl border border-neutral-200">
                Loading permissions catalog...
              </div>
            ) : Object.keys(groupedPermissions).length > 0 ? (
              Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module} className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
                  <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
                    <h3 className="text-xs font-medium text-neutral-700">
                      {module}
                    </h3>
                    <span className="text-xs text-neutral-500 font-semibold">{perms.length} capabilities</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-neutral-400 font-medium border-b border-neutral-100">
                        <tr>
                          <th className="py-3 px-5">Capability</th>
                          <th className="py-3 px-4">Identifier Slug</th>
                          <th className="py-3 px-4">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-neutral-700">
                        {perms.map((perm) => (
                          <tr
                            key={perm.id}
                            onClick={() => setViewingPermission(perm)}
                            className="hover:bg-neutral-50/70 cursor-pointer transition"
                          >
                            <td className="py-3 px-5 font-medium text-neutral-900">{perm.name}</td>
                            <td className="py-3 px-4">
                              <code className="text-xs bg-neutral-100 px-2 py-0.5 rounded-md font-mono text-neutral-700">
                                {perm.slug}
                              </code>
                            </td>
                            <td className="py-3 px-4 text-neutral-500">{perm.description || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-neutral-400 bg-white rounded-2xl border border-neutral-200">
                No permissions registered yet.
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
