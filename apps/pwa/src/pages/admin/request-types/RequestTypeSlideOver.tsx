import { useEffect, useMemo, useState } from "react";
import {
  Button,
  SectionCard,
  TextField,
  SelectField,
  ApprovalFlowBuilder,
  createApprovalFlowStep,
  parseApprovalFlowSteps,
  serializeApprovalFlowSteps,
  type ApprovalFlowEditorStep,
  useToast,
} from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { cacheStore, requestApi } from "@/shared/lib/core";
import type { RequestType } from "@stanforte/shared";
import { listCategories } from "@/pages/requests/requests-api";
import type { RequestCategoryOption } from "@/pages/requests/requests-api";
import { listManagedTaxonomies, type ManagedTaxonomy } from "@/pages/requests/taxonomy-api";
import { listRoles, type Role } from "@/pages/admin/roles/admin-roles-api";

type Props = {
  requestType?: RequestType | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function RequestTypeSlideOver({ requestType, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<RequestCategoryOption[]>([]);
  const [taxonomies, setTaxonomies] = useState<ManagedTaxonomy[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [name, setName] = useState(requestType?.name || "");
  const [slug, setSlug] = useState(requestType?.slug || "");
  const [categoryId, setCategoryId] = useState(requestType?.category_id || requestType?.categoryId || "");
  const [taxonomyKeys, setTaxonomyKeys] = useState<string[]>(
    requestType?.taxonomy_keys || requestType?.taxonomyKeys || []
  );
  const [isActive, setIsActive] = useState(requestType?.is_active ?? true);
  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(requestType?.visible_to_roles ?? []);
  const [workflowType, setWorkflowType] = useState(requestType?.workflow_type || "");
  const [handlerRoleLabel, setHandlerRoleLabel] = useState(requestType?.handler_role_label || "");



  useEffect(() => {
    void listCategories().then(setCategories);
    void listManagedTaxonomies({ include_inactive: false }).then(setTaxonomies);
    void listRoles().then((roles) => setRoles(roles.filter((r) => r.is_active)));
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const slugFromName = (n: string) =>
    n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  function handleNameChange(value: string) {
    setName(value);
    if (!requestType) {
      setSlug(slugFromName(value));
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      showToast({ tone: "warning", title: "Name required", message: "Please enter a type name." });
      return;
    }
    if (!slug.trim() && !requestType) {
      showToast({ tone: "warning", title: "Slug required", message: "Please enter a type slug." });
      return;
    }
    if (!requestType && !categoryId) {
      showToast({ tone: "warning", title: "Category required", message: "Select a request category." });
      return;
    }
    if (approvalSteps.length === 0) {
      showToast({
        tone: "warning",
        title: "Approval flow required",
        message: "Add at least one approval step.",
      });
      return;
    }
    const missingValue = approvalSteps.find((step) => !step.value.trim());
    if (missingValue) {
      showToast({
        tone: "warning",
        title: "Missing step value",
        message: "Each approval step needs a value.",
      });
      return;
    }
    const approvalFlowJson = serializeApprovalFlowSteps(approvalSteps) as Record<string, unknown>;

    try {
      setSaving(true);
      const payload: Partial<RequestType> = {
        name: name.trim(),
        is_active: isActive,
        approval_flow_json: approvalFlowJson,
        visible_to_roles: visibleToRoles.length > 0 ? visibleToRoles : [],
      };
      if (!requestType) {
        payload.slug = slug.trim();
      }
      if (categoryId) {
        payload.category_id = categoryId;
      }
      if (taxonomyKeys.length > 0) {
        payload.taxonomy_keys = taxonomyKeys;
      }
      if (workflowType) {
        payload.workflow_type = workflowType;
      }
      if (handlerRoleLabel.trim()) {
        payload.handler_role_label = handlerRoleLabel.trim();
      }
      await requestApi.saveType(
        payload,
        requestType?.id,
        categoryId || undefined,
      );
      showToast({
        tone: "success",
        title: requestType ? "Updated" : "Created",
        message: `${name} has been ${requestType ? "updated" : "created"}.`,
      });
      cacheStore.invalidateCache("requests:types");
      cacheStore.invalidateCache("hr:leave_types");
      onSaved();
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Save failed",
        message: err instanceof Error ? err.message : "Unable to save request type.",
      });
    } finally {
      setSaving(false);
    }
  }

  const [approvalSteps, setApprovalSteps] = useState<ApprovalFlowEditorStep[]>(() =>
    parseApprovalFlowSteps(requestType?.approval_flow_json || requestType?.approvalFlowJson, [
      createApprovalFlowStep("relation", "requester_team_lead"),
      createApprovalFlowStep("permission", "finance.approve"),
    ]),
  );

  return (
    <SlideOver open={true} onClose={onClose} size="xl">
      <SlideOverHeader
        title={requestType ? "Edit Request Type" : "Add Request Type"}
        subtitle={requestType ? "Edit Type" : "New Type"}
        onClose={onClose}
      />
      <SlideOverContent>
        <SectionCard title="Basic Info">
          <div className="grid gap-4">
            <TextField
              label="Type Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Equipment Request"
            />
            <div>
              <TextField
                label="Slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., equipment_request"
                disabled={!!requestType}
              />
              {!requestType && (
                <p className="text-xs text-slate-400 mt-1">Auto-generated from name if left empty</p>
              )}
            </div>
            <SelectField
              label="Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.groupName ? ` (${c.groupName})` : ""}
                </option>
              ))}
            </SelectField>
            {selectedCategory?.groupName && (
              <p className="text-xs text-slate-500 -mt-2">
                Module: <span className="font-medium">{selectedCategory.groupName}</span>
              </p>
            )}
            <div className="space-y-2">
              <span className="field-label">Taxonomies</span>
              <p className="text-xs text-slate-400">
                Select one or more taxonomies for this request type.
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-slate-200 p-3">
                {taxonomies.length === 0 && (
                  <p className="text-sm text-slate-400">No taxonomies available</p>
                )}
                {taxonomies.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 cursor-pointer"
                  >
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
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="font-medium text-slate-700">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm text-slate-700">
                Active
              </label>
            </div>
            <div className="space-y-2">
              <span className="field-label">Visible to Roles</span>
              <p className="text-xs text-slate-400">
                Leave empty to make visible to everyone. Select roles to restrict access.
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-slate-200 p-3">
                {roles.length === 0 && (
                  <p className="text-sm text-slate-400">No roles available</p>
                )}
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleToRoles.includes(role.slug)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setVisibleToRoles([...visibleToRoles, role.slug]);
                        } else {
                          setVisibleToRoles(visibleToRoles.filter((s) => s !== role.slug));
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="font-medium text-slate-700">{role.name}</span>
                    {role.description && (
                      <span className="text-xs text-slate-400 ml-1">— {role.description}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Workflow">
          <div className="space-y-4">
            <SelectField
              label="Workflow Type"
              value={workflowType}
              onChange={(e) => setWorkflowType(e.target.value)}
            >
              <option value="">— Auto-detect —</option>
              <option value="payment">Payment</option>
              <option value="leave">Leave</option>
              <option value="loan">Loan</option>
              <option value="other">Other</option>
            </SelectField>
            <TextField
              label="Handler Role Label"
              value={handlerRoleLabel}
              onChange={(e) => setHandlerRoleLabel(e.target.value)}
              placeholder="e.g. Accountant, HR Officer"
            />
          </div>
        </SectionCard>

        <SectionCard title="Approval Flow">
          <ApprovalFlowBuilder
            steps={approvalSteps}
            onChange={setApprovalSteps}
            roleOptions={["team_lead", "accountant", "hr", "coo", "ed", "ceo"]}
            workflowType={workflowType}
          />
        </SectionCard>
      </SlideOverContent>
      <SlideOverFooter>
        <Button onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? "Saving..." : requestType ? "Update Type" : "Create Type"}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </SlideOverFooter>
    </SlideOver>
  );
}
