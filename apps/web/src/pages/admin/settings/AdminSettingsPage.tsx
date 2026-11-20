import { SelectBox } from "@/components/ui/select";
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { requestApi, httpRequest } from "@/shared/lib/core";
import { type RequestType } from "@stanforte/shared";
import RequestTypeSlideOver from "@/pages/admin/request-types/RequestTypeSlideOver";
import {
  listCategories as apiListCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type RequestCategoryOption,
} from "@/pages/requests/requests-api";
import {
  listManagedTaxonomies,
  deleteTaxonomy,
  type ManagedTaxonomy,
} from "@/pages/requests/taxonomy-api";
import TaxonomySlideOver from "@/pages/admin/taxonomies/TaxonomySlideOver";
import {
  Settings,
  Sliders,
  FolderTree,
  Building,
  ShieldCheck,
  Tags,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Save,
  RefreshCw,
  Globe,
  Clock,
  Calendar,
  RotateCcw,
} from "lucide-react";
import {
  useLocalization,
  COMMON_TIMEZONES,
  TIME_FORMAT_OPTIONS,
  DATE_FORMAT_OPTIONS,
  DEFAULT_LOCALIZATION_SETTINGS,
  formatDisplayTime,
  formatDisplayDateLocalized,
} from "@/shared/lib/localization";

