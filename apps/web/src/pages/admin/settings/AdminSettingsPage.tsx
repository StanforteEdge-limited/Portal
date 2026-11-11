import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
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
      const res = await httpRequest<any>("/auth/roles/overview");
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-slate-800 transition">Dashboard</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-800 font-semibold">Settings</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Workspace & System Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure tenant parameters, request approval workflows, taxonomy dictionaries, and security.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "types" && (
              <button
                type="button"
                onClick={() => setEditingType(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Add Request Type</span>
              </button>
            )}
            {activeTab === "categories" && (
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(true);
                  setCategoryForm({ group_id: groups[0]?.id || "", name: "", code: "", description: "" });
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Add Category</span>
              </button>
            )}
            {activeTab === "taxonomy" && (
              <button
                type="button"
                onClick={() => setEditingTaxonomy(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Add Taxonomy</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast feedback */}
        {toastMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              toastMsg.tone === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {toastMsg.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <IconComp className={`h-4 w-4 ${isActive ? "text-[#ff6900]" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Request Types */}
        {activeTab === "types" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Configured Request Types</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define custom schemas, approval stages, and notification rules per request type.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {types.length} total types
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-5">Type Name</th>
                    <th className="py-3.5 px-4">Prefix / Slug</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Loading request types...
                      </td>
                    </tr>
                  ) : types.length > 0 ? (
                    types.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {t.name}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {t.slug}
                        </td>
                        <td className="py-3.5 px-4 capitalize font-semibold text-slate-700">
                          {t.category || "General"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              t.is_active
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                t.is_active ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            {t.is_active ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingType(t)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition"
                              title="Edit Type"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteType(t)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                              title="Delete Type"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <p className="font-semibold text-slate-700 text-sm">No request types configured</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Click &quot;Add Request Type&quot; above to create the first one.
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
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">
                  {typeof editingCategory === "object" ? "Edit Category" : "New Category"}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {typeof editingCategory !== "object" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Module / Group</label>
                      <select
                        value={categoryForm.group_id}
                        onChange={(e) => setCategoryForm((p) => ({ ...p, group_id: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20"
                      >
                        <option value="">Select module</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category Name</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Office Supplies"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Code</label>
                    <input
                      type="text"
                      value={categoryForm.code}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, code: e.target.value }))}
                      placeholder="e.g., OFFICE"
                      disabled={typeof editingCategory === "object"}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Optional description"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveCategory()}
                    disabled={categorySaving}
                    className="px-4 py-2 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {categorySaving ? "Saving..." : typeof editingCategory === "object" ? "Update Category" : "Create Category"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(false);
                      setCategoryForm({ group_id: "", name: "", code: "", description: "" });
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Request Categories</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Organize request classifications by domain.</p>
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
                  >
                    <option value="">All modules</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3.5 px-5">Name</th>
                        <th className="py-3.5 px-4">Code</th>
                        <th className="py-3.5 px-4">Module</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <tr key={cat.id} className="hover:bg-slate-50/60 transition">
                            <td className="py-3.5 px-5 font-bold text-slate-900">{cat.name}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">{cat.code}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">{groupMap[cat.groupId] || "-"}</td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-emerald-50 text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <div className="flex items-center justify-end gap-2">
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
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteCategory(cat)}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-slate-400">
                            No categories found for this module.
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Taxonomies & Term Catalogs</h2>
                <p className="text-xs text-slate-500 mt-0.5">Custom controlled vocabularies and dropdown term sets.</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{taxonomies.length} sets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-5">Taxonomy Name</th>
                    <th className="py-3.5 px-4">Key Identifier</th>
                    <th className="py-3.5 px-4">Module</th>
                    <th className="py-3.5 px-4">Terms Count</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {taxonomies.length > 0 ? (
                    taxonomies.map((tax) => (
                      <tr key={tax.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-5 font-bold text-slate-900">{tax.name}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{tax.key}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{tax.module || "-"}</td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                            {tax.terms.length} terms
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingTaxonomy(tax)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteTaxonomy(tax)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        No taxonomies created yet.
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Workspace Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your organization’s identity, multi-tenant subdomain slug, and subscription plan.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subscription Plan</label>
                <select
                  value={tenantForm.plan}
                  onChange={(e) => setTenantForm((p) => ({ ...p, plan: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="trial">Trial Plan (14 Days Free)</option>
                  <option value="standard">Standard Growth Plan</option>
                  <option value="enterprise">Enterprise OS Dedicated</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Workspace Subdomain URL</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Your team logs in at <span className="font-mono text-[#ff6900] font-semibold">{tenant?.slug || "acme"}.stanforteedge.com</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Active
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => void handleSaveTenant()}
                disabled={tenantSaving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{tenantSaving ? "Saving..." : "Save Workspace Changes"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab: Timezone & Regional Localization */}
        {activeTab === "localization" && (
          <div className="space-y-6">
            {/* Live Preview Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-[#0a1128] text-white p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-52 h-52 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Live Display Preview</span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">
                    {formatDisplayTime(new Date(), localSettingsForm.timeFormat)}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {formatDisplayDateLocalized(new Date(), localSettingsForm.dateFormat)} &bull; {localSettingsForm.timezone}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-left">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Shift Hours Preview</div>
                    <div className="text-xs font-bold text-orange-400 mt-0.5">
                      {formatDisplayTime("09:00", localSettingsForm.timeFormat)} – {formatDisplayTime("17:00", localSettingsForm.timeFormat)}
                    </div>
                  </div>

                  <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-left">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Time Format</div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {localSettingsForm.timeFormat === "12h" ? "12-hour (1 AM, 3 PM)" : "24-hour (13:00)"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Form */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Timezone &amp; Regional Formatting</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the primary organization timezone and time/date display standards. Nigerian workforces typically prefer 12-hour AM/PM and DD/MM/YYYY.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* 1. Timezone Selector */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Organization Timezone
                  </label>
                  <select
                    value={localSettingsForm.timezone}
                    onChange={(e) => setLocalSettingsForm((p) => ({ ...p, timezone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#ff6900]"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used to calculate work sessions, attendance punches, scheduled reports, and payroll timestamps.
                  </p>
                </div>

                {/* 2. Time Format (12h vs 24h) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Time Display Format
                  </label>
                  <div className="space-y-2.5">
                    {TIME_FORMAT_OPTIONS.map((opt) => {
                      const isSelected = localSettingsForm.timeFormat === opt.value;
                      return (
                        <label
                          key={opt.value}
                          onClick={() => setLocalSettingsForm((p) => ({ ...p, timeFormat: opt.value }))}
                          className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition ${
                            isSelected
                              ? "border-[#ff6900] bg-orange-50/20 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
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
                              <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                e.g. <span className="font-semibold text-slate-700">{opt.preview}</span>
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#ff6900] shrink-0" />}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Date Format */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Date Display Format
                  </label>
                  <div className="space-y-2.5">
                    {DATE_FORMAT_OPTIONS.map((opt) => {
                      const isSelected = localSettingsForm.dateFormat === opt.value;
                      return (
                        <label
                          key={opt.value}
                          onClick={() => setLocalSettingsForm((p) => ({ ...p, dateFormat: opt.value }))}
                          className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition ${
                            isSelected
                              ? "border-[#ff6900] bg-orange-50/20 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
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
                              <div className="text-xs font-bold text-slate-900">{opt.label}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                e.g. <span className="font-semibold text-slate-700">{opt.preview}</span>
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#ff6900] shrink-0" />}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 4. First Day of Week */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    First Day of Week
                  </label>
                  <select
                    value={localSettingsForm.weekStartsOn}
                    onChange={(e) =>
                      setLocalSettingsForm((p) => ({ ...p, weekStartsOn: e.target.value as any }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#ff6900]"
                  >
                    <option value="monday">Monday (Nigeria / International Standard)</option>
                    <option value="sunday">Sunday (US Standard)</option>
                  </select>
                </div>

                {/* 5. Currency */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Operating Currency
                  </label>
                  <select
                    value={localSettingsForm.currency}
                    onChange={(e) => setLocalSettingsForm((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#ff6900]"
                  >
                    <option value="NGN">NGN (₦) — Nigerian Naira (Default)</option>
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="GBP">GBP (£) — British Pound</option>
                    <option value="EUR">EUR (€) — Euro</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleResetLocalization()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  <span>Reset to Nigeria Standards</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveLocalization()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Regional Preferences</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Security & Access */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Configured Roles</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{securityOverview?.roles ?? 6}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Active Permissions</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{securityOverview?.permissions ?? 48}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Assigned Users</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{securityOverview?.assigned_users ?? 12}</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Role-Based Access Control (RBAC)</h3>
                <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                  Granular control over who can create requests, approve payment vouchers, disburse funds, or administer users.
                </p>
              </div>
              <Link
                to="/admin/roles"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a1128] hover:bg-[#162044] text-white text-xs font-bold transition shadow-sm"
              >
                <span>Manage Roles & Permissions</span>
                <ExternalLink className="h-3.5 w-3.5" />
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
