import { useEffect, useState } from "react";
import { useToast } from "@/shared";
import {
  SlideOver,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared/components/ui/SlideOver";
import {
  createRole,
  updateRole,
  listPermissions,
  getRoleDeleteImpact,
  type Role,
  type RolePermission,
} from "./admin-roles-api";
import { Shield, Key, AlertTriangle, Check, Trash2, X } from "lucide-react";

type Props = {
  role?: Role | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function AdminRoleSlideOver({ role, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [deleteImpact, setDeleteImpact] = useState<{
    affected_users: number;
    users?: Array<{ profile_id: string; email: string; username: string }>;
  } | null>(null);

  const [name, setName] = useState(role?.name || "");
  const [slug, setSlug] = useState(role?.slug || "");
  const [description, setDescription] = useState(role?.description || "");
  const [isActive, setIsActive] = useState(role?.is_active ?? true);

  useEffect(() => {
    async function load() {
      setLoadingPermissions(true);
      try {
        const perms = await listPermissions();
        setPermissions(perms);
        if (role?.permissions) {
          setSelectedPermissions(role.permissions.map((p) => p.slug));
        }
      } catch {
        setPermissions([]);
      } finally {
        setLoadingPermissions(false);
      }
    }
    void load();
  }, [role?.id]);

  useEffect(() => {
    if (role?.id) {
      getRoleDeleteImpact(role.id)
        .then(setDeleteImpact)
        .catch(() => setDeleteImpact(null));
    }
  }, [role?.id]);

  const slugFromName = (n: string) =>
    n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  function handleNameChange(value: string) {
    setName(value);
    if (!role) {
      setSlug(slugFromName(value));
    }
  }

  function togglePermission(slug: string) {
    setSelectedPermissions((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a role name.", "error");
      return;
    }
    if (!slug.trim() && !role) {
      showToast("Please enter a unique role slug.", "error");
      return;
    }

    try {
      setSaving(true);
      const permIds = permissions
        .filter((p) => selectedPermissions.includes(p.slug))
        .map((p) => p.id);

      if (role) {
        await updateRole(role.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          is_active: isActive,
          permission_ids: permIds,
        });
        showToast(`Role "${name}" updated successfully.`, "success");
      } else {
        await createRole({
          name: name.trim(),
          slug: slug.trim() || slugFromName(name.trim()),
          description: description.trim() || undefined,
          permission_ids: permIds,
        });
        showToast(`Role "${name}" created successfully.`, "success");
      }
      onSaved();
    } catch (err: any) {
      showToast(err?.message || "Failed to save role.", "error");
    } finally {
      setSaving(false);
    }
  }

  const groupedPermissions = permissions.reduce(
    (acc, p) => {
      const module = (p as any).module || "Core & Platform";
      if (!acc[module]) acc[module] = [];
      acc[module].push(p);
      return acc;
    },
    {} as Record<string, RolePermission[]>,
  );

  return (
    <SlideOver isOpen onClose={onClose} size="lg">
      <SlideOverHeader
        title={role ? "Edit Role & Capabilities" : "Create Enterprise Role"}
        subtitle="Define granular access rights, approvals authority, and system privileges."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
        <SlideOverContent className="space-y-6 p-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Shield className="h-4 w-4 text-[#ff6900]" />
              Role Identity
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Finance Controller"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Slug Identifier
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g., finance_controller"
                  disabled={!!role}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description / Purpose
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Scope of responsibility and authority for this role..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>

            {role && (
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#ff6900] border-slate-300 focus:ring-[#ff6900]"
                />
                <span className="text-xs font-bold text-slate-700">
                  {isActive ? "Active Role Assignment" : "Disabled / Inactive Role"}
                </span>
              </label>
            )}
          </div>

          {/* Section 2: Permissions Catalog */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Key className="h-4 w-4 text-amber-600" />
              Assigned Permissions ({selectedPermissions.length} selected)
            </div>

            {loadingPermissions ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading permissions...</div>
            ) : (
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <div key={module} className="bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {module}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((perm) => (
                        <label
                          key={perm.slug}
                          className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-200 cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm.slug)}
                            onChange={() => togglePermission(perm.slug)}
                            className="mt-0.5 w-4 h-4 rounded text-[#ff6900] border-slate-300 focus:ring-[#ff6900]"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              {perm.name}
                            </span>
                            {perm.description && (
                              <span className="text-[10px] text-slate-400 line-clamp-1">
                                {perm.description}
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete impact warnings */}
          {role && deleteImpact && deleteImpact.affected_users > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Active User Assignments Warning
              </div>
              <p>
                Deleting this role affects <strong>{deleteImpact.affected_users}</strong> user(s).
              </p>
            </div>
          )}
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
            <span>{role ? "Update Role" : "Create Role"}</span>
          </button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
