import { SelectBox } from "@/components/ui/select";
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
  FolderKanban,
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
        return {
          pill: "bg-emerald-50 text-emerald-700 border-emerald-600/15",
          dot: "bg-emerald-600",
        };
      case "on_hold":
        return {
          pill: "bg-amber-50 text-amber-800 border-amber-600/15",
          dot: "bg-amber-600",
        };
      default:
        return {
          pill: "bg-neutral-100 text-neutral-700 border-neutral-900/[0.08]",
          dot: "bg-neutral-400",
        };
    }
  };

  return (
    <PortalLayout activeNav="Projects">
      <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
        <PageHeader
          title="Enterprise projects and initiatives"
          description="Manage project governance codes, client delivery timelines, and executive ownership"
          actions={
            <div className="flex items-center gap-2">
              <Link
                to="/projects"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-neutral-900/[0.10] bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors duration-150"
              >
                <FolderKanban className="h-4 w-4 text-[#ff6900]" strokeWidth={1.5} />
                <span>Workspaces View</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                <span>Create project</span>
              </button>
            </div>
          }
        />

        {/* 4 Compact Numbers-Only KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Total projects</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {projects.length.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Tracked initiatives</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Active delivery</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {activeProjects.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Currently in flight</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Archived / closed</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline tabular-nums">
              {archivedProjects.toLocaleString()}
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Concluded records</p>
          </article>

          <article className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-neutral-900/[0.08] shadow-xs flex flex-col justify-between gap-1 sm:space-y-2">
            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">Governance policy</p>
            <p className="text-xl sm:text-[28px] leading-tight sm:leading-none font-medium text-neutral-900 font-headline">
              Enforced
            </p>
            <p className="text-[10px] sm:text-xs text-neutral-400 truncate hidden sm:block">Stanforte Edge standard</p>
          </article>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative min-w-[260px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" strokeWidth={1.5} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects or codes"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-900/[0.12] bg-white text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
              />
            </div>

            <SelectBox
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-neutral-900/[0.12] bg-white text-sm text-neutral-700 outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </SelectBox>

            <button
              type="button"
              onClick={() => void refetchProjects()}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-neutral-900/[0.10] bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30"
              title="Refresh projects"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white border border-neutral-900/[0.08] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900/[0.08] bg-neutral-50/80 text-xs font-medium text-neutral-500">
                  <th className="py-3 px-5">Project and code</th>
                  <th className="py-3 px-5">Timeline</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/[0.06] text-sm text-neutral-700">
                {projectsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-neutral-500">
                      <div className="w-5 h-5 border-2 border-[#ff6900] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading projects
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-14 text-center">
                      <Briefcase className="h-6 w-6 text-neutral-400 mx-auto mb-2" strokeWidth={1.5} />
                      <div className="text-sm font-medium text-neutral-900">No projects found</div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Adjust search filters or create a new enterprise initiative
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => {
                    const statusStr =
                      p.governance?.governance_status || (p.isActive ? "active" : "archived");
                    const badge = getStatusBadge(statusStr);
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50 focus-within:bg-neutral-50/80 transition-colors duration-150">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/projects/${p.id}`}
                              className="font-medium text-neutral-900 hover:text-[#ff6900] transition-colors"
                            >
                              {p.name}
                            </Link>
                            {p.governance?.project_code && (
                              <code className="font-mono text-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-900/[0.06]">
                                {p.governance.project_code}
                              </code>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-xs text-neutral-500 mt-0.5 max-w-lg truncate">
                              {p.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-xs font-mono text-neutral-500 tabular-nums">
                          {p.governance?.start_date || p.governance?.end_date ? (
                            <span>
                              {p.governance.start_date || "—"} – {p.governance.end_date || "Ongoing"}
                            </span>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${badge.pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {statusStr.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingProject(p)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Edit project"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(p)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6900]/30 transition-colors duration-150"
                              title="Archive project"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
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
