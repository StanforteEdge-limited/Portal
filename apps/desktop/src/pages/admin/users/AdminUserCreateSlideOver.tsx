import { useEffect, useState } from "react";
import {
  Button,
  SectionCard,
  SelectField,
  TextField,
  useToast,
} from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { adminUsersApi, resourceApi } from "@/shared/lib/core";
import type { RoleOption } from "@stanforte/shared";
import type { OrganizationItem } from "@/shared";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function AdminUserCreateSlideOver({ onClose, onCreated }: Props) {
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [type, setType] = useState("staff");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["staff"]);
  const [organizationId, setOrganizationId] = useState("");
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);

  useEffect(() => {
    Promise.all([
      adminUsersApi.listRoleOptions().catch(() => []),
      resourceApi.listOrganizations().catch(() => []),
    ]).then(([roleData, orgData]) => {
      setRoles(roleData);
      setOrganizations(orgData);
    });
  }, []);

  function toggleRole(slug: string) {
    setSelectedRoles((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function handleSubmit() {
    if (!email.trim()) {
      showToast({ tone: "warning", title: "Email required", message: "Please enter a valid email address." });
      return;
    }
    if (!organizationId) {
      showToast({ tone: "warning", title: "Organization required", message: "Please select an organization for this user." });
      return;
    }
    try {
      setSaving(true);
      const user = await adminUsersApi.createUser({
        email: email.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        type,
        status: "pending",
        organization_id: organizationId,
      });
      if (selectedRoles.length > 0) {
        await adminUsersApi.setUserRoles(user.id, selectedRoles);
      }
      if (sendInvite) {
        await adminUsersApi.sendUserInvite(user.id);
      }
      showToast({
        tone: "success",
        title: "User created",
        message: sendInvite
          ? `Invite sent to ${user.email}.`
          : `${user.email} created. Send invite when ready.`,
      });
      onCreated();
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Create failed",
        message: err instanceof Error ? err.message : "Unable to create user.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver open={true} onClose={onClose} size="lg">
      <SlideOverHeader
        title="Add User"
        subtitle="New User"
        onClose={onClose}
      />
      <SlideOverContent>
        <SectionCard title="Identity">
          <div className="grid gap-4">
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@organization.com"
            />
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
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Organization">
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
          <p className="mt-2 text-xs text-slate-500">
            Every user must belong to at least one organization. You can add more organizations later.
          </p>
        </SectionCard>

        <SectionCard title="Access">
          <div className="grid gap-4">
            <SelectField
              label="User Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="staff">Staff / Employee</option>
              <option value="vendor">Vendor</option>
              <option value="client">Client</option>
              <option value="board_member">Board Member</option>
            </SelectField>

            <div className="space-y-3">
              <p className="field-label">Roles</p>
              <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {roles.map((r) => (
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
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Invite">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">
              Send invitation email immediately
            </span>
          </label>
          <p className="mt-2 text-xs text-slate-500">
            The user will receive a link to set their password. If unchecked, you
            can send the invite later from their profile.
          </p>
          {type === "staff" ? (
            <p className="mt-3 rounded-2xl bg-brand-50 px-4 py-3 text-xs text-brand-900">
              A draft employee profile will be created in HR for HR to complete.
            </p>
          ) : null}
        </SectionCard>
      </SlideOverContent>
      <SlideOverFooter>
        <Button onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? "Creating…" : "Create User"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </SlideOverFooter>
    </SlideOver>
  );
}