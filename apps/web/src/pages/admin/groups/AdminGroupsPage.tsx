import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, resourceApi } from "@/shared/lib/core";
import { useToast } from "@/shared";
import type { TeamOption } from "@stanforte/shared";
import AdminGroupSlideOver from "./AdminGroupSlideOver";
import AdminGroupTypeSlideOver from "./AdminGroupTypeSlideOver";
import {
  Users,
  Building2,
  FolderTree,
  Plus,
  Search,
  ChevronRight,
  Pencil,
  Trash2,
  CheckCircle2,
  Layers,
  Filter,
  RotateCcw,
} from "lucide-react";

type ActiveTab = "groups" | "types";

const DEFAULT_TYPES = [
  {
    id: "team",
    name: "Team",
    slug: "team",
    description: "Standard operational work team",
  },
  {
    id: "department",
    name: "Department",
    slug: "department",
    description: "Core organizational department",
  },
];

export default function AdminGroupsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>("groups");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listKey, setListKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TeamOption | null>(null);

  const [groupTypes, setGroupTypes] = useState(DEFAULT_TYPES);
  const [showCreateType, setShowCreateType] = useState(false);
  const [editingType, setEditingType] = useState<{
    id: string;
    name: string;
    slug: string;
    description: string;
  } | null>(null);

  const {
    data: groupsData,
    loading: groupsLoading,
    refetch: refetchGroups,
  } = useCachedQuery(
    `admin:groups:${listKey}:${search}:${typeFilter}:${statusFilter}`,
    () => resourceApi.listGroups(),
    { ttlMs: 0, storage: "memory" },
  );

  const teams: TeamOption[] = Array.isArray((groupsData as any)?.data?.items)
    ? (groupsData as any).data.items
    : Array.isArray(groupsData)
    ? groupsData
    : [];

  const activeGroups = teams.filter((g) => g.isActive).length;
  const inactiveGroups = teams.length - activeGroups;

  const filteredGroups = teams.filter((g) => {
    if (typeFilter !== "all" && g.groupType !== typeFilter) return false;
    if (statusFilter === "active" && !g.isActive) return false;
    if (statusFilter === "inactive" && g.isActive) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!g.name.toLowerCase().includes(s) && !g.description?.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  const handleDeleteGroup = async (group: TeamOption) => {
    if (!window.confirm(`Are you sure you want to remove "${group.name}"?`)) return;
    try {
      await resourceApi.deleteGroup(group.id);
      showToast(`Group "${group.name}" removed successfully.`, "success");
      setListKey((k) => k + 1);
    } catch (err: any) {
      showToast(err?.message || "Failed to delete group", "error");
    }
  };

  return (
    <PortalLayout activeNav="Teams & Departments">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-slate-800 transition">
                Dashboard
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/teams" className="hover:text-slate-800 transition">
                Governance & Structure
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-800 font-semibold">Groups & Teams</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Groups & Functional Teams
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure operating units, departments, and cross-subsidiary workforce coverage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === "groups" ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Group</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateType(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Add Group Type</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Total Groups</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{teams.length}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Cataloged
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Active Units</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{activeGroups}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Operational
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FolderTree className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Classification Types</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{groupTypes.length}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Taxonomy
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Inactive / Archived</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{inactiveGroups}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Historical
            </span>
          </div>
        </div>

        {/* Tab & Toolbar Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "groups"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Groups Directory ({teams.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("types")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "types"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FolderTree className="h-3.5 w-3.5" />
              <span>Types & Categories ({groupTypes.length})</span>
            </button>
          </div>

          {activeTab === "groups" && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search input */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter groups..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20"
              >
                <option value="all">All Types</option>
                {groupTypes.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* Refetch button */}
              <button
                type="button"
                onClick={() => void refetchGroups()}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                title="Refresh list"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Groups Directory */}
        {activeTab === "groups" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Group Name</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {groupsLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                        <div className="w-6 h-6 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading groups directory...
                      </td>
                    </tr>
                  ) : filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <div className="font-bold text-slate-700">No groups found</div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Try adjusting your search filters or create a new group.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((group) => (
                      <tr key={group.id} className="hover:bg-slate-50/60 transition group">
                        <td className="py-3 px-5">
                          <div className="font-bold text-slate-900">{group.name}</div>
                          {group.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 max-w-md truncate">
                              {group.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {group.groupType || "team"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              group.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {group.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingGroup(group)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                              title="Edit group"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group)}
                              className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition"
                              title="Remove group"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Group Types */}
        {activeTab === "types" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Type Name</th>
                    <th className="py-3 px-4">Slug Identifier</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {groupTypes.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-5 font-bold text-slate-900">{t.name}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {t.slug}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{t.description}</td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingType(t)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Slide-over for Add/Edit Group */}
        {(showCreate || editingGroup) && (
          <AdminGroupSlideOver
            group={editingGroup}
            types={groupTypes}
            onClose={() => {
              setShowCreate(false);
              setEditingGroup(null);
            }}
            onSaved={() => {
              setShowCreate(false);
              setEditingGroup(null);
              setListKey((k) => k + 1);
            }}
          />
        )}

        {/* Slide-over for Add/Edit Type */}
        {(showCreateType || editingType) && (
          <AdminGroupTypeSlideOver
            type={editingType}
            onClose={() => {
              setShowCreateType(false);
              setEditingType(null);
            }}
            onSaved={(savedType) => {
              setGroupTypes((prev) => {
                const idx = prev.findIndex((t) => t.id === savedType.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = savedType;
                  return copy;
                }
                return [...prev, savedType];
              });
              setShowCreateType(false);
              setEditingType(null);
            }}
          />
        )}
      </div>
    </PortalLayout>
  );
}
