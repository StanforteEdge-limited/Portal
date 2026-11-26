import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Edit3,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  BadgeCheck,
  Globe,
  Settings,
  RefreshCw,
  Heart,
  CheckCircle2,
} from "lucide-react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { humanize, roleLabel, sortRoles, userDisplayName } from "@stanforte/shared";
import { useCachedQuery } from "@/shared/lib/core";
import { useAuth } from "@/shared/context/AuthProvider";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { formatDisplayDateLocalized } from "@/shared/lib/localization";
import ProfileEditorSlideOver from "./ProfileEditorSlideOver";

export default function ProfilePage() {
  const { user } = useAuth();
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "orgs" | "roles">("personal");

  const {
    data: profile,
    loading,
    error,
    refetch,
  } = useCachedQuery("workspace:profile", () => getWorkspaceProfile(), {
    ttlMs: 1000 * 60,
    storage: "memory",
  });

  const organizations = useMemo(() => profile?.organizations ?? [], [profile]);
  const primaryOrg = useMemo(() => organizations.find((o) => o.is_primary) || organizations[0], [organizations]);
  const groups = useMemo(
    () => profile?.groups ?? [...(profile?.teams ?? []), ...(profile?.projects ?? [])],
    [profile]
  );

  const sortedRoles = useMemo(
    () =>
      sortRoles(
        Array.from(
          new Set(
            (user?.roles ?? [])
              .map((role) => String(role).trim().toLowerCase())
              .filter(Boolean)
          )
        )
      ),
    [user?.roles]
  );

  const primaryRole = sortedRoles[0] ? roleLabel(sortedRoles[0]) : "Staff";
  const extraRoles = sortedRoles.slice(1).map(roleLabel);

  const managerName = useMemo(() => {
    const mgr = profile?.employee_profile?.manager;
    if (!mgr) return "—";
    return (
      `${mgr.first_name ?? ""} ${mgr.last_name ?? ""}`.trim() ||
      mgr.email ||
      "—"
    );
  }, [profile?.employee_profile?.manager]);

  const fullName =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    userDisplayName(user) ||
    "Staff Member";

  const initials =
    [profile?.first_name?.[0], profile?.last_name?.[0]].filter(Boolean).join("").toUpperCase() ||
    fullName.slice(0, 2).toUpperCase() ||
    "ST";

  return (
    <PortalLayout activeNav="Profile">
      <div className="space-y-6 w-full min-w-0">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="My Profile & Account"
          description="Manage your personal staff identity, contact information, assignments, and credentials."
          icon={User}
          iconColor="bg-neutral-100 text-neutral-700"
          actions={
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 shadow-xs transition hover:bg-neutral-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-neutral-400" : ""}`} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#e05d00] active:scale-[0.98] text-white font-medium text-xs shadow-sm transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>
          }
        />

        {/* Hero Profile Banner Card */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 shadow-sm overflow-hidden relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            {/* Avatar & Main Identity */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0a1128] text-white flex items-center justify-center font-semibold text-xl sm:text-2xl shrink-0 shadow-md border-2 border-orange-500/30">
                {initials}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
                    {fullName}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Active Staff</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 mt-1.5">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{profile?.email || user?.email || "—"}</span>
                  </span>

                  {profile?.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{profile.phone}</span>
                    </span>
                  )}

                  <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                    <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{profile?.employee_profile?.job_title?.trim() || primaryRole}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Quick Links */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <Link
                to="/account/settings"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-500" />
                <span>Security &amp; Password</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Executive KPI Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Card 1: Employee Code */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">
                Staff ID Code
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                <BadgeCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight text-neutral-900 font-mono">
                {profile?.employee_profile?.employee_code || "EMP-001"}
              </span>
              <span className="text-xs font-medium text-neutral-400">official</span>
            </div>
          </div>

          {/* Card 2: Employment Status */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">
                Employment Status
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight text-neutral-900 capitalize">
                {humanize(profile?.employee_profile?.employment_status || "Active")}
              </span>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Full-Time
              </span>
            </div>
          </div>

          {/* Card 3: Organization */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">
                Primary Organization
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-base font-semibold tracking-tight text-neutral-900 truncate">
                {primaryOrg?.name || "Acme Nigeria Ltd"}
              </span>
              {primaryOrg?.code && (
                <span className="text-xs font-semibold text-neutral-400">({primaryOrg.code})</span>
              )}
            </div>
          </div>

          {/* Card 4: Reporting Manager */}
          <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">
                Supervisor / Manager
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-base font-semibold tracking-tight text-neutral-900 truncate">
                {managerName}
              </span>
            </div>
          </div>
        </div>

        {/* Tabbed Profile Content */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white shadow-sm overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 border-b border-neutral-200/80 p-3 bg-neutral-50/75">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition flex items-center gap-2 ${
                activeTab === "personal"
                  ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/80"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <User className="w-3.5 h-3.5 text-[#C2410C]" />
              <span>Personal &amp; Contact Information</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("orgs")}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition flex items-center gap-2 ${
                activeTab === "orgs"
                  ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/80"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-neutral-700" />
              <span>Organizations &amp; Teams ({organizations.length + groups.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition flex items-center gap-2 ${
                activeTab === "roles"
                  ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/80"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
              <span>Roles &amp; Permissions ({sortedRoles.length})</span>
            </button>
          </div>

          {/* Tab 1: Personal & Contact Details */}
          {activeTab === "personal" && (
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-sm font-medium text-neutral-900">Personal Data Sheet</h3>
                  <p className="text-xs text-neutral-500">Contact, location, and demographic profile</p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C2410C] hover:text-[#ea580c] transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Details</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">First Name</span>
                  <span className="font-medium text-neutral-900 text-sm">{profile?.first_name || "—"}</span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">Last Name</span>
                  <span className="font-medium text-neutral-900 text-sm">{profile?.last_name || "—"}</span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">Email Address</span>
                  <span className="font-medium text-neutral-900 text-sm">{profile?.email || "—"}</span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">Phone Number</span>
                  <span className="font-medium text-neutral-900 text-sm">{profile?.phone || "—"}</span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">Date of Birth</span>
                  <span className="font-medium text-neutral-900 text-sm">
                    {profile?.date_of_birth ? formatDisplayDateLocalized(profile.date_of_birth) : "—"}
                  </span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">Gender</span>
                  <span className="font-medium text-neutral-900 text-sm capitalize">{profile?.gender || "—"}</span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">Marital Status</span>
                  <span className="font-medium text-neutral-900 text-sm capitalize">{profile?.marital_status || "—"}</span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">Nationality</span>
                  <span className="font-medium text-neutral-900 text-sm">{profile?.nationality || "Nigerian"}</span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">State &amp; LGA of Origin</span>
                  <span className="font-medium text-neutral-900 text-sm">
                    {profile?.state || "—"} {profile?.lga ? `(${profile.lga})` : ""}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="block font-semibold text-neutral-400 mb-1">Residential Address</span>
                  <span className="font-medium text-neutral-900 text-sm">{profile?.address || "—"}</span>
                </div>

                <div>
                  <span className="block font-semibold text-neutral-400 mb-1">Occupation / Specialty</span>
                  <span className="font-medium text-neutral-900 text-sm">{profile?.occupation || "—"}</span>
                </div>

                {profile?.bio && (
                  <div className="sm:col-span-3 pt-3 border-t border-neutral-100">
                    <span className="block font-semibold text-neutral-400 mb-1">Professional Summary / Bio</span>
                    <p className="font-normal text-neutral-700 leading-relaxed text-xs">{profile.bio}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Organizations & Groups */}
          {activeTab === "orgs" && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-neutral-900 mb-1">Assigned Organizations</h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Entities and subsidiaries in which your account has active membership.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className="p-4 rounded-xl border border-neutral-200/80 bg-neutral-50/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-medium text-neutral-700">
                          <Building2 className="w-4 h-4 text-neutral-600" />
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900 text-xs">{org.name}</div>
                          <div className="text-xs text-neutral-500">{org.code || "Branch Unit"}</div>
                        </div>
                      </div>
                      {org.is_primary && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-[#C2410C] border border-orange-200/60">
                          Primary Entity
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100">
                <h3 className="text-sm font-medium text-neutral-900 mb-1">Teams &amp; Workgroups</h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Cross-functional teams, project boards, and department circles.
                </p>

                {groups.length === 0 ? (
                  <div className="p-8 text-center text-xs text-neutral-400 border border-dashed rounded-xl">
                    No explicit workgroups assigned.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="p-4 rounded-xl border border-neutral-200/80 bg-white flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-neutral-900 text-xs">{group.name}</div>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {humanize(group.type)} &bull; {humanize(group.role)}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-600">
                          {humanize(group.role || "Member")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Roles & Permissions */}
          {activeTab === "roles" && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-neutral-900 mb-1">System Roles &amp; Access Scope</h3>
                <p className="text-xs text-neutral-500 mb-4">
                  Security roles controlling permissions across workspaces, HR records, and financial ledger.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {sortedRoles.map((role) => (
                    <div
                      key={role}
                      className="p-4 rounded-xl border border-neutral-200/80 bg-white flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-700 flex items-center justify-center font-medium">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900 text-xs">{roleLabel(role)}</div>
                          <div className="text-xs text-neutral-400 font-mono">role:{role}</div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        Granted
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel for Profile Editing */}
      <ProfileEditorSlideOver
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        profile={profile}
        onSaved={() => {
          void refetch();
        }}
      />
    </PortalLayout>
  );
}
