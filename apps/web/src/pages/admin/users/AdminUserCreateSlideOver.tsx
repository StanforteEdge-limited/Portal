import { SelectBox } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useToast } from "@/shared";
import {
  SlideOver,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared/components/ui/SlideOver";
import { adminUsersApi, resourceApi } from "@/shared/lib/core";
import type { RoleOption } from "@stanforte/shared";
import type { OrganizationItem } from "@/shared";
import { User, Building2, Shield, Mail, Check, X } from "lucide-react";

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
      if (orgData.length > 0 && !organizationId) {
        setOrganizationId(String(orgData[0].id));
      }
    });
  }, []);

  function toggleRole(slug: string) {
    setSelectedRoles((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim()) {
      showToast("Please enter a valid work email address.", "error");
      return;
    }
    if (!organizationId) {
      showToast("Please select a primary organization entity.", "error");
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
      showToast(
        sendInvite
          ? `User created and activation invite sent to ${user.email}.`
          : `User account created for ${user.email}.`,
        "success",
      );
      onCreated();
    } catch (err: any) {
      showToast(err?.message || "Failed to create user account.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver isOpen onClose={onClose} size="lg">
      <SlideOverHeader
        title="Onboard Staff & User"
        subtitle="Provision employee identity, assign primary corporate entity, and set initial access roles."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
        <SlideOverContent className="space-y-6 p-6">
          {/* Section 1: User Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <User className="h-4 w-4 text-[#ff6900]" />
              Staff Identity & Details
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Work Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@stanforteedge.com"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g., Daniel"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g., Owonikoko"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Classification
              </label>
              <SelectBox
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              >
                <option value="staff">Staff / Full-time Employee</option>
                <option value="vendor">Vendor / External Partner</option>
                <option value="client">Client / Customer</option>
                <option value="board_member">Board Member / Advisor</option>
              </SelectBox>
            </div>
          </div>

          {/* Section 2: Organization Entity */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-blue-600" />
              Primary Legal Organization
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Organization <span className="text-rose-500">*</span>
              </label>
              <SelectBox
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              >
                <option value="">Select legal organization...</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} {org.code ? `(${org.code})` : ""}
                  </option>
                ))}
              </SelectBox>
              <p className="text-[11px] text-slate-400 mt-1">
                Establishes the default cost center, tenant permissions, and reporting lines.
              </p>
            </div>
          </div>

          {/* Section 3: Granular Roles */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Shield className="h-4 w-4 text-purple-600" />
              Role & Capability Assignment
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {roles.map((r) => (
                <label
                  key={r.slug}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r.slug)}
                    onChange={() => toggleRole(r.slug)}
                    className="w-4 h-4 rounded text-[#ff6900] border-slate-300 focus:ring-[#ff6900]"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block truncate">{r.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{r.slug}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Section 4: Invite & Activation */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Mail className="h-4 w-4 text-emerald-600" />
              Activation & Onboarding Invitation
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50/40 cursor-pointer">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#ff6900] border-slate-300 focus:ring-[#ff6900]"
              />
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  Send welcome email invitation immediately
                </span>
                <span className="text-[11px] text-emerald-800/80">
                  The user will receive a secure token to set their password and sign in.
                </span>
              </div>
            </label>
          </div>
        </SlideOverContent>

        <SlideOverFooter className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white font-bold text-xs shadow-sm shadow-orange-500/20 transition flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>{sendInvite ? "Onboard & Send Invite" : "Create User Account"}</span>
          </button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
