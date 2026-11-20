import { SelectBox } from "@/components/ui/select";
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
import { useToast, PageHeader } from "@/shared";
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
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12 w-full min-w-0">
        <PageHeader
          title={displayName}
          description={adminUser?.email ?? "Manage account profile, role assignments, and access lifecycle"}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {adminUser?.type === "staff" && (
                <Link
                  to={`/hr/employees/${adminUser?.id}`}
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-neutral-900/[0.10] bg-white text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors duration-150"
                >
                  <span>View in HR</span>
                  <ExternalLink className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                </Link>
              )}
              <Link
                to="/admin/users"
                className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-neutral-900/[0.10] bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors duration-150"
              >
                <ArrowLeft className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                <span>Back to users</span>
              </Link>
            </div>
          }
        />

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="p-5 rounded-2xl border border-neutral-900/[0.08] bg-white shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Account status</p>
            <p className={`text-[28px] leading-none font-medium capitalize font-headline ${adminUser?.status === "pending" ? "text-[#c2410c]" : "text-neutral-900"}`}>
              {adminUser?.status ?? "pending"}
            </p>
            <p className="text-xs text-neutral-500">
              {adminUser?.status === "active" ? "Verified account" : "Action required"}
            </p>
          </article>

          <article className="p-5 rounded-2xl border border-neutral-900/[0.08] bg-white shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Active roles</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {selectedRoles.length}
            </p>
            <p className="text-xs text-neutral-500">
              Assigned role{selectedRoles.length === 1 ? "" : "s"}
            </p>
          </article>

          <article className="p-5 rounded-2xl border border-neutral-900/[0.08] bg-white shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Classification</p>
            <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline capitalize truncate">
              {typeLabel[type] ?? type}
            </p>
            <p className="text-xs text-neutral-500">Directory account type</p>
          </article>

          <article className="p-5 rounded-2xl border border-neutral-900/[0.08] bg-white shadow-xs space-y-2">
            <p className="text-xs text-neutral-500">Primary organization</p>
            <p className="text-xl leading-snug font-medium text-neutral-900 font-headline truncate">
              {primaryOrg?.name ?? "None assigned"}
            </p>
            <p className="text-xs text-neutral-500 font-mono">
              {primaryOrg?.code ? primaryOrg.code : "Unscoped"}
            </p>
          </article>
        </div>

        {/* User Loading / Error */}
        {userLoading && (
          <div className="rounded-2xl border border-neutral-900/[0.08] bg-white p-10 text-center text-sm text-neutral-500 shadow-xs">
            Loading user profile
          </div>
        )}

        {userError && (
          <div className="rounded-xl border border-rose-600/15 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {(userError as any)?.message || String(userError)}
          </div>
        )}

        {/* Main 2-Column Full-Width Grid */}
        {!userLoading && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left 8 Cols: Identity & Roles Form */}
            <div className="space-y-6 lg:col-span-8">
              {/* Identity Card */}
              <div className="rounded-2xl border border-neutral-900/[0.08] bg-white p-6 shadow-xs">
                <h3 className="text-base font-medium text-neutral-900 font-headline mb-1">Identity and profile</h3>
                <p className="text-xs text-neutral-500 mb-5">
                  Update basic personal information and organizational assignment
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      First name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Folake"
                      className="w-full h-9 rounded-lg border border-neutral-900/[0.12] bg-white px-3 text-sm text-neutral-900 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Adeleke"
                      className="w-full h-9 rounded-lg border border-neutral-900/[0.12] bg-white px-3 text-sm text-neutral-900 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={adminUser?.email ?? ""}
                      readOnly
                      className="w-full h-9 rounded-lg border border-neutral-900/[0.08] bg-neutral-50 px-3 text-sm text-neutral-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      Primary organization
                    </label>
                    <SelectBox
                      value={organizationId}
                      onChange={(e) => setOrganizationId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-neutral-900/[0.12] bg-white px-3 text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    >
                      <option value="">Select organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} {org.code ? `(${org.code})` : ""}
                        </option>
                      ))}
                    </SelectBox>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      User classification
                    </label>
                    <SelectBox
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full h-9 rounded-lg border border-neutral-900/[0.12] bg-white px-3 text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    >
                      <option value="staff">Staff / Employee</option>
                      <option value="vendor">Vendor</option>
                      <option value="client">Client</option>
                      <option value="board_member">Board member</option>
                    </SelectBox>
                  </div>
                </div>

                <div className="mt-6 flex justify-start">
                  <button
                    type="button"
                    onClick={() => void handleSaveInfo()}
                    disabled={infoSaving}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] text-sm font-medium text-white transition-colors duration-150 hover:bg-[#ea580c] active:scale-[0.98] disabled:opacity-50"
                  >
                    {infoSaving ? "Saving" : "Save details"}
                  </button>
                </div>
              </div>

              {/* Roles Matrix Card */}
              <div className="rounded-2xl border border-neutral-900/[0.08] bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-medium text-neutral-900 font-headline">Security roles and permissions</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Select all security and functional access roles granted to this account
                    </p>
                  </div>
                  <span className="text-xs font-mono text-neutral-500 tabular-nums">
                    {selectedRoles.length} selected
                  </span>
                </div>

                {rolesLoading ? (
                  <div className="py-8 text-center text-sm text-neutral-500">Loading roles</div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {roleOptions.map((r) => {
                        const isChecked = selectedRoles.includes(r.slug);
                        return (
                          <label
                            key={r.slug}
                            onClick={() => toggleRole(r.slug)}
                            className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-colors duration-150 ${isChecked
                                ? "border-[#ff6900] bg-orange-50/30"
                                : "border-neutral-900/[0.10] bg-white hover:bg-neutral-50"
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => { }}
                                className="h-4 w-4 rounded border-neutral-300 text-[#ff6900] focus:ring-[#ff6900]"
                              />
                              <span className="text-sm font-medium text-neutral-900 truncate">
                                {r.name}
                              </span>
                            </div>
                            {isChecked && (
                              <CheckCircle2 className="h-4 w-4 text-[#c2410c] shrink-0 ml-2" strokeWidth={1.5} />
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
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-sm font-medium text-white transition-colors duration-150 active:scale-[0.98] disabled:opacity-50"
                      >
                        {roleSaving ? "Updating" : "Update roles"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Status & Invitations */}
            <div className="space-y-6 lg:col-span-4">
              {/* Account Status Card */}
              <div className="rounded-2xl border border-neutral-900/[0.08] bg-white p-6 shadow-xs">
                <h3 className="text-base font-medium text-neutral-900 font-headline mb-1">Account lifecycle</h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Manage active state, account suspension, or permanent deletion
                </p>

                <div className="mb-5 flex items-center justify-between rounded-xl bg-neutral-50 px-3.5 py-2.5 border border-neutral-900/[0.06]">
                  <span className="text-xs font-medium text-neutral-600">Current status</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium capitalize border ${adminUser?.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-600/15"
                        : adminUser?.status === "suspended"
                          ? "bg-rose-50 text-rose-700 border-rose-600/15"
                          : "bg-amber-50 text-amber-800 border-amber-600/15"
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${adminUser?.status === "active"
                          ? "bg-emerald-600"
                          : adminUser?.status === "suspended"
                            ? "bg-rose-600"
                            : "bg-amber-600"
                        }`}
                    />
                    {adminUser?.status ?? "pending"}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {adminUser?.status !== "active" && adminUser?.status !== "deleted" && (
                    <button
                      type="button"
                      onClick={() => void handleStatusChange("active")}
                      disabled={statusSaving}
                      className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium text-white transition-colors duration-150 disabled:opacity-50"
                    >
                      <UserCheck className="h-4 w-4" strokeWidth={1.5} />
                      <span>{statusSaving ? "Activating" : "Activate account"}</span>
                    </button>
                  )}

                  {adminUser?.status === "active" && (
                    <button
                      type="button"
                      onClick={() => void handleStatusChange("suspended")}
                      disabled={statusSaving}
                      className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-rose-600/20 bg-rose-50 hover:bg-rose-100 text-sm font-medium text-rose-700 transition-colors duration-150 disabled:opacity-50"
                    >
                      <UserX className="h-4 w-4" strokeWidth={1.5} />
                      <span>{statusSaving ? "Suspending" : "Suspend account"}</span>
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
                      className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-rose-50 text-sm font-medium text-rose-700 transition-colors duration-150 disabled:opacity-50"
                    >
                      <ShieldAlert className="h-4 w-4 text-rose-600" strokeWidth={1.5} />
                      <span>Delete user</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Invitation Card */}
              <div className="rounded-2xl border border-neutral-900/[0.08] bg-white p-6 shadow-xs">
                <h3 className="text-base font-medium text-neutral-900 font-headline mb-1">Access invitation</h3>
                <p className="text-xs text-neutral-500 mb-4">
                  {adminUser?.status === "pending"
                    ? "This user has not accepted their invite yet"
                    : "Send a fresh login and password setup link to this email"}
                </p>

                <button
                  type="button"
                  onClick={() => void handleSendInvite()}
                  disabled={inviteSending}
                  className="w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-neutral-50 text-sm font-medium text-neutral-900 transition-colors duration-150 active:scale-[0.98] disabled:opacity-50"
                >
                  <Send className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                  <span>{inviteSending ? "Sending link" : "Send invite"}</span>
                </button>
              </div>

              {/* HR Profile Quick Link */}
              {adminUser?.type === "staff" && (
                <div className="rounded-2xl border border-neutral-900/[0.08] bg-white p-6 shadow-xs">
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 text-neutral-500 mt-0.5 shrink-0" strokeWidth={1.5} />
                    <div>
                      <h4 className="text-sm font-medium text-neutral-900">Workforce record</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Manage employment contracts, leave policies, and manager relations in HR
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/hr/employees/${adminUser?.id}`}
                    className="mt-4 w-full h-9 inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-neutral-900/[0.10] text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors duration-150"
                  >
                    <span>Open in HR directory</span>
                    <ExternalLink className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
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
