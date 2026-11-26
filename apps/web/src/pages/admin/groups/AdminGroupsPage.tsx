import { SelectBox } from "@/components/ui/select";
import { useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, resourceApi, httpRequest } from "@/shared/lib/core";
import { useToast, PageHeader } from "@/shared";
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
      await httpRequest(`/requests/groups/${group.id}`, { method: "DELETE" });
      showToast(`Group "${group.name}" removed successfully.`, "success");
      setListKey((k) => k + 1);
    } catch (err: any) {
      showToast(err?.message || "Failed to delete group", "error");
    }
  };

  return (
    <PortalLayout activeNav="Teams & Units">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        <PageHeader
          title="Groups and functional teams"
          description="Configure operating units, departments, and cross-subsidiary workforce coverage"
          actions={
            activeTab === "groups" ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                <span>Create group</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateType(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                <span>Add group type</span>
              </button>
            )
          }
        />

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Total groups</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {teams.length.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Cataloged units</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Active units</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {activeGroups.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Currently operational</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Classification</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {groupTypes.length.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Organizational taxonomy</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Inactive / archived</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {inactiveGroups.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Historical records</p>
          </article>
        </div>

        {/* Tab & Toolbar Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 p-1 bg-neutral-100 rounded-xl border border-neutral-900/[0.06] self-start">
            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 ${
                activeTab === "groups"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Users className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
              <span>Groups directory</span>
              <span className="font-mono text-neutral-500 tabular-nums">{teams.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("types")}
              className={`inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 ${
                activeTab === "types"
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <FolderTree className="h-4 w-4 text-neutral-500" strokeWidth={1.5} />
              <span>Types and categories</span>
              <span className="font-mono text-neutral-500 tabular-nums">{groupTypes.length}</span>
            </button>
          </div>

          {activeTab === "groups" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" strokeWidth={1.5} />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search groups"
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-900/[0.12] bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/15"
                />
              </div>

              <SelectBox
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-neutral-900/[0.12] bg-white text-sm text-neutral-700 outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/15"
              >
                <option value="all">All types</option>
                {groupTypes.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </SelectBox>

              <SelectBox
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-lg border border-neutral-900/[0.12] bg-white text-sm text-neutral-700 outline-none focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/15"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectBox>

              <button
                type="button"
                onClick={() => void refetchGroups()}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-neutral-900/[0.10] bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
                title="Refresh list"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Groups Directory */}
        {activeTab === "groups" && (
          <div className="bg-white border border-neutral-900/[0.08] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-900/[0.08] bg-neutral-50/80 text-xs font-medium text-neutral-500">
                    <th className="py-3 px-5">Group name</th>
                    <th className="py-3 px-5">Classification</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                  {groupsLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-sm text-neutral-500">
                        <div className="w-5 h-5 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading groups directory
                      </td>
                    </tr>
                  ) : filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-14 text-center">
                        <Users className="h-6 w-6 text-neutral-400 mx-auto mb-2" strokeWidth={1.5} />
                        <div className="text-sm font-medium text-neutral-900">No groups found</div>
                        <p className="text-xs text-neutral-500 mt-1">
                          Try adjusting your search filters or create a new group
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((group) => (
                      <tr key={group.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                        <td className="py-3.5 px-5">
                          <div className="font-medium text-neutral-900">{group.name}</div>
                          {group.description && (
                            <div className="text-xs text-neutral-500 mt-0.5 max-w-md truncate">
                              {group.description}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <code className="px-2 py-0.5 rounded-md text-xs font-mono bg-neutral-100 text-neutral-700 border border-neutral-900/[0.06]">
                            {group.groupType || "team"}
                          </code>
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${
                              group.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-600/15"
                                : "bg-neutral-100 text-neutral-600 border-neutral-900/[0.08]"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                group.isActive ? "bg-emerald-600" : "bg-neutral-400"
                              }`}
                            />
                            {group.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingGroup(group)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Edit group"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Remove group"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
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
          <div className="bg-white border border-neutral-900/[0.08] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-900/[0.08] bg-neutral-50/80 text-xs font-medium text-neutral-500">
                    <th className="py-3 px-5">Type name</th>
                    <th className="py-3 px-5">Identifier</th>
                    <th className="py-3 px-5">Description</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                  {groupTypes.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                      <td className="py-3.5 px-5 font-medium text-neutral-900">{t.name}</td>
                      <td className="py-3.5 px-5">
                        <code className="px-2 py-0.5 rounded-md text-xs font-mono bg-neutral-100 text-neutral-700 border border-neutral-900/[0.06]">
                          {t.slug}
                        </code>
                      </td>
                      <td className="py-3.5 px-5 text-neutral-500">{t.description}</td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingType(t)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                          title="Edit type"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.5} />
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
