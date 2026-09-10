import {
  Button,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  SelectField,
  TextAreaField,
  useToast,
} from "@/shared";
import { humanize } from "@stanforte/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { TagPicker } from "@/pages/requests/TagPicker";
import { cacheStore, financeApi, useCachedQuery } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import {
  buildRequestsNavigation,
  requestsMobileNav,
} from "@/pages/requests/requests-data";
import {
  listRequestTypes,
  listCategories,
  type RequestTypeOption,
  type RequestCategoryOption,
  createRequest,
    getRequest,
    updateRequest,
    submitRequest,
    listApprovedBudgetLines,
    listProjects,
    listMyOrganizations,
    listGroupsForUser,
    type ApprovedBudgetLineOption,
    type MyOrganization,
    type TeamOption,
    type RequestItemInput,
  type RequestRecord,
} from "@/pages/requests/requests-api";
import {
  classifyRequestCategory,
  type WorkflowType,
} from "@/pages/requests/request-helpers";
import { LeaveRequestFormPage } from "@/pages/requests/new/forms/LeaveRequestFormPage";
import { PaymentRequestFormPage } from "@/pages/requests/new/forms/PaymentRequestFormPage";
import { LoanRequestFormPage } from "@/pages/requests/new/forms/LoanRequestFormPage";
import { OtherRequestFormPage } from "@/pages/requests/new/forms/OtherRequestFormPage";
import { ProcurementRequestFormPage } from "@/pages/requests/new/forms/ProcurementRequestFormPage";
import type { RequestFormHandle } from "@/pages/requests/new/forms/category-form-types";
import {
  listEntityTags,
  listManagedTaxonomies,
  replaceEntityTags,
  type TagTerm,
} from "@/pages/requests/taxonomy-api";

type FormState = {
  request_type_id: string;
  organization_id: string;
  team_id: string;
  project_id: string;
  purpose: string;
};

const defaultForm: FormState = {
  request_type_id: "",
  organization_id: "",
  team_id: "",
  project_id: "",
  purpose: "",
};

function buildHandoverOptions(teams: TeamOption[], currentUserId?: string) {
  const values = new Map<string, string>();
  teams.forEach((team) => {
    (team.members ?? []).forEach((member) => {
      const id = String(member.userId || member.user.id || "");
      if (!id || id === currentUserId || values.has(id)) return;
      const name =
        `${member.user.firstName ?? ""} ${member.user.lastName ?? ""}`.trim() ||
        member.user.username ||
        member.user.email;
      values.set(id, name);
    });
  });
  return Array.from(values.entries()).map(([value, label]) => ({ value, label }));
}

