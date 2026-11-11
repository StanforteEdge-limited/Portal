import { useState, useEffect } from "react";
import { useToast } from "@/shared";
import {
  SlideOver,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared/components/ui/SlideOver";
import { resourceApi } from "@/shared/lib/core";
import type { TeamOption, OrganizationItem } from "@stanforte/shared";
import { Users, Building2, Check, X } from "lucide-react";

type Props = {
  group?: TeamOption | null;
  types?: { id: string; name: string; slug: string; description: string }[];
  onClose: () => void;
  onSaved: () => void;
};

export default function AdminGroupSlideOver({ group, types = [], onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);

  const [name, setName] = useState(group?.name || "");
  const [groupType, setGroupType] = useState(group?.groupType || "team");
  const [description, setDescription] = useState(group?.description || "");
  const [isActive, setIsActive] = useState(group?.isActive ?? true);
  const [primaryOrgId, setPrimaryOrgId] = useState(
    group?.organizationId || group?.organizationIds?.[0] || ""
  );
  const [orgIds, setOrgIds] = useState<string[]>(group?.organizationIds || []);

  useEffect(() => {
    async function loadOrgs() {
      setLoadingOrgs(true);
      try {
        const orgs = await resourceApi.listOrganizations();
        setOrganizations(orgs);
      } catch {
        setOrganizations([]);
      } finally {
        setLoadingOrgs(false);
      }
    }
    void loadOrgs();
  }, []);

  const toggleOrg = (orgId: string, checked: boolean) => {
    setOrgIds((prev) => {
      const next = checked ? [...prev, orgId] : prev.filter((id) => id !== orgId);
      if (!next.includes(primaryOrgId)) {
        setPrimaryOrgId(next[0] || "");
      }
      return next;
    });
  };

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a group name", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        group_type: groupType,
        is_active: isActive,
        primary_organization_id: primaryOrgId || undefined,
        organization_ids: orgIds,
        organization_id: primaryOrgId || undefined,
      };

      if (group) {
        await resourceApi.updateGroup(group.id, payload);
        showToast(`Group "${name}" updated successfully.`, "success");
      } else {
        await resourceApi.createGroup(payload);
        showToast(`Group "${name}" created successfully.`, "success");
      }
      onSaved();
    } catch (err: any) {
      showToast(err?.message || "Failed to save group.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlideOver isOpen onClose={onClose} size="lg">
      <SlideOverHeader
        title={group ? "Edit Group Details" : "Create Functional Group"}
        subtitle="Configure team identity, type classification, and legal entity coverage."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
        <SlideOverContent className="space-y-6 p-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Users className="h-4 w-4 text-[#ff6900]" />
              Basic Information
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Group Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Enterprise Architecture Team"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Classification Type
                </label>
                <select
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {group && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operating Status
                  </label>
                  <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-[#ff6900] border-slate-300 focus:ring-[#ff6900]"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {isActive ? "Active / Operational" : "Deactivated / Inactive"}
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description / Scope
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of this group's primary operational focus..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>
          </div>

          {/* Section 2: Organization Coverage */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-blue-600" />
              Corporate Legal Coverage
            </div>

            <p className="text-xs text-slate-500">
              Select which legal entities and operating subsidiaries this group is assigned to.
            </p>

            {loadingOrgs ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading entities...</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {organizations.map((org) => (
                  <label
                    key={org.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={orgIds.includes(org.id)}
                        onChange={(e) => toggleOrg(org.id, e.target.checked)}
                        className="w-4 h-4 rounded text-[#ff6900] border-slate-300 focus:ring-[#ff6900]"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">{org.name}</div>
                        {org.code && <div className="text-[10px] text-slate-400 font-mono">{org.code}</div>}
                      </div>
                    </div>

                    {orgIds.includes(org.id) && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Included
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {orgIds.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Headquarters Entity
                </label>
                <select
                  value={primaryOrgId}
                  onChange={(e) => setPrimaryOrgId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                >
                  <option value="">Select Primary Organization</option>
                  {organizations
                    .filter((org) => orgIds.includes(org.id))
                    .map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
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
            <span>{group ? "Update Group" : "Create Group"}</span>
          </button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
