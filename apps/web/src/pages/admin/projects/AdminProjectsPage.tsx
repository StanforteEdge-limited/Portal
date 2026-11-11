import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, resourceApi, httpRequest } from "@/shared/lib/core";
import { useToast, PageHeader } from "@/shared";
import AdminProjectSlideOver from "./AdminProjectSlideOver";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User,
} from "lucide-react";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  organizationId: string | null;
  governance: {
    project_code?: string | null;
    owner_user_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    governance_status?: string | null;
  } | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "planned", label: "Planned" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export default function AdminProjectsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listKey, setListKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createOrgId, setCreateOrgId] = useState("");
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setShowCreate(true);
      const orgId = searchParams.get("organization_id") || "";
      setCreateOrgId(orgId);
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      next.delete("team_id");
      next.delete("organization_id");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: projectsData, loading: projectsLoading, refetch: refetchProjects } = useCachedQuery(
    `admin:projects:${listKey}:${search}:${statusFilter}`,
    () =>
      resourceApi.listProjects({
        search: search || undefined,
        active_only: statusFilter === "archived" ? false : undefined,
      }),
    { ttlMs: 0, storage: "memory" },
  );

  const projects: ProjectRow[] = Array.isArray((projectsData as any)?.data?.items)
    ? (projectsData as any).data.items
    : Array.isArray(projectsData)
    ? projectsData
    : [];

  const activeProjects = projects.filter(
    (p) => p.isActive && p.governance?.governance_status !== "archived",
  ).length;
  const archivedProjects = projects.filter(
    (p) => !p.isActive || p.governance?.governance_status === "archived",
  ).length;

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== "all") {
      const projectStatus = p.governance?.governance_status || (p.isActive ? "active" : "archived");
      if (projectStatus !== statusFilter) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.governance?.project_code?.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  const handleDeleteProject = async (p: ProjectRow) => {
    if (!window.confirm(`Are you sure you want to delete "${p.name}"?`)) return;
    try {
      await httpRequest(`/projects/${p.id}/archive`, { method: "POST" });
      showToast(`Project "${p.name}" archived.`, "success");
      setListKey((k) => k + 1);
    } catch (err: any) {
      showToast(err?.message || "Failed to delete project.", "error");
    }
  };

  const getStatusBadge = (status?: string | null) => {
    const s = (status || "active").toLowerCase();
    switch (s) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "planned":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "on_hold":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "completed":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <PortalLayout activeNav="Teams & Departments">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Enterprise Projects & Initiatives"
          description="Manage project governance codes, client delivery timelines, and executive ownership."
          icon={Briefcase}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </button>
          }
        />

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Total Projects</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{projects.length}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              Tracked
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Active Delivery</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{activeProjects}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              In Flight
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Archived / Closed</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{archivedProjects}</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              Concluded
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Governance Policy</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">Stanforte Edge</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Compliant
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative min-w-[240px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects or codes..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20 focus:border-[#ff6900]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6900]/20"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void refetchProjects()}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
              title="Refresh projects"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Project Name & Code</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {projectsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                      <div className="w-6 h-6 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading projects...
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <Briefcase className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-slate-700">No projects found</div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Adjust search filters or create a new enterprise initiative.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => {
                    const statusStr =
                      p.governance?.governance_status || (p.isActive ? "active" : "archived");
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition group">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{p.name}</span>
                            {p.governance?.project_code && (
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                {p.governance.project_code}
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 max-w-lg truncate">
                              {p.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {p.governance?.start_date || p.governance?.end_date ? (
                            <span className="text-[11px]">
                              {p.governance.start_date || "-"} – {p.governance.end_date || "Ongoing"}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                              statusStr,
                            )}`}
                          >
                            {statusStr}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingProject(p)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                              title="Edit project"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(p)}
                              className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition"
                              title="Delete project"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slide-over for Add/Edit Project */}
        {(showCreate || editingProject) && (
          <AdminProjectSlideOver
            project={
              editingProject
                ? {
                    id: editingProject.id,
                    name: editingProject.name,
                    description: editingProject.description || undefined,
                    projectCode: editingProject.governance?.project_code || undefined,
                    organizationId: editingProject.organizationId || undefined,
                    ownerId: editingProject.governance?.owner_user_id || undefined,
                    status: editingProject.governance?.governance_status || "active",
                    startDate: editingProject.governance?.start_date || undefined,
                    endDate: editingProject.governance?.end_date || undefined,
                  }
                : null
            }
            defaultOrgId={createOrgId}
            onClose={() => {
              setShowCreate(false);
              setEditingProject(null);
            }}
            onSaved={() => {
              setShowCreate(false);
              setEditingProject(null);
              setListKey((k) => k + 1);
            }}
          />
        )}
      </div>
    </PortalLayout>
  );
}
