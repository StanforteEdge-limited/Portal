import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Chip,
  Icon,
  PageHeader,
  SectionCard,
  SelectField,
  StatCard,
  TextField,
  useToast,
} from "@/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { adminUsersApi, resourceApi, useCachedQuery } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import type { AdminUserRole, RoleOption } from "@stanforte/shared";
import type { OrganizationItem } from "@/shared";

const statusVariant: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  pending: "warning",
  suspended: "danger",
};

const typeLabel: Record<string, string> = {
  staff: "Staff",
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

  const { data: adminUser, loading: userLoading, error: userError } = useCachedQuery(
    `admin:users:${id ?? ""}`,
    () => adminUsersApi.getUser(id!),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const { data: rolesData, loading: rolesLoading, error: rolesError } = useCachedQuery(
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

  const userName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.email ||
    "Admin";

  const displayName =
    [adminUser?.first_name, adminUser?.last_name].filter(Boolean).join(" ") ||
    adminUser?.email ||
    "-";

  async function handleSaveInfo() {
    try {
      setInfoSaving(true);
      await adminUsersApi.updateUser(id!, {
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        type: type,
        organization_id: organizationId || undefined,
      });
      showToast({ tone: "success", title: "Saved", message: "User details updated." });
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save." });
    } finally {
      setInfoSaving(false);
    }
  }

  function toggleRole(slug: string) {
    setSelectedRoles((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function handleSaveRole() {
    try {
      setRoleSaving(true);
      await adminUsersApi.setUserRoles(id!, selectedRoles);
      showToast({ tone: "success", title: "Roles updated", message: "User roles have been updated." });
    } catch (err) {
      showToast({ tone: "danger", title: "Role update failed", message: err instanceof Error ? err.message : "Unable to update role." });
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleSendInvite() {
    try {
      setInviteSending(true);
      await adminUsersApi.sendUserInvite(id!);
      showToast({ tone: "success", title: "Invite sent", message: `Invitation email sent to ${adminUser?.email}.` });
    } catch (err) {
      showToast({ tone: "danger", title: "Invite failed", message: err instanceof Error ? err.message : "Unable to send invite." });
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
      }
    } catch (err) {
      showToast({ tone: "danger", title: "Status update failed", message: err instanceof Error ? err.message : "Unable to update status." });
    } finally {
      setStatusSaving(false);
    }
  }

  const isAdmin =
    (profile?.employee_profile?.job_title || "").toLowerCase().includes("admin") ||
    (user?.roles || []).some((r) => r.toLowerCase().includes("admin")) ||
    (user?.email || "").toLowerCase().includes("admin") ||
    (profile?.groups ?? []).some((g) => g.role === "admin" || g.name.toLowerCase().includes("admin"));

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="admin-users"
      user={{
        name: userName,
        role: profile?.employee_profile?.job_title || "Admin",
      }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Administration" },
          { label: "Users", path: "/admin/users" },
          { label: displayName },
        ]}
        title={displayName}
        description={adminUser?.email ?? ""}
      />

      {userLoading ? (
        <div className="text-sm text-slate-500">Loading user...</div>
      ) : userError ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 text-sm text-danger">
          {(userError as any)?.message || String(userError)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {/* Identity */}
            <SectionCard title="Identity">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <TextField
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                <TextField label="Email" value={adminUser?.email ?? ""} readOnly />
                <SelectField
                  label="Primary Organization"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                >
                  <option value="">Select organization...</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} {org.code ? `(${org.code})` : ""}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="staff">Staff / Employee</option>
                  <option value="vendor">Vendor</option>
                  <option value="client">Client</option>
                  <option value="board_member">Board Member</option>
                </SelectField>
              </div>
              <Button
                className="mt-4"
                onClick={() => void handleSaveInfo()}
                disabled={infoSaving}
              >
                {infoSaving ? "Saving..." : "Save Details"}
              </Button>
            </SectionCard>

            {/* Roles */}
            <SectionCard title="Roles">
              {rolesLoading ? (
                <div className="text-sm text-slate-500">Loading roles...</div>
              ) : (
                <>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {roleOptions.map((r) => (
                      <label key={r.slug} className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(r.slug)}
                          onChange={() => toggleRole(r.slug)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-900 focus:ring-brand-900/10"
                        />
                        <span className="text-sm text-slate-700">{r.name}</span>
                      </label>
                    ))}
                  </div>
                  <Button
                    className="mt-6"
                    onClick={() => void handleSaveRole()}
                    disabled={roleSaving}
                  >
                    {roleSaving ? "Saving..." : "Update Roles"}
                  </Button>
                </>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6 lg:col-span-4">
            {/* Status card */}
            <SectionCard title="Account Status">
              <div className="mb-4">
                <Chip variant={statusVariant[adminUser?.status ?? ""] ?? "neutral"}>
                  {adminUser?.status ?? "-"}
                </Chip>
              </div>
              <div className="flex flex-col gap-2">
                {adminUser?.status !== "active" && adminUser?.status !== "deleted" ? (
                  <Button
                    onClick={() => void handleStatusChange("active")}
                    disabled={statusSaving}
                  >
                    Activate
                  </Button>
                ) : null}
                {adminUser?.status === "active" ? (
                  <Button
                    variant="secondary"
                    className="text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100"
                    onClick={() => void handleStatusChange("suspended")}
                    disabled={statusSaving}
                  >
                    Suspend
                  </Button>
                ) : null}
                {isAdmin && adminUser?.status !== "deleted" ? (
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
                        void handleStatusChange("deleted");
                      }
                    }}
                    disabled={statusSaving}
                  >
                    Delete User
                  </Button>
                ) : null}
              </div>
            </SectionCard>

            {/* Invite */}
            <SectionCard title="Invitation">
              <p className="mb-4 text-sm text-slate-600">
                {adminUser?.status === "pending"
                  ? "This user has not accepted their invite yet."
                  : "Resend if the user needs a new login link."}
              </p>
              <Button
                variant="secondary"
                onClick={() => void handleSendInvite()}
                disabled={inviteSending}
              >
                <Icon name="mail" className="mr-2 text-[18px]" />
                {inviteSending ? "Sending..." : "Send / Resend Invite"}
              </Button>
            </SectionCard>

            {/* Link to HR profile for staff */}
            {adminUser?.type === "staff" ? (
              <SectionCard title="Employee Profile">
                <p className="mb-3 text-sm text-slate-600">
                  This user has a staff account. HR can complete their employee
                  profile.
                </p>
                <Link to={`/hr/employees/${adminUser?.id}`}>
                  <Button variant="ghost">
                    <Icon name="person" className="mr-2 text-[18px]" />
                    View in HR
                  </Button>
                </Link>
              </SectionCard>
            ) : null}
          </div>
        </div>
      )}
    </AppShell>
  );
}