export function RequestFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { user } = useAuth();
  const typeId = searchParams.get("typeId") || "";
  const editId = searchParams.get("edit") || "";
  const urlTeamId = searchParams.get("team_id") || "";
  const urlOrgId = searchParams.get("organization_id") || "";
  const [form, setForm] = useState<FormState>(() => ({
    ...defaultForm,
    team_id: urlTeamId,
    organization_id: urlOrgId,
  }));
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [tagsByKey, setTagsByKey] = useState<Record<string, TagTerm[]>>({});
  const [categoryByKey, setCategoryByKey] = useState<Record<string, string>>({});
  const [summaryContent, setSummaryContent] = useState<React.ReactNode>(null);
  const [editRequest, setEditRequest] = useState<RequestRecord | undefined>(undefined);
  const requestFormRef = useRef<RequestFormHandle>(null);

  const { data: requestTypes } = useCachedQuery("requests:types", () => listRequestTypes(), { ttlMs: 1000 * 60 * 10, storage: "local" });
  const { data: projects } = useCachedQuery("requests:projects", () => listProjects(), { ttlMs: 1000 * 60 * 10, storage: "memory" });
  const { data: organizations } = useCachedQuery("requests:my-organizations", () => listMyOrganizations(), { ttlMs: 1000 * 60 * 10, storage: "memory" });
  const { data: teams } = useCachedQuery(
    ["requests:groups", form.organization_id].filter(Boolean).join(":"),
    () => listGroupsForUser({ organization_id: form.organization_id || undefined }),
    { ttlMs: 1000 * 60 * 10, storage: "memory" }
  );
  const { data: profile } = useCachedQuery("workspace:profile:request-form", () => getWorkspaceProfile(), { ttlMs: 1000 * 60, storage: "memory" });
  const { data: categories } = useCachedQuery("requests:categories", () => listCategories(), { ttlMs: 1000 * 60 * 10, storage: "memory" });
  const { data: managedTaxonomies } = useCachedQuery("requests:taxonomies", () => listManagedTaxonomies({ include_inactive: false }), { ttlMs: 1000 * 60 * 10, storage: "memory" });
  const { data: vendors } = useCachedQuery("finance:vendors:options", () => financeApi.listVendors({ is_active: true, per_page: 200 }), { ttlMs: 1000 * 60 * 10, storage: "memory" });
  const vendorOptions: Array<{ id: string; name: string }> = (vendors as any)?.result ?? [];

  // Derived values

  const groupOptions = useMemo(
    () =>
      ((teams ?? []) as any[])
        .filter((group) => ["team", "department"].includes(String(group.type || "").trim().toLowerCase()))
        .map((group) => ({ id: group.id, name: group.name, type: group.type, role: group.role })),
    [teams],
  );

  const selectedType = useMemo(
    () => (requestTypes ?? []).find((type: RequestTypeOption) => type.id === form.request_type_id || type.id === typeId),
    [form.request_type_id, requestTypes, typeId],
  );

  const handoverOptions = useMemo(() => buildHandoverOptions(teams ?? [], user?.id), [teams, user?.id]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, RequestCategoryOption>();
    for (const cat of categories ?? []) map.set(cat.id, cat);
    return map;
  }, [categories]);

  const selectedCategory = useMemo(() => {
    if (!selectedType) return null;
    const catId = selectedType.categoryId || selectedType.category_id;
    return catId ? categoryMap.get(catId) ?? null : null;
  }, [selectedType, categoryMap]);

  const workflowType: WorkflowType = useMemo(() => {
    if (!selectedType) return "other";
    return classifyRequestCategory(
      selectedType.taxonomyKeys?.[0] ?? selectedType.taxonomy_keys?.[0],
      selectedType.name,
      selectedCategory?.code ?? null,
    );
  }, [selectedType, selectedCategory]);

  const approvedBudgetScopeQuery = useMemo(() => {
    if (workflowType !== "procurement") return null;
    if (form.project_id) return { project_id: form.project_id };
    if (form.team_id) return { team_id: form.team_id, organization_id: form.organization_id || undefined };
    if (form.organization_id) return { organization_id: form.organization_id };
    return null;
  }, [workflowType, form.project_id, form.team_id, form.organization_id]);
  const { data: approvedBudgetLines } = useCachedQuery(
    `requests:approved-budget-lines:${JSON.stringify(approvedBudgetScopeQuery ?? {})}`,
    () => (approvedBudgetScopeQuery ? listApprovedBudgetLines(approvedBudgetScopeQuery) : Promise.resolve([] as ApprovedBudgetLineOption[])),
    { ttlMs: 1000 * 60 * 5, storage: "memory" },
  );

  const selectedTaxonomies = useMemo(() => {
    const keys = [...(selectedType?.taxonomyKeys ?? selectedType?.taxonomy_keys ?? [])]
      .map(k => String(k).trim().toLowerCase())
      .filter(Boolean);
    return keys
      .map(key => (managedTaxonomies ?? []).find(t => t.key.trim().toLowerCase() === key) ?? null)
      .filter((t): t is NonNullable<typeof t> => t !== null);
  }, [managedTaxonomies, selectedType]);

  const tagTaxonomies = useMemo(() => selectedTaxonomies.filter(t => t.renderType === "tags"), [selectedTaxonomies]);
  const categoryTaxonomies = useMemo(() => selectedTaxonomies.filter(t => t.renderType !== "tags"), [selectedTaxonomies]);

  const showProject = Boolean((selectedType?.form_schema as Record<string, unknown> | null)?.show_project);

  const siblingTypes = useMemo(() => {
    if (!selectedCategory) return [];
    const catId = selectedCategory.id;
    return (requestTypes ?? []).filter((t: RequestTypeOption) =>
      (t.categoryId || t.category_id) === catId
    );
  }, [requestTypes, selectedCategory]);

  const organizationOptions: Array<{ id: string; name: string; code: string }> = (organizations ?? []).map((entry: MyOrganization) => entry.organization);
  const projectOptions: Array<{ id: string; name: string }> = projects ?? [];

  // Effects

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoadingEdit(true);
    void getRequest(editId)
      .then((request) => {
        if (cancelled) return;
        const data = request.data && typeof request.data === "object" ? request.data as Record<string, unknown> : {};
        setForm((prev) => ({
          ...prev,
          request_type_id: String(request.request_type?.id || ""),
          organization_id: String(request.organization_id || data.organization_id || ""),
          team_id: String(request.team_id || ""),
          project_id: String(data.project_id || ""),
          purpose: String(data.purpose || ""),
        }));
        setEditRequest(request);
      })
      .catch((error) => {
        if (cancelled) return;
        showToast({
          tone: "danger",
          title: "Unable to load draft",
          message: error instanceof Error ? error.message : "We could not load this request draft.",
        });
      })
      .finally(() => { if (!cancelled) setLoadingEdit(false); });
    return () => { cancelled = true; };
  }, [editId, showToast]);

  // Populate category selections once both edit data and taxonomy info are loaded
  useEffect(() => {
    if (!editRequest?.data || categoryTaxonomies.length === 0) return;
    const data = editRequest.data as Record<string, unknown>;
    const updates: Record<string, string> = {};
    const primaryCatId = String(data.category_id || "");
    if (primaryCatId && categoryTaxonomies[0]) updates[categoryTaxonomies[0].key] = primaryCatId;
    const savedIds = data.category_ids as Record<string, string> | undefined;
    if (savedIds) Object.entries(savedIds).forEach(([k, v]) => { if (v) updates[k] = v; });
    if (Object.keys(updates).length > 0) {
      setCategoryByKey(prev => ({ ...updates, ...prev }));
    }
  }, [editRequest, categoryTaxonomies]);

  // Load tags for every tag taxonomy once both edit data and taxonomy info are loaded
  useEffect(() => {
    if (!editRequest || tagTaxonomies.length === 0) return;
    let cancelled = false;
    void Promise.all(
      tagTaxonomies.map(taxonomy =>
        listEntityTags("request", String(editRequest.id), taxonomy.key)
          .then(response => ({ key: taxonomy.key, tags: response.tags ?? [] }))
          .catch(() => ({ key: taxonomy.key, tags: [] as TagTerm[] }))
      )
    ).then(results => {
      if (cancelled) return;
      const updates: Record<string, TagTerm[]> = {};
      results.forEach(({ key, tags }) => { updates[key] = tags; });
      setTagsByKey(updates);
    });
    return () => { cancelled = true; };
  }, [editRequest, tagTaxonomies]);

  useEffect(() => {
    if (!editId && typeId) setForm((prev) => ({ ...prev, request_type_id: typeId }));
  }, [editId, typeId]);

  useEffect(() => {
    if (organizationOptions.length === 1) {
      setForm((prev) => ({ ...prev, organization_id: prev.organization_id || organizationOptions[0].id }));
    }
  }, [organizationOptions]);

  useEffect(() => {
    if (groupOptions.length === 1) {
      setForm((prev) => ({ ...prev, team_id: prev.team_id || groupOptions[0].id }));
    }
  }, [groupOptions]);

  useEffect(() => {
    categoryTaxonomies.forEach(taxonomy => {
      const terms = taxonomy.terms ?? [];
      if (terms.length === 1) {
        setCategoryByKey(prev => prev[taxonomy.key] ? prev : { ...prev, [taxonomy.key]: terms[0].id });
      }
    });
  }, [categoryTaxonomies]);

  async function handleSave(submitAfterSave: boolean) {
    try {
      const result = requestFormRef.current?.validateAndBuild();
      if (!result) return;
      if ("error" in result) {
        showToast({ tone: "warning", title: "Check this request", message: result.error });
        return;
      }

      const categoryId = categoryTaxonomies.length > 0
        ? (categoryByKey[categoryTaxonomies[0].key] || undefined)
        : undefined;
      const allCategoryIds = Object.fromEntries(
        categoryTaxonomies.filter(t => categoryByKey[t.key]).map(t => [t.key, categoryByKey[t.key]])
      );

      const payload: { team_id?: string; organization_id?: string; total_amount?: number; data: Record<string, unknown>; items?: RequestItemInput[] } = {
        team_id: form.team_id || undefined,
        organization_id: form.organization_id || undefined,
        total_amount: result.payload.total_amount,
        data: {
          project_id: showProject ? (form.project_id || undefined) : undefined,
          category_id: categoryId,
          ...(Object.keys(allCategoryIds).length > 1 ? { category_ids: allCategoryIds } : {}),
          purpose: form.purpose.trim() || undefined,
          ...result.payload.data,
        },
        items: result.payload.items ?? [],
      };

      const created = editId
        ? await updateRequest(editId, payload)
        : await createRequest({ request_type_id: form.request_type_id, ...payload, items: payload.items ?? [] });

      await Promise.all(
        tagTaxonomies
          .filter(t => (tagsByKey[t.key] ?? []).length > 0)
          .map(taxonomy => {
            const taxonomyTags = tagsByKey[taxonomy.key] ?? [];
            return replaceEntityTags("request", String(created.id), taxonomy.key, {
              term_ids: taxonomyTags.filter(t => !t.id.startsWith("new:")).map(t => t.id),
              labels: taxonomyTags.filter(t => t.id.startsWith("new:")).map(t => t.label),
              module: "finance",
            });
          })
      );

      if (submitAfterSave) await submitRequest(String(created.id));

      showToast({
        tone: "success",
        title: submitAfterSave ? "Request submitted" : "Draft saved",
        message: submitAfterSave
          ? "Your request has been submitted and routed for review."
          : "Your draft has been saved.",
      });
      ["requests:list:mine", "requests:list:approvals", `requests:detail:${created.id}`, `requests:actions:${created.id}`]
        .forEach((key) => cacheStore.invalidateCache(key));
      navigate(`/requests/${created.id}`, { replace: true });
    } catch (requestError) {
      showToast({
        tone: "danger",
        title: submitAfterSave ? "Unable to submit request" : "Unable to save draft",
        message: requestError instanceof Error ? requestError.message : "Unable to save request.",
      });
    } finally {
      setSavingDraft(false);
      setSubmitting(false);
    }
  }

  const staffDetailsCard = (
    <SectionCard
      title="Staff Details"
      description="Assign this request to the right team and workstream."
    >
      {siblingTypes.length > 1 && (
        <div className="mb-5">
          <SelectField
            label="Request Type"
            value={form.request_type_id || typeId}
            onChange={(event) => setForm((prev) => ({ ...prev, request_type_id: event.target.value }))}
          >
            {siblingTypes.map((type: RequestTypeOption) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </SelectField>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <SelectField
          label="Group / Team"
          value={form.team_id}
          onChange={(event) => setForm((prev) => ({ ...prev, team_id: event.target.value }))}
          disabled={groupOptions.length <= 1}
        >
          <option value="">Select group</option>
          {groupOptions.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} ({humanize(group.type)})
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Organization"
          value={form.organization_id}
          onChange={(event) => setForm((prev) => ({ ...prev, organization_id: event.target.value }))}
          disabled={organizationOptions.length <= 1}
        >
          <option value="">Select organization</option>
          {organizationOptions.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </SelectField>
        {showProject ? (
          <SelectField
            label="Project"
            value={form.project_id}
            onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))}
            disabled={projectOptions.length === 0}
          >
            <option value="">Select project</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </SelectField>
        ) : null}
      </div>
      {categoryTaxonomies.map(taxonomy => (
        <div key={taxonomy.key} className="mt-4">
          <SelectField
            label={taxonomy.name || "Category"}
            value={categoryByKey[taxonomy.key] || ""}
            onChange={(event) => setCategoryByKey(prev => ({ ...prev, [taxonomy.key]: event.target.value }))}
          >
            <option value="">Select {(taxonomy.name || "category").toLowerCase()}</option>
            {(taxonomy.terms ?? []).map(term => (
              <option key={term.id} value={term.id}>{term.label}</option>
            ))}
          </SelectField>
        </div>
      ))}
      {tagTaxonomies.map(taxonomy => (
        <div key={taxonomy.key} className="mt-5 border-t border-slate-100 pt-5">
          <TagPicker
            taxonomyKey={taxonomy.key}
            value={tagsByKey[taxonomy.key] || []}
            onChange={(newTags) => setTagsByKey(prev => ({ ...prev, [taxonomy.key]: newTags }))}
            placeholder={`Add ${(taxonomy.name || "tags").toLowerCase()}`}
            label={taxonomy.name || "Tags"}
          />
        </div>
      ))}
      <div className="mt-5 border-t border-slate-100 pt-5">
        <TextAreaField
          label="Purpose"
          value={form.purpose}
          onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))}
          placeholder="Explain why this request is needed and what outcome it supports."
        />
      </div>
    </SectionCard>
  );

  if (!typeId && !editId) {
    return (
      <AppShell
        navigation={buildRequestsNavigation()}
        activeLabel="New Request"
        user={{ name: "Alex Sterling", role: "Fleet Operations" }}
        mobileNav={requestsMobileNav}
      >
        <div className="shell-panel flex flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <EmptyState
            title="Choose a request type first"
            description="Start from the request selector so we can load the right form structure."
          />
          <Link
            to={`/requests/new${urlTeamId || urlOrgId ? `?${new URLSearchParams({ ...(urlTeamId ? { team_id: urlTeamId } : {}), ...(urlOrgId ? { organization_id: urlOrgId } : {}) }).toString()}` : ""}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
          >
            Back to New Request
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="New Request"
      user={{ name: "Alex Sterling", role: "Fleet Operations" }}
      mobileNav={requestsMobileNav}
    >
      {/* Desktop header */}
      <div className="hidden lg:block">
        <PageHeader
          breadcrumbs={[
            { label: "Requests", path: "/requests" },
            { label: editId ? "Edit Draft" : "New Request" },
          ]}
          title={selectedType?.name || (loadingEdit ? "Loading request..." : "Request form")}
          description={selectedCategory?.description || "Fill in the request details below."}
          actions={
            <Link
              to={`/requests/new${urlTeamId || urlOrgId ? `?${new URLSearchParams({ ...(urlTeamId ? { team_id: urlTeamId } : {}), ...(urlOrgId ? { organization_id: urlOrgId } : {}) }).toString()}` : ""}`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
            >
              <Icon name="arrow_back" className="text-[18px]" />
              Change Type
            </Link>
          }
        />
      </div>

      {/* Mobile header */}
      <div className="pt-1 lg:hidden">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-slate-500">
          {editId ? "Edit Request" : "New Request"}
        </p>
        <h1 className="page-title mt-2 text-[clamp(1.7rem,7vw,2.2rem)]">
          {selectedType?.name || "Request form"}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
          {selectedCategory?.description || "Fill in the request details below."}
        </p>
      </div>

      {/* Single responsive grid — right rail first in DOM so summary/actions appear at top on mobile */}
      <div className="mt-4 grid grid-cols-1 gap-6 lg:mt-6 lg:grid-cols-12">
        {/* Right rail */}
        <div className="space-y-4 lg:order-2 lg:col-span-4 lg:self-start lg:sticky lg:top-28">
          {summaryContent}
          <SectionCard title="Submission Actions">
            <div className="space-y-3">
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => void handleSave(false)}
                disabled={savingDraft || submitting || loadingEdit}
              >
                {savingDraft ? "Saving..." : editId ? "Update Draft" : "Save Draft"}
              </Button>
              <Button
                className="w-full justify-center gap-2"
                onClick={() => void handleSave(true)}
                disabled={savingDraft || submitting || loadingEdit}
              >
                {submitting ? "Submitting..." : "Submit Request"}
                <Icon name="arrow_forward" className="text-[18px]" />
              </Button>
            </div>
          </SectionCard>
        </div>

        {/* Main content */}
        <div className="space-y-6 lg:order-1 lg:col-span-8">
          {staffDetailsCard}
          {workflowType === "procurement" ? (
            <ProcurementRequestFormPage
              ref={requestFormRef}
              selectedType={selectedType}
              selectedCategory={selectedCategory}
              vendorOptions={vendorOptions}
              editRequest={editRequest}
              loadingEdit={loadingEdit}
              approvedBudgetLines={approvedBudgetLines ?? []}
              onSummary={setSummaryContent}
            />
          ) : workflowType === "leave" ? (
            <LeaveRequestFormPage
              ref={requestFormRef}
              selectedType={selectedType}
              selectedCategory={selectedCategory}
              handoverOptions={handoverOptions}
              editRequest={editRequest}
              loadingEdit={loadingEdit}
              onSummary={setSummaryContent}
            />
          ) : workflowType === "loan" ? (
            <LoanRequestFormPage
              ref={requestFormRef}
              selectedType={selectedType}
              selectedCategory={selectedCategory}
              editRequest={editRequest}
              loadingEdit={loadingEdit}
              onSummary={setSummaryContent}
            />
          ) : workflowType === "payment" ? (
            <PaymentRequestFormPage
              ref={requestFormRef}
              selectedType={selectedType}
              selectedCategory={selectedCategory}
              vendorOptions={vendorOptions}
              editRequest={editRequest}
              loadingEdit={loadingEdit}
              onSummary={setSummaryContent}
            />
          ) : (
            <OtherRequestFormPage
              ref={requestFormRef}
              selectedType={selectedType}
              selectedCategory={selectedCategory}
              editRequest={editRequest}
              loadingEdit={loadingEdit}
              onSummary={setSummaryContent}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default RequestFormPage;
