import { useState, useEffect } from "react";
import { useToast } from "@/shared";
import {
  SlideOver,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared/components/ui/SlideOver";
import { requestApi, adminUsersApi } from "@/shared/lib/core";
import {
  listCategories,
  type RequestCategoryOption,
} from "@/pages/requests/requests-api";
import {
  listManagedTaxonomies,
  type ManagedTaxonomy,
} from "@/pages/requests/taxonomy-api";
import type { RequestType, RoleOption } from "@stanforte/shared";
import ApprovalFlowBuilder, {
  createApprovalFlowStep,
  type ApprovalFlowStep,
} from "@/pages/requests/components/ApprovalFlowBuilder";
import { FileText, GitBranch, Shield, Check, Layers } from "lucide-react";

type Props = {
  requestType?: RequestType | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function RequestTypeSlideOver({
  requestType,
  onClose,
  onSaved,
}: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<RequestCategoryOption[]>([]);
  const [taxonomies, setTaxonomies] = useState<ManagedTaxonomy[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [name, setName] = useState(requestType?.name || "");
  const [slug, setSlug] = useState(requestType?.slug || "");
  const [categoryId, setCategoryId] = useState(requestType?.categoryId || "");
  const [taxonomyKeys, setTaxonomyKeys] = useState<string[]>(
    requestType?.taxonomyKeys || [],
  );
  const [isActive, setIsActive] = useState(requestType?.is_active ?? true);
  const [workflowType, setWorkflowType] = useState(
    requestType?.workflow_type || "",
  );
  const [handlerRoleLabel, setHandlerRoleLabel] = useState(
    requestType?.handler_role_label || "",
  );
  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(() => {
    const raw = requestType?.formSchema?.["visible_to_roles"];
    return Array.isArray(raw) ? raw : [];
  });

  const [approvalSteps, setApprovalSteps] = useState<ApprovalFlowStep[]>(() => {
    const flow = requestType?.approvalFlowJson?.flow;
    if (Array.isArray(flow) && flow.length > 0) {
      return flow;
    }
    return [
      createApprovalFlowStep("relation", "requester_team_lead"),
      createApprovalFlowStep("permission", "finance.approve"),
    ];
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, taxs, roleList] = await Promise.all([
          listCategories(),
          listManagedTaxonomies().catch(() => []),
          adminUsersApi.listRoleOptions().catch(() => []),
        ]);
        setCategories(cats);
        setTaxonomies(taxs);
        setRoles(roleList as RoleOption[]);
      } catch {
        setCategories([]);
        setTaxonomies([]);
        setRoles([]);
      }
    }
    void loadData();
  }, []);

  const slugFromName = (n: string) =>
    n
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

  function handleNameChange(value: string) {
    setName(value);
    if (!requestType) {
      setSlug(slugFromName(value));
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a request type name.", "error");
      return;
    }
    if (!categoryId) {
      showToast("Please select a module category.", "error");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: name.trim(),
        slug: slug.trim() || slugFromName(name.trim()),
        category_id: categoryId,
        taxonomy_keys: taxonomyKeys,
        workflow_type: workflowType || undefined,
        handler_role_label: handlerRoleLabel.trim() || undefined,
        approval_flow_json: { flow: approvalSteps },
        form_schema: {
          visible_to_roles: visibleToRoles.length > 0 ? visibleToRoles : undefined,
        },
      };

      if (requestType?.id) {
        await requestApi.updateType(requestType.id, payload);
        showToast(`Request type "${name}" updated.`, "success");
      } else {
        await requestApi.createType(payload);
        showToast(`Request type "${name}" created.`, "success");
      }
      onSaved();
    } catch (err: any) {
      showToast(err?.message || "Failed to save request type.", "error");
    } finally {
      setSaving(false);
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <SlideOver isOpen onClose={onClose} size="xl">
      <SlideOverHeader
        title={requestType ? "Edit Request Type" : "Create Request Type"}
        subtitle="Configure requisition schemas, dynamic form controls, and multi-tier approval flows."
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto">
        <SlideOverContent className="space-y-6 p-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <FileText className="h-4 w-4 text-[#ff6900]" />
              Basic Identification
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Type Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Equipment Requisition"
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
                  placeholder="e.g., equipment_requisition"
                  disabled={!!requestType}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Requisition Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.groupName ? `(${c.groupName})` : ""}
                    </option>
                  ))}
                </select>
                {selectedCategory?.groupName && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Group: <strong className="text-slate-700">{selectedCategory.groupName}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Workflow Class
                </label>
                <select
                  value={workflowType}
                  onChange={(e) => setWorkflowType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                >
                  <option value="">Auto-detect from schema</option>
                  <option value="payment">Payment & Cash Advance</option>
                  <option value="leave">Leave & Time Off</option>
                  <option value="loan">Staff Loan</option>
                  <option value="other">General Operations</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Handler Role Label
                </label>
                <input
                  type="text"
                  value={handlerRoleLabel}
                  onChange={(e) => setHandlerRoleLabel(e.target.value)}
                  placeholder="e.g., Senior Accountant, HR Business Partner"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-[#ff6900] border-slate-300 focus:ring-[#ff6900]"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Active & Available in Requisitions Menu
                  </span>
                </label>
              </div>
            </div>

            {/* Taxonomies & Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Attached Taxonomies
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
                  {taxonomies.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No taxonomies configured.</p>
                  ) : (
                    taxonomies.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={taxonomyKeys.includes(t.key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTaxonomyKeys([...taxonomyKeys, t.key]);
                            } else {
                              setTaxonomyKeys(taxonomyKeys.filter((k) => k !== t.key));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-[#ff6900] border-slate-300 focus:ring-[#ff6900]"
                        />
                        <span>{t.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Restricted to Roles (empty = visible to all)
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 p-2.5 bg-slate-50/50">
                  {roles.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No roles configured.</p>
                  ) : (
                    roles.map((r) => (
                      <label key={r.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleToRoles.includes(r.slug)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVisibleToRoles([...visibleToRoles, r.slug]);
                            } else {
                              setVisibleToRoles(visibleToRoles.filter((s) => s !== r.slug));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-[#ff6900] border-slate-300 focus:ring-[#ff6900]"
                        />
                        <span>{r.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Approval Flow Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <GitBranch className="h-4 w-4 text-purple-600" />
              Multi-Step Approval Chain
            </div>

            <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4">
              <ApprovalFlowBuilder
                steps={approvalSteps}
                onChange={setApprovalSteps}
                roleOptions={
                  roles.length > 0
                    ? roles.map((r) => r.slug)
                    : ["team_lead", "accountant", "hr", "coo", "ed", "ceo"]
                }
                workflowType={workflowType}
              />
            </div>
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
            <span>{requestType ? "Update Request Type" : "Create Request Type"}</span>
          </button>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
