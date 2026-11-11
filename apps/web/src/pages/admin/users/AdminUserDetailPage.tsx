import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Users,
  Shield,
  Building2,
  Mail,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Send,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { adminUsersApi, resourceApi, useCachedQuery } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { useToast } from "@/shared";
import type { AdminUserRole, RoleOption } from "@stanforte/shared";
import type { OrganizationItem } from "@/shared";

const typeLabel: Record<string, string> = {
  staff: "Staff / Employee",
  vendor: "Vendor",
  client: "Client",
  board_member: "Board Member",
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { data: profile } = useCachedQuery(
    "admin:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const { data: adminUser, loading: userLoading, error: userError, refetch: refetchUser } = useCachedQuery(
    `admin:users:${id ?? ""}`,
    () => adminUsersApi.getUser(id!),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const { data: rolesData, loading: rolesLoading, refetch: refetchRoles } = useCachedQuery(
    `admin:users:${id ?? ""}:roles`,
    () => adminUsersApi.getUserRoles(id!),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);

  // Edit form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [type, setType] = useState("staff");
  const [organizationId, setOrganizationId] = useState("");
  const [infoSaving, setInfoSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      adminUsersApi.listRoleOptions().catch(() => []),
      resourceApi.listOrganizations().catch(() => []),
    ]).then(([roleData, orgData]) => {
      setRoleOptions(roleData);
      setOrganizations(orgData);
    });
  }, []);

  useEffect(() => {
    if (adminUser) {
      setFirstName(adminUser.first_name ?? "");
      setLastName(adminUser.last_name ?? "");
      setType(adminUser.type ?? "staff");
      setOrganizationId((adminUser as any).primary_organization_id ?? "");
    }
  }, [adminUser]);

  useEffect(() => {
    const currentRoles: AdminUserRole[] = rolesData?.roles ?? [];
    setSelectedRoles(currentRoles.map((r) => r.slug));
  }, [rolesData]);

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    adminUser?.email ||
    "User Details";

  const initials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
    adminUser?.email?.[0]?.toUpperCase() ||
    "U";

  const primaryOrg = organizations.find((o) => o.id === organizationId);

  const isAdmin =
    (profile?.employee_profile?.job_title || "").toLowerCase().includes("admin") ||
    (user?.roles || []).some((r) => r.toLowerCase().includes("admin")) ||
    (user?.email || "").toLowerCase().includes("admin") ||
    (profile?.groups ?? []).some((g) => g.role === "admin" || g.name.toLowerCase().includes("admin"));

  function toggleRole(slug: string) {
    setSelectedRoles((prev) =>
      prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug],
    );
  }

  async function handleSaveRole() {
    try {
      setRoleSaving(true);
      await adminUsersApi.setUserRoles(id!, selectedRoles);
      await refetchRoles();
      showToast({ tone: "success", title: "Roles updated", message: "User roles have been saved." });
    } catch (err) {
      showToast({ tone: "danger", title: "Role update failed", message: err instanceof Error ? err.message : "Unable to save roles." });
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleSaveInfo() {
    try {
      setInfoSaving(true);
      await adminUsersApi.updateUser(id!, {
        first_name: firstName,
        last_name: lastName,
        type,
        primary_organization_id: organizationId || undefined,
      });
      await refetchUser();
      showToast({ tone: "success", title: "User updated", message: "User details saved successfully." });
    } catch (err) {
      showToast({ tone: "danger", title: "Update failed", message: err instanceof Error ? err.message : "Unable to save user details." });
    } finally {
      setInfoSaving(false);
    }
  }

  async function handleSendInvite() {
    try {
      setInviteSending(true);
      await adminUsersApi.sendUserInvite(id!);
      showToast({ tone: "success", title: "Invitation sent", message: "An invitation email has been dispatched." });
    } catch (err) {
      showToast({ tone: "danger", title: "Invite failed", message: err instanceof Error ? err.message : "Unable to send invitation." });
    } finally {
      setInviteSending(false);
    }
  }

  async function handleStatusChange(status: "active" | "suspended" | "deleted") {
    try {
      setStatusSaving(true);
      await adminUsersApi.updateUserStatus(id!, { status });
      showToast({ tone: "success", title: "Status updated", message: `User is now ${status}.` });
      if (status === "deleted") {
        navigate("/admin/users");
      } else {
        await refetchUser();
      }
    } catch (err) {
      showToast({ tone: "danger", title: "Status update failed", message: err instanceof Error ? err.message : "Unable to update status." });
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <PortalLayout activeNav="Employees">
      <div className="space-y-6 w-full min-w-0">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/admin/users" className="hover:text-slate-800 transition flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Administration</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <Link to="/admin/users" className="hover:text-slate-800 transition">
                Users
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-[#ff6900] font-bold truncate max-w-[200px]">
                {displayName}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              {displayName}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{adminUser?.email ?? ""}</p>
          </div>

          <div className="flex items-center gap-2.5">
            {adminUser?.type === "staff" && (
              <Link
                to={`/hr/employees/${adminUser?.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <span>View in HR</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Back to Users
            </Link>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Card 1: Account Status */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Account Status
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  adminUser?.status === "active"
                    ? "bg-emerald-50 text-emerald-600"
                    : adminUser?.status === "suspended"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {adminUser?.status === "active" ? (
                  <UserCheck className="w-4 h-4" />
                ) : (
                  <UserX className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-black capitalize tracking-tight text-slate-900">
                {adminUser?.status ?? "pending"}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  adminUser?.status === "active"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {adminUser?.status === "active" ? "Verified" : "Action Required"}
              </span>
            </div>
          </div>

          {/* Card 2: Roles Count */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Roles
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">
                {selectedRoles.length}
              </span>
              <span className="text-xs font-medium text-slate-500">
                assigned role{selectedRoles.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {/* Card 3: User Type */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Classification
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900 capitalize">
                {typeLabel[type] ?? type}
              </span>
            </div>
          </div>

          {/* Card 4: Primary Organization */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Primary Organization
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-base font-black tracking-tight text-slate-900 truncate">
                {primaryOrg?.name ?? "None Assigned"}
              </span>
              {primaryOrg?.code && (
                <span className="text-xs font-semibold text-slate-400">({primaryOrg.code})</span>
              )}
            </div>
          </div>
        </div>

        {/* User Loading / Error */}
        {userLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading user profile...
          </div>
        )}

        {userError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {(userError as any)?.message || String(userError)}
          </div>
        )}

        {/* Main 2-Column Full-Width Grid */}
        {!userLoading && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left 8 Cols: Identity & Roles Form */}
            <div className="space-y-6 lg:col-span-8">
              {/* Identity Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1">Identity &amp; Profile</h3>
                <p className="text-xs text-slate-500 mb-5">
                  Update basic personal information and organizational assignment.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Folake"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Adeleke"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={adminUser?.email ?? ""}
                      readOnly
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Primary Organization
                    </label>
                    <select
                      value={organizationId}
                      onChange={(e) => setOrganizationId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                    >
                      <option value="">Select organization...</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} {org.code ? `(${org.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      User Classification
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                    >
                      <option value="staff">Staff / Employee</option>
                      <option value="vendor">Vendor</option>
                      <option value="client">Client</option>
                      <option value="board_member">Board Member</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-start">
                  <button
                    type="button"
                    onClick={() => void handleSaveInfo()}
                    disabled={infoSaving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#ff6900] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-[#ea580c] active:scale-95 disabled:opacity-50"
                  >
                    {infoSaving ? "Saving details..." : "Save Details"}
                  </button>
                </div>
              </div>

              {/* Roles Matrix Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Security Roles &amp; Permissions</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select all security and functional access roles granted to this account.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedRoles.length} selected
                  </span>
                </div>

                {rolesLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading roles...</div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {roleOptions.map((r) => {
                        const isChecked = selectedRoles.includes(r.slug);
                        return (
                          <label
                            key={r.slug}
                            onClick={() => toggleRole(r.slug)}
                            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                              isChecked
                                ? "border-[#ff6900] bg-orange-50/20"
                                : "border-slate-200/80 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="h-4 w-4 rounded border-slate-300 text-[#ff6900] focus:ring-[#ff6900]"
                              />
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {r.name}
                              </span>
                            </div>
                            {isChecked && (
                              <CheckCircle2 className="w-4 h-4 text-[#ff6900] shrink-0 ml-2" />
                            )}
                          </label>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex justify-start">
                      <button
                        type="button"
                        onClick={() => void handleSaveRole()}
                        disabled={roleSaving}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0a1128] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#101b44] active:scale-95 disabled:opacity-50"
                      >
                        {roleSaving ? "Updating roles..." : "Update Roles"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Status & Invitations */}
            <div className="space-y-6 lg:col-span-4">
              {/* Account Status Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1">Account Lifecycle</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Manage active state, account suspension, or permanent deletion.
                </p>

                <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">Current Status</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      adminUser?.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : adminUser?.status === "suspended"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {adminUser?.status ?? "pending"}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {adminUser?.status !== "active" && adminUser?.status !== "deleted" && (
                    <button
                      type="button"
                      onClick={() => void handleStatusChange("active")}
                      disabled={statusSaving}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{statusSaving ? "Activating..." : "Activate Account"}</span>
                    </button>
                  )}

                  {adminUser?.status === "active" && (
                    <button
                      type="button"
                      onClick={() => void handleStatusChange("suspended")}
                      disabled={statusSaving}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100/70 disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>{statusSaving ? "Suspending..." : "Suspend Account"}</span>
                    </button>
                  )}

                  {isAdmin && adminUser?.status !== "deleted" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this user? This action cannot be undone."
                          )
                        ) {
                          void handleStatusChange("deleted");
                        }
                      }}
                      disabled={statusSaving}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      <span>Delete User</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Invitation Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1">Access Invitation</h3>
                <p className="text-xs text-slate-500 mb-4">
                  {adminUser?.status === "pending"
                    ? "This user has not accepted their invite yet."
                    : "Send a fresh magic login / password setup link to this email."}
                </p>

                <button
                  type="button"
                  onClick={() => void handleSendInvite()}
                  disabled={inviteSending}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#ff6900]" />
                  <span>{inviteSending ? "Sending link..." : "Send / Resend Invite"}</span>
                </button>
              </div>

              {/* HR Profile Quick Link */}
              {adminUser?.type === "staff" && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Workforce Record</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Manage employment contracts, leave policies, and manager relations in HR.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/hr/employees/${adminUser?.id}`}
                    className="mt-3.5 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-blue-200 py-2 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50 transition"
                  >
                    <span>Open in HR Directory</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
