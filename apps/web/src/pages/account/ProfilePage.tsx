import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  SectionCard,
  SelectField,
  StatCard,
  TextAreaField,
  TextField,
} from "@/shared";
import { humanize, roleLabel, sortRoles, userDisplayName } from "@stanforte/shared";
import { useCachedQuery } from "@/shared/lib/core";
import { useAuth } from "@/shared/context/AuthProvider";
import { getWorkspaceProfile, updateWorkspaceProfile } from "@/shared/api/workspace-api";
import { AccountShellPage } from "./page-helpers";

export default function ProfilePage() {
  const { user } = useAuth();
  const {
    data: profile,
    loading,
    error,
    refetch,
  } = useCachedQuery("workspace:profile", () => getWorkspaceProfile(), {
    ttlMs: 1000 * 60,
    storage: "memory",
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    date_of_birth: "",
    gender: "",
    nationality: "",
    state: "",
    lga: "",
    marital_status: "",
    occupation: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      phone: profile.phone || "",
      address: profile.address || "",
      date_of_birth: profile.date_of_birth || "",
      gender: profile.gender || "",
      nationality: profile.nationality || "",
      state: profile.state || "",
      lga: profile.lga || "",
      marital_status: profile.marital_status || "",
      occupation: profile.occupation || "",
      bio: profile.bio || "",
    });
  }, [profile]);

  async function saveProfile() {
    try {
      setSaving(true);
      setNotice(null);
      await updateWorkspaceProfile({
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender.trim() || undefined,
        nationality: form.nationality.trim() || undefined,
        state: form.state.trim() || undefined,
        lga: form.lga.trim() || undefined,
        marital_status: form.marital_status.trim() || undefined,
        occupation: form.occupation.trim() || undefined,
        bio: form.bio.trim() || undefined,
      });
      await refetch();
      setNotice("Profile updated successfully.");
    } catch (updateError) {
      setNotice(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  const organizations = profile?.organizations ?? [];
  const groups = profile?.groups ?? [
    ...(profile?.teams ?? []),
    ...(profile?.projects ?? []),
  ];
  const sortedRoles = sortRoles(
    Array.from(
      new Set(
        (user?.roles ?? [])
          .map((role) => String(role).trim().toLowerCase())
          .filter(Boolean),
      ),
    ),
  );
  const primaryRole = sortedRoles[0] ? roleLabel(sortedRoles[0]) : "Staff";
  const extraRoles = sortedRoles.slice(1).map(roleLabel);
  const managerName = profile?.employee_profile?.manager
    ? `${profile.employee_profile.manager.first_name ?? ""} ${profile.employee_profile.manager.last_name ?? ""}`.trim() ||
    profile.employee_profile.manager.email ||
    "-"
    : "-";
  const fullName =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    userDisplayName(user);

  return (
    <AccountShellPage
      activeLabel="Profile"
      eyebrow=""
      breadcrumbs={[
        { label: "Home", path: "/" },
        { label: "Profile" },
      ]}
      title="Profile"
      description="Review and update your staff identity, organizations, and account details."
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {loading ? (
            <div className="text-sm text-slate-500">Loading profile...</div>
          ) : null}
          {error ? <div className="text-sm text-danger">{error}</div> : null}
          {notice ? (
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {notice}
            </div>
          ) : null}

          <SectionCard title="Overview">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-900 text-lg font-semibold text-white">
                {fullName.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="text-lg font-semibold text-slate-950">
                  {fullName}
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">Role:</span>
                    <span>{primaryRole}</span>
                    {extraRoles.length ? (
                      <Chip variant="neutral">
                        +{extraRoles.length} other
                        {extraRoles.length > 1 ? "s" : ""}
                      </Chip>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">Title:</span>
                    <span>
                      {profile?.employee_profile?.job_title?.trim() || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <StatCard
                label="Employee Code"
                value={profile?.employee_profile?.employee_code || "-"}
                tone="neutral"
              />
              <StatCard
                label="Onboarding"
                value={humanize(profile?.onboarding_progress?.status)}
                tone="warning"
              />
              <StatCard
                label="Employment"
                value={humanize(profile?.employee_profile?.employment_status)}
                tone="neutral"
              />
              <StatCard label="Manager" value={managerName} tone="neutral" />
            </div>
          </SectionCard>

          <SectionCard title="Edit Profile">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="First Name"
                value={form.first_name}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    first_name: event.target.value,
                  }))
                }
              />
              <TextField
                label="Last Name"
                value={form.last_name}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    last_name: event.target.value,
                  }))
                }
              />
              <TextField
                label="Phone"
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
              <TextField label="Email" value={profile?.email || ""} readOnly />
            </div>
            <div className="mt-4">
              <TextAreaField
                label="Address"
                value={form.address}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                }
              />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextField
                label="Date of Birth"
                type="date"
                value={form.date_of_birth}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date_of_birth: event.target.value }))
                }
              />
              <SelectField
                label="Gender"
                value={form.gender}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, gender: event.target.value }))
                }
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </SelectField>
              <TextField
                label="Nationality"
                value={form.nationality}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, nationality: event.target.value }))
                }
              />
              <TextField
                label="State"
                value={form.state}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, state: event.target.value }))
                }
              />
              <TextField
                label="LGA"
                value={form.lga}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lga: event.target.value }))
                }
              />
              <SelectField
                label="Marital Status"
                value={form.marital_status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, marital_status: event.target.value }))
                }
              >
                <option value="">Prefer not to say</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </SelectField>
              <TextField
                label="Occupation"
                value={form.occupation}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, occupation: event.target.value }))
                }
              />
            </div>
            <div className="mt-4">
              <TextAreaField
                label="Bio"
                value={form.bio}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, bio: event.target.value }))
                }
              />
            </div>
            <Button
              className="mt-4"
              onClick={() => void saveProfile()}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <SectionCard title="Organizations">
            <div className="space-y-2">
              {organizations.length ? (
                organizations.map((org) => (
                  <div
                    key={org.id}
                    className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {org.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {org.code}
                      {org.is_primary ? " • Primary" : ""}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">
                  No organizations assigned.
                </div>
              )}
            </div>
          </SectionCard>
          <SectionCard title="Groups & Roles">
            <div className="space-y-2">
              {groups.length ? (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {group.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {humanize(group.type)} • {humanize(group.role)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">
                  No groups assigned.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </AccountShellPage>
  );
}
