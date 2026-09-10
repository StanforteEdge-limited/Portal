import { useState, useEffect, useMemo } from "react";
import {
  AppShell,
  PageHeader,
  Button,
  Chip,
  Icon,
  SectionCard,
  TextField,
  SelectField,
  TextAreaField,
  useToast,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import { useAuth } from "@/shared/context/AuthProvider";
import { cacheStore, requestApi, httpRequest } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { type RequestType } from "@stanforte/shared";
import RequestTypeSlideOver from "@/pages/admin/request-types/RequestTypeSlideOver";
import { listCategories as apiListCategories, createCategory, updateCategory, deleteCategory, type RequestCategoryOption } from "@/pages/requests/requests-api";
import type { RequestGroupOption } from "@/pages/requests/requests-api";
import { listManagedTaxonomies, deleteTaxonomy, type ManagedTaxonomy } from "@/pages/requests/taxonomy-api";
import TaxonomySlideOver from "@/pages/admin/taxonomies/TaxonomySlideOver";

type ActiveTab = "requests" | "general" | "security" | "taxonomy";
type RequestsSubTab = "types" | "categories";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [types, setTypes] = useState<RequestType[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("requests");
  const [requestsSubTab, setRequestsSubTab] = useState<RequestsSubTab>("types");
  const [editingType, setEditingType] = useState<RequestType | null | boolean>(false);
  const [categories, setCategories] = useState<RequestCategoryOption[]>([]);
  const [editingCategory, setEditingCategory] = useState<RequestCategoryOption | null | boolean>(false);
  const [categoryForm, setCategoryForm] = useState({ group_id: "", name: "", code: "", description: "" });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [taxonomies, setTaxonomies] = useState<ManagedTaxonomy[]>([]);
  const [editingTaxonomy, setEditingTaxonomy] = useState<ManagedTaxonomy | null | boolean>(false);



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
        requestApi.listTypes(),
        requestApi.listGroups(),
      ]);
      setTypes(res);
      setGroups(groupsRes as { id: string; name: string }[]);
    } catch (err) {
      showToast({ tone: "danger", title: "Error", message: "Failed to load request types." });
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await apiListCategories(filterByGroup(categoryFilter) || undefined);
      setCategories(res as RequestCategoryOption[]);
    } catch (err) {
      showToast({ tone: "danger", title: "Error", message: "Failed to load categories." });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [categoryFilter]);

  useEffect(() => {
    if (activeTab === "requests" && requestsSubTab === "categories") {
      void loadCategories();
    }
  }, [activeTab, requestsSubTab]);

  const filterByGroup = (id: string) => id && groups.some((g) => g.id === id) ? id : "";

  const handleDeleteType = async (type: RequestType) => {
    if (!window.confirm(`Delete request type "${type.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await requestApi.deleteType(type.id);
      cacheStore.invalidateCache("requests:types");
      cacheStore.invalidateCache("hr:leave_types");
      showToast({ tone: "success", title: "Deleted", message: `${type.name} has been removed.` });
      void load();
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Unable to delete type.",
      });
    }
  };

  const handleDeleteCategory = async (cat: RequestCategoryOption) => {
    if (!window.confirm(`Delete category "${cat.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteCategory(cat.id);
      cacheStore.invalidateCache("requests:categories");
      showToast({ tone: "success", title: "Deleted", message: `${cat.name} has been removed.` });
      void loadCategories();
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Unable to delete category.",
      });
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.code.trim()) {
      showToast({ tone: "warning", title: "Required", message: "Name and code are required." });
      return;
    }
    if (!editingCategory && !categoryForm.group_id) {
      showToast({ tone: "warning", title: "Required", message: "Select a group/module." });
      return;
    }
    try {
      setCategorySaving(true);
      if (typeof editingCategory === "object" && editingCategory !== null) {
        await updateCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          code: categoryForm.code.trim(),
          description: categoryForm.description.trim() || undefined,
        });
      } else {
        await createCategory({
          group_id: categoryForm.group_id,
          name: categoryForm.name.trim(),
          code: categoryForm.code.trim(),
          description: categoryForm.description.trim() || undefined,
        });
      }
      showToast({
        tone: "success",
        title: typeof editingCategory === "object" ? "Updated" : "Created",
        message: `${categoryForm.name} has been saved.`,
      });
      setEditingCategory(false);
      setCategoryForm({ group_id: "", name: "", code: "", description: "" });
      void loadCategories();
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Save failed",
        message: err instanceof Error ? err.message : "Unable to save category.",
      });
    } finally {
      setCategorySaving(false);
    }
  };

  const openNewCategory = () => {
    setCategoryForm({ group_id: "", name: "", code: "", description: "" });
    setEditingCategory(true);
  };

  const openEditCategory = (cat: RequestCategoryOption) => {
    setCategoryForm({
      group_id: cat.groupId,
      name: cat.name,
      code: cat.code,
      description: cat.description || "",
    });
    setEditingCategory(cat);
  };

  const loadTaxonomies = async () => {
    try {
      const res = await listManagedTaxonomies({ include_inactive: true });
      setTaxonomies(res);
    } catch (err) {
      showToast({ tone: "danger", title: "Error", message: "Failed to load taxonomies." });
    }
  };

  useEffect(() => {
    if (activeTab === "taxonomy") {
      void loadTaxonomies();
    }
  }, [activeTab]);

  const handleDeleteTaxonomy = async (tax: ManagedTaxonomy) => {
    if (!window.confirm(`Delete taxonomy "${tax.name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteTaxonomy(tax.id);
      showToast({ tone: "success", title: "Deleted", message: `${tax.name} has been removed.` });
      void loadTaxonomies();
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Delete failed",
        message: err instanceof Error ? err.message : "Unable to delete taxonomy.",
      });
    }
  };

  const navItems = [
    { id: "requests" as ActiveTab, label: "Requests", icon: "assignment" },
    { id: "taxonomy" as ActiveTab, label: "Taxonomy", icon: "category" },
    { id: "general" as ActiveTab, label: "General Settings", icon: "tune" },
    { id: "security" as ActiveTab, label: "Security & Access", icon: "security" },
  ];

  const requestsSubTabs: { id: RequestsSubTab; label: string }[] = [
    { id: "types", label: "Types" },
    { id: "categories", label: "Categories" },
  ];

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Admin";

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="admin-settings"
      user={{
        name: userName,
        role: "System Administrator",
      }}
      mobileNav={buildAppMobileNav()}
    >
      <PageHeader
        breadcrumbs={[{ label: "Administration", path: "/admin/users" }, { label: "System Settings" }]}
        title="System Settings"
        description="Manage global system configurations and business rules."
      />

      <div className="mt-6 space-y-6">
        {/* Top Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === item.id
                  ? "border-brand-900 text-brand-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-w-0">
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {activeTab === "requests"
                    ? requestsSubTab === "types" ? "Request Types" : "Request Categories"
                    : navItems.find((i) => i.id === activeTab)?.label || "Settings"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {activeTab === "requests" && requestsSubTab === "types" && "Global list of all request types and their workflows."}
                  {activeTab === "requests" && requestsSubTab === "categories" && "Manage request categories organized by module."}
                  {activeTab === "taxonomy" && "Manage global taxonomies and their terms."}
                  {activeTab === "general" && "General system configurations."}
                  {activeTab === "security" && "Security and access control settings."}
                </p>
              </div>
              {activeTab === "requests" && requestsSubTab === "types" && (
                <Button onClick={() => setEditingType(true)}>
                  <Icon name="add" className="mr-1" />
                  Add Type
                </Button>
              )}
              {activeTab === "requests" && requestsSubTab === "categories" && (
                <Button onClick={openNewCategory}>
                  <Icon name="add" className="mr-1" />
                  Add Category
                </Button>
              )}
              {activeTab === "taxonomy" && (
                <Button onClick={() => setEditingTaxonomy(true)}>
                  <Icon name="add" className="mr-1" />
                  Add Taxonomy
                </Button>
              )}
            </div>

            {activeTab === "requests" && (
              <>
                {/* Sub-tab navigation */}
                <div className="flex items-center gap-1 mb-6">
                  {requestsSubTabs.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setRequestsSubTab(sub.id)}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                        requestsSubTab === sub.id
                          ? "bg-brand-900 text-white"
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {requestsSubTab === "types" && (
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-sm text-slate-500">Loading request types...</div>
                    ) : types.length > 0 ? (
                      <DataTable
                        columns={[
                          { header: "Name", className: "font-bold text-slate-900", cell: (t) => t.name },
                          { header: "Slug/Prefix", className: "font-mono text-xs", cell: (t) => t.slug },
                          { header: "Module", className: "text-xs text-slate-500", cell: () => "-" },
                          { header: "Category", className: "capitalize", cell: (t) => t.category || "General" },
                          { header: "Status", cell: (t) => (
                            <Chip variant={t.is_active ? "success" : "neutral"}>
                              {t.is_active ? "Active" : "Disabled"}
                            </Chip>
                          )},
                          { header: "Actions", className: "text-right", cell: (t) => (
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingType(t)}>
                                <Icon name="edit" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/5" onClick={() => void handleDeleteType(t)}>
                                <Icon name="delete" />
                              </Button>
                            </div>
                          )}
                        ]}
                        data={types}
                      />
                    ) : (
                      <div className="py-10 text-center text-slate-400">
                        No request types found.
                      </div>
                    )}
                  </div>
                )}

                {requestsSubTab === "categories" && (
                  <div className="space-y-4">
                    {editingCategory !== false ? (
                      <div className="rounded-[22px] border border-slate-200 bg-white p-6 space-y-4">
                        <h4 className="text-base font-bold text-slate-900">
                          {typeof editingCategory === "object" ? "Edit Category" : "New Category"}
                        </h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          {typeof editingCategory !== "object" && (
                            <SelectField
                              label="Module"
                              value={categoryForm.group_id}
                              onChange={(e) => setCategoryForm((p) => ({ ...p, group_id: e.target.value }))}
                            >
                              <option value="">Select module</option>
                              {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </SelectField>
                          )}
                          <TextField
                            label="Name"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder="e.g., Office Supplies"
                          />
                          <TextField
                            label="Code"
                            value={categoryForm.code}
                            onChange={(e) => setCategoryForm((p) => ({ ...p, code: e.target.value }))}
                            placeholder="e.g., OFFICE"
                            disabled={typeof editingCategory === "object"}
                          />
                          <div className="md:col-span-2">
                            <TextField
                              label="Description"
                              value={categoryForm.description}
                              onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                              placeholder="Optional description"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={() => void handleSaveCategory()} disabled={categorySaving}>
                            {categorySaving ? "Saving..." : typeof editingCategory === "object" ? "Update" : "Create"}
                          </Button>
                          <Button variant="ghost" onClick={() => { setEditingCategory(false); setCategoryForm({ group_id: "", name: "", code: "", description: "" }); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <SelectField
                            label="Filter by Module"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                          >
                            <option value="">All modules</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </SelectField>
                        </div>
                        {categories.length > 0 ? (
                          <DataTable
                            columns={[
                              { header: "Name", className: "font-bold text-slate-900", cell: (cat) => cat.name },
                              { header: "Code", className: "font-mono text-xs", cell: (cat) => cat.code },
                              { header: "Module", className: "text-xs text-slate-500", cell: (cat) => groupMap[cat.groupId] || "-" },
                              { header: "Status", cell: (cat) => (
                                <Chip variant={cat.isActive !== false ? "success" : "neutral"}>
                                  {cat.isActive !== false ? "Active" : "Disabled"}
                                </Chip>
                              )},
                              { header: "Actions", className: "text-right", cell: (cat) => (
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => openEditCategory(cat)}>
                                    <Icon name="edit" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/5" onClick={() => void handleDeleteCategory(cat)}>
                                    <Icon name="delete" />
                                  </Button>
                                </div>
                              )}
                            ]}
                            data={categories}
                          />
                        ) : (
                          <div className="py-10 text-center text-slate-400">
                            No categories found.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "taxonomy" && (
              <div className="space-y-4">
                {taxonomies.length > 0 ? (
                  <DataTable
                    columns={[
                      { header: "Name", className: "font-bold text-slate-900", cell: (tax) => tax.name },
                      { header: "Key", className: "font-mono text-xs", cell: (tax) => tax.key },
                      { header: "Module", className: "text-xs text-slate-500", cell: (tax) => tax.module || "-" },
                      { header: "Terms", className: "text-xs text-slate-500", cell: (tax) => tax.terms.length },
                      { header: "Status", cell: (tax) => (
                        <Chip variant={tax.is_active ? "success" : "neutral"}>
                          {tax.is_active ? "Active" : "Disabled"}
                        </Chip>
                      )},
                      { header: "Actions", className: "text-right", cell: (tax) => (
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingTaxonomy(tax)}>
                            <Icon name="edit" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/5" onClick={() => void handleDeleteTaxonomy(tax)}>
                            <Icon name="delete" />
                          </Button>
                        </div>
                      )}
                    ]}
                    data={taxonomies}
                  />
                ) : (
                  <div className="py-10 text-center text-slate-400">
                    No taxonomies found.
                  </div>
                )}
              </div>
            )}

            {activeTab === "general" && (
              <div className="py-10 text-center text-slate-400">
                General system settings coming soon.
              </div>
            )}

            {activeTab === "security" && (
              <div className="py-10 text-center text-slate-400">
                Security and access control settings coming soon.
              </div>
            )}
          </SectionCard>
        </div>
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
    </AppShell>
  );
}