type ActiveTab = "types" | "categories" | "general" | "localization" | "security" | "taxonomy";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("types");
  const [types, setTypes] = useState<RequestType[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & SlideOvers
  const [editingType, setEditingType] = useState<RequestType | null | boolean>(false);
  const [categories, setCategories] = useState<RequestCategoryOption[]>([]);
  const [editingCategory, setEditingCategory] = useState<RequestCategoryOption | null | boolean>(false);
  const [categoryForm, setCategoryForm] = useState({ group_id: "", name: "", code: "", description: "" });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [taxonomies, setTaxonomies] = useState<ManagedTaxonomy[]>([]);
  const [editingTaxonomy, setEditingTaxonomy] = useState<ManagedTaxonomy | null | boolean>(false);
  const [tenant, setTenant] = useState<any>(null);
  const [tenantForm, setTenantForm] = useState({ name: "", plan: "trial" });
  const [tenantSaving, setTenantSaving] = useState(false);
  const [securityOverview, setSecurityOverview] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  function notify(text: string, tone: "success" | "error" = "success") {
    setToastMsg({ text, tone });
    setTimeout(() => setToastMsg(null), 4000);
  }

  const groupMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of groups) {
      map[g.id] = g.name;
    }
    return map;
  }, [groups]);

  const load = async () => {
    try {
      setLoading(true);
      const [res, groupsRes] = await Promise.all([
        requestApi.listTypes().catch(() => []),
        requestApi.listGroups().catch(() => []),
      ]);
      const safeTypes = Array.isArray(res) ? res : ((res as any)?.items ?? (res as any)?.data?.items ?? []);
      const safeGroups = Array.isArray(groupsRes) ? groupsRes : ((groupsRes as any)?.items ?? (groupsRes as any)?.data?.items ?? []);
      setTypes(safeTypes);
      setGroups(safeGroups as { id: string; name: string }[]);
    } catch {
      notify("Failed to load request types.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await apiListCategories(categoryFilter || undefined);
      const safeCats = Array.isArray(res) ? res : ((res as any)?.items ?? (res as any)?.data?.items ?? []);
      setCategories(safeCats as RequestCategoryOption[]);
    } catch {
      notify("Failed to load categories.", "error");
    }
  };

  const loadTaxonomies = async () => {
    try {
      const res = await listManagedTaxonomies();
      const safeTax = Array.isArray(res) ? res : ((res as any)?.items ?? (res as any)?.data?.items ?? []);
      setTaxonomies(safeTax);
    } catch {
      notify("Failed to load taxonomies.", "error");
    }
  };

  const loadTenant = async () => {
    try {
      const res = await httpRequest<any>("/tenants/current");
      if (res?.data) {
        setTenant(res.data);
        setTenantForm({
          name: res.data.name || "",
          plan: res.data.plan || "trial",
        });
      }
    } catch {
      // tenant fallback
    }
  };

  const loadSecurity = async () => {
    try {
      const res = await httpRequest<any>("/admin/rbac");
      if (res?.data) setSecurityOverview(res.data);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (activeTab === "categories") void loadCategories();
    if (activeTab === "taxonomy") void loadTaxonomies();
    if (activeTab === "general") void loadTenant();
    if (activeTab === "security") void loadSecurity();
  }, [activeTab, categoryFilter]);

  async function handleDeleteType(type: RequestType) {
    if (!window.confirm(`Delete "${type.name}"? This action cannot be undone.`)) return;
    try {
      await httpRequest(`/requests/types/${type.id}`, { method: "DELETE" });
      notify(`Request type "${type.name}" removed.`);
      void load();
    } catch {
      notify("Failed to delete request type.", "error");
    }
  }

  async function handleSaveCategory() {
    if (!categoryForm.name.trim() || !categoryForm.code.trim()) {
      notify("Name and code are required.", "error");
      return;
    }
    setCategorySaving(true);
    try {
      if (typeof editingCategory === "object" && editingCategory?.id) {
        await updateCategory(editingCategory.id, {
          name: categoryForm.name,
          description: categoryForm.description,
        });
        notify("Category updated.");
      } else {
        await createCategory(categoryForm);
        notify("Category created.");
      }
      setEditingCategory(false);
      setCategoryForm({ group_id: "", name: "", code: "", description: "" });
      void loadCategories();
    } catch {
      notify("Failed to save category.", "error");
    } finally {
      setCategorySaving(false);
    }
  }

  async function handleDeleteCategory(cat: RequestCategoryOption) {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      notify("Category deleted.");
      void loadCategories();
    } catch {
      notify("Failed to delete category.", "error");
    }
  }

  async function handleDeleteTaxonomy(tax: ManagedTaxonomy) {
    if (!window.confirm(`Delete taxonomy "${tax.name}"?`)) return;
    try {
      await deleteTaxonomy(tax.id);
      notify("Taxonomy deleted.");
      void loadTaxonomies();
    } catch {
      notify("Failed to delete taxonomy.", "error");
    }
  }

  async function handleSaveTenant() {
    setTenantSaving(true);
    try {
      await httpRequest("/tenants/current", {
        method: "PATCH",
        body: tenantForm,
      });
      notify("Workspace updated.");
      void loadTenant();
    } catch {
      notify("Failed to save workspace details.", "error");
    } finally {
      setTenantSaving(false);
    }
  }

  const localization = useLocalization();
  const [localSettingsForm, setLocalSettingsForm] = useState(localization.settings);

  useEffect(() => {
    setLocalSettingsForm(localization.settings);
  }, [localization.settings]);

  function handleSaveLocalization() {
    localization.update(localSettingsForm);
    notify("Regional and timezone settings saved successfully.", "success");
  }

  function handleResetLocalization() {
    localization.update(DEFAULT_LOCALIZATION_SETTINGS);
    setLocalSettingsForm(DEFAULT_LOCALIZATION_SETTINGS);
    notify("Reset to Nigerian standards (Africa/Lagos, 12-hour AM/PM).", "success");
  }

  const tabs = [
    { id: "types" as const, label: "Request Types", icon: Sliders },
    { id: "categories" as const, label: "Categories", icon: FolderTree },
    { id: "taxonomy" as const, label: "Taxonomies", icon: Tags },
    { id: "general" as const, label: "Workspace Profile", icon: Building },
    { id: "localization" as const, label: "Timezone & Regional", icon: Globe },
    { id: "security" as const, label: "Security & Access", icon: ShieldCheck },
  ];

  return (
    <PortalLayout activeNav="Settings">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        <PageHeader
          title="Workspace and system settings"
          description="Configure tenant parameters, request approval workflows, taxonomy dictionaries, and security"
          actions={
            <>
              {activeTab === "types" && (
                <button
                  type="button"
                  onClick={() => setEditingType(true)}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  <span>Add request type</span>
                </button>
              )}
              {activeTab === "categories" && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(true);
                    setCategoryForm({ group_id: groups[0]?.id || "", name: "", code: "", description: "" });
                  }}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  <span>Add category</span>
                </button>
              )}
              {activeTab === "taxonomy" && (
                <button
                  type="button"
                  onClick={() => setEditingTaxonomy(true)}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  <span>Add taxonomy</span>
                </button>
              )}
            </>
          }
        />

        {/* Toast feedback */}
        {toastMsg && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2.5 border ${
              toastMsg.tone === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-600/15"
                : "bg-rose-50 text-rose-800 border-rose-600/15"
            }`}
          >
            {toastMsg.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={1.5} />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" strokeWidth={1.5} />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-900/[0.06] max-w-full overflow-x-auto">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
                  isActive
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <IconComp
                  className={`h-4 w-4 shrink-0 ${isActive ? "text-neutral-900" : "text-neutral-500"}`}
                  strokeWidth={1.5}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Request Types */}
        {activeTab === "types" && (
          <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-900/[0.08] flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-medium text-neutral-900 font-headline">Configured request types</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Define custom schemas, approval stages, and notification rules per request type
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-500 tabular-nums shrink-0">
                {types.length} types
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/80 text-xs text-neutral-500 font-medium border-b border-neutral-900/[0.08]">
                    <th className="py-3 px-5">Type name</th>
                    <th className="py-3 px-5">Identifier</th>
                    <th className="py-3 px-5">Category</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-neutral-500">
                        Loading request types
                      </td>
                    </tr>
                  ) : types.length > 0 ? (
                    types.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                        <td className="py-3.5 px-5 font-medium text-neutral-900">
                          {t.name}
                        </td>
                        <td className="py-3.5 px-5">
                          <code className="text-xs font-mono bg-neutral-100 border border-neutral-900/[0.06] px-2 py-0.5 rounded-md text-neutral-700">
                            {t.slug}
                          </code>
                        </td>
                        <td className="py-3.5 px-5 capitalize text-neutral-600">
                          {t.category || "General"}
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-xs border ${
                              t.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-600/15"
                                : "bg-neutral-100 text-neutral-600 border-neutral-900/[0.08]"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                t.is_active ? "bg-emerald-600" : "bg-neutral-400"
                              }`}
                            />
                            {t.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingType(t)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Edit type"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteType(t)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Delete type"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <p className="font-medium text-neutral-900 text-sm">No request types configured</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          Select Add request type above to create the first one
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Categories */}
        {activeTab === "categories" && (
          <div className="space-y-4">
            {editingCategory !== false ? (
              <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6 space-y-5">
                <h3 className="text-base font-medium text-neutral-900 font-headline">
                  {typeof editingCategory === "object" ? "Edit category" : "New category"}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {typeof editingCategory !== "object" && (
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1.5">Module or group</label>
                      <SelectBox
                        value={categoryForm.group_id}
                        onChange={(e) => setCategoryForm((p) => ({ ...p, group_id: e.target.value }))}
                        className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                      >
                        <option value="">Select module</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </SelectBox>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">Category name</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Office supplies"
                      className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">Code</label>
                    <input
                      type="text"
                      value={categoryForm.code}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, code: e.target.value }))}
                      placeholder="OFFICE"
                      disabled={typeof editingCategory === "object"}
                      className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm font-mono text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15 disabled:opacity-50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">Description</label>
                    <input
                      type="text"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Optional description"
                      className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveCategory()}
                    disabled={categorySaving}
                    className="h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] disabled:opacity-50"
                  >
                    {categorySaving ? "Saving" : typeof editingCategory === "object" ? "Update category" : "Create category"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(false);
                      setCategoryForm({ group_id: "", name: "", code: "", description: "" });
                    }}
                    className="h-9 px-4 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-neutral-50 text-neutral-700 text-sm font-medium transition-colors duration-150"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-900/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-medium text-neutral-900 font-headline">Request categories</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">Organize request classifications by domain</p>
                  </div>
                  <SelectBox
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-700 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                  >
                    <option value="">All modules</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </SelectBox>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/80 text-xs text-neutral-500 font-medium border-b border-neutral-900/[0.08]">
                        <th className="py-3 px-5">Name</th>
                        <th className="py-3 px-5">Code</th>
                        <th className="py-3 px-5">Module</th>
                        <th className="py-3 px-5">Status</th>
                        <th className="py-3 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <tr key={cat.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                            <td className="py-3.5 px-5 font-medium text-neutral-900">{cat.name}</td>
                            <td className="py-3.5 px-5">
                              <code className="text-xs font-mono bg-neutral-100 border border-neutral-900/[0.06] px-2 py-0.5 rounded-md text-neutral-700">
                                {cat.code}
                              </code>
                            </td>
                            <td className="py-3.5 px-5 text-neutral-600">{groupMap[cat.groupId] || "—"}</td>
                            <td className="py-3.5 px-5">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-xs bg-emerald-50 text-emerald-700 border border-emerald-600/15">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Active
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory(cat);
                                    setCategoryForm({
                                      group_id: cat.groupId || "",
                                      name: cat.name,
                                      code: cat.code,
                                      description: "",
                                    });
                                  }}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                                  title="Edit category"
                                >
                                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteCategory(cat)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                                  title="Delete category"
                                >
                                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-sm text-neutral-500">
                            No categories found for this module
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Taxonomies */}
        {activeTab === "taxonomy" && (
          <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-900/[0.08] flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-medium text-neutral-900 font-headline">Taxonomies and term catalogs</h2>
                <p className="text-xs text-neutral-500 mt-0.5">Custom controlled vocabularies and dropdown term sets</p>
              </div>
              <span className="text-xs font-mono text-neutral-500 tabular-nums shrink-0">{taxonomies.length} sets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/80 text-xs text-neutral-500 font-medium border-b border-neutral-900/[0.08]">
                    <th className="py-3 px-5">Taxonomy name</th>
                    <th className="py-3 px-5">Key identifier</th>
                    <th className="py-3 px-5">Module</th>
                    <th className="py-3 px-5 text-right">Terms</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                  {taxonomies.length > 0 ? (
                    taxonomies.map((tax) => (
                      <tr key={tax.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                        <td className="py-3.5 px-5 font-medium text-neutral-900">{tax.name}</td>
                        <td className="py-3.5 px-5">
                          <code className="text-xs font-mono bg-neutral-100 border border-neutral-900/[0.06] px-2 py-0.5 rounded-md text-neutral-700">
                            {tax.key}
                          </code>
                        </td>
                        <td className="py-3.5 px-5 text-neutral-600">{tax.module || "—"}</td>
                        <td className="py-3.5 px-5 text-right font-mono text-xs text-neutral-700 tabular-nums">
                          {tax.terms.length}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingTaxonomy(tax)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Edit taxonomy"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteTaxonomy(tax)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-rose-50 text-neutral-400 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Delete taxonomy"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-neutral-500">
                        No taxonomies created yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Workspace Profile */}
        {activeTab === "general" && (
          <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6 space-y-6">
            <div>
              <h2 className="text-base font-medium text-neutral-900 font-headline">Workspace profile</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Manage your organization identity, multi-tenant subdomain slug, and subscription plan
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Organization name</label>
                <input
                  type="text"
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Subscription plan</label>
                <SelectBox
                  value={tenantForm.plan}
                  onChange={(e) => setTenantForm((p) => ({ ...p, plan: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                >
                  <option value="trial">Trial plan (14 days free)</option>
                  <option value="standard">Standard growth plan</option>
                  <option value="enterprise">Enterprise OS dedicated</option>
                </SelectBox>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-900/[0.08] flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-neutral-900">Workspace subdomain</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Team sign-in URL:{" "}
                  <code className="font-mono text-[#c2410c] font-medium">
                    {tenant?.slug || "workspace"}.stanforteedge.com
                  </code>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-xs bg-emerald-50 text-emerald-700 border border-emerald-600/15 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Active
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => void handleSaveTenant()}
                disabled={tenantSaving}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] disabled:opacity-50"
              >
                <Save className="h-4 w-4" strokeWidth={1.5} />
                <span>{tenantSaving ? "Saving" : "Save workspace changes"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab: Timezone & Regional Localization */}
        {activeTab === "localization" && (
          <div className="space-y-6">
            {/* Live Preview Card */}
            <div className="rounded-2xl border border-neutral-900/[0.08] bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#c2410c]">
                    <Globe className="h-4 w-4" strokeWidth={1.5} />
                    <span>Live display preview</span>
                  </div>
                  <h3 className="text-2xl font-medium text-neutral-900 font-headline tabular-nums mt-1">
                    {formatDisplayTime(new Date(), localSettingsForm.timeFormat)}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono mt-0.5 tabular-nums">
                    {formatDisplayDateLocalized(new Date(), localSettingsForm.dateFormat)} · {localSettingsForm.timezone}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-900/[0.08] text-left">
                    <div className="text-xs text-neutral-500">Shift hours preview</div>
                    <div className="text-sm font-mono font-medium text-neutral-900 tabular-nums mt-0.5">
                      {formatDisplayTime("09:00", localSettingsForm.timeFormat)} – {formatDisplayTime("17:00", localSettingsForm.timeFormat)}
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-900/[0.08] text-left">
                    <div className="text-xs text-neutral-500">Time format</div>
                    <div className="text-sm font-medium text-neutral-900 mt-0.5">
                      {localSettingsForm.timeFormat === "12h" ? "12-hour (1 AM, 3 PM)" : "24-hour (13:00)"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-2xl border border-neutral-900/[0.08] shadow-xs p-6 space-y-6">
              <div>
                <h2 className="text-base font-medium text-neutral-900 font-headline">Timezone and regional formatting</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Configure the primary organization timezone and time/date display standards. Nigerian workforces typically prefer 12-hour AM/PM and DD/MM/YYYY.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Organization timezone
                  </label>
                  <SelectBox
                    value={localSettingsForm.timezone}
                    onChange={(e) => setLocalSettingsForm((p) => ({ ...p, timezone: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </SelectBox>
                  <p className="text-xs text-neutral-500 mt-1.5">
                    Used to calculate work sessions, attendance punches, scheduled reports, and payroll timestamps
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-2">
                    Time display format
                  </label>
                  <div className="space-y-2">
                    {TIME_FORMAT_OPTIONS.map((opt) => {
                      const isSelected = localSettingsForm.timeFormat === opt.value;
                      return (
                        <label
                          key={opt.value}
                          onClick={() => setLocalSettingsForm((p) => ({ ...p, timeFormat: opt.value }))}
                          className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-colors duration-150 ${
                            isSelected
                              ? "border-[#ff6900] bg-orange-50/30"
                              : "border-neutral-900/[0.10] bg-white hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="timeFormat"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-0.5 h-4 w-4 text-[#ff6900] focus:ring-[#ff6900]"
                            />
                            <div>
                              <div className="text-sm font-medium text-neutral-900">{opt.label}</div>
                              <div className="text-xs text-neutral-500 mt-0.5 font-mono tabular-nums">
                                {opt.preview}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-[#c2410c] shrink-0" strokeWidth={1.5} />}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-2">
                    Date display format
                  </label>
                  <div className="space-y-2">
                    {DATE_FORMAT_OPTIONS.map((opt) => {
                      const isSelected = localSettingsForm.dateFormat === opt.value;
                      return (
                        <label
                          key={opt.value}
                          onClick={() => setLocalSettingsForm((p) => ({ ...p, dateFormat: opt.value }))}
                          className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-colors duration-150 ${
                            isSelected
                              ? "border-[#ff6900] bg-orange-50/30"
                              : "border-neutral-900/[0.10] bg-white hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="dateFormat"
                              checked={isSelected}
                              onChange={() => {}}
                              className="mt-0.5 h-4 w-4 text-[#ff6900] focus:ring-[#ff6900]"
                            />
                            <div>
                              <div className="text-sm font-medium text-neutral-900">{opt.label}</div>
                              <div className="text-xs text-neutral-500 mt-0.5 font-mono tabular-nums">
                                {opt.preview}
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-[#c2410c] shrink-0" strokeWidth={1.5} />}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    First day of week
                  </label>
                  <SelectBox
                    value={localSettingsForm.weekStartsOn}
                    onChange={(e) =>
                      setLocalSettingsForm((p) => ({ ...p, weekStartsOn: e.target.value as any }))
                    }
                    className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                  >
                    <option value="monday">Monday (Nigeria / International standard)</option>
                    <option value="sunday">Sunday (US standard)</option>
                  </SelectBox>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                    Operating currency
                  </label>
                  <SelectBox
                    value={localSettingsForm.currency}
                    onChange={(e) => setLocalSettingsForm((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-neutral-900/[0.12] text-sm text-neutral-900 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
                  >
                    <option value="NGN">NGN (₦) — Nigerian Naira (Default)</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                    <option value="EUR">EUR (€) — Euro</option>
                  </SelectBox>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-900/[0.08]">
                <button
                  type="button"
                  onClick={() => handleResetLocalization()}
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-neutral-50 text-neutral-700 text-sm font-medium transition-colors duration-150"
                >
                  <RotateCcw className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
                  <span>Reset to Nigeria standards</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveLocalization()}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98]"
                >
                  <Save className="h-4 w-4" strokeWidth={1.5} />
                  <span>Save regional preferences</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Security & Access */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
                <p className="text-xs text-neutral-500">Configured roles</p>
                <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                  {securityOverview?.roles != null ? Number(securityOverview.roles).toLocaleString() : "—"}
                </p>
                <p className="text-xs text-neutral-500">Defined access profiles</p>
              </article>

              <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
                <p className="text-xs text-neutral-500">Active permissions</p>
                <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                  {securityOverview?.permissions != null ? Number(securityOverview.permissions).toLocaleString() : "—"}
                </p>
                <p className="text-xs text-neutral-500">Enforced capabilities</p>
              </article>

              <article className="p-5 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs space-y-2">
                <p className="text-xs text-neutral-500">Assigned users</p>
                <p className="text-[28px] leading-none font-medium text-neutral-900 font-headline tabular-nums">
                  {securityOverview?.assigned_users != null ? Number(securityOverview.assigned_users).toLocaleString() : "—"}
                </p>
                <p className="text-xs text-neutral-500">Active role bindings</p>
              </article>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-medium text-neutral-900 font-headline">Role-based access control (RBAC)</h3>
                <p className="text-xs text-neutral-500 mt-0.5 max-w-xl">
                  Granular control over who can create requests, approve payment vouchers, disburse funds, or administer users
                </p>
              </div>
              <Link
                to="/admin/roles"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] shrink-0"
              >
                <span>Manage roles</span>
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        )}
      </div>

      {editingType !== false && (
        <RequestTypeSlideOver
          requestType={typeof editingType === "object" ? editingType : null}
          onClose={() => setEditingType(false)}
          onSaved={() => {
            setEditingType(false);
            void load();
          }}
        />
      )}
      {editingTaxonomy !== false && (
        <TaxonomySlideOver
          taxonomy={typeof editingTaxonomy === "object" ? editingTaxonomy : null}
          onClose={() => setEditingTaxonomy(false)}
          onSaved={() => {
            setEditingTaxonomy(false);
            void loadTaxonomies();
          }}
        />
      )}
    </PortalLayout>
  );
}
