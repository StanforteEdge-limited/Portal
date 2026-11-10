import { useState, useMemo } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { formatDate } from "@stanforte/shared";
import { useCachedQuery, resourceApi } from "@/shared/lib/core";
import {
  FolderKanban,
  CheckCircle2,
  Users,
  Calendar,
  Search,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function ProjectsPage() {
  const [listKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: projectsData, loading: projectsLoading } = useCachedQuery(
    `user:projects:${listKey}`,
    () => resourceApi.listProjects({ active_only: false }),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  const projects = useMemo(() => {
    return Array.isArray(projectsData) ? projectsData : [];
  }, [projectsData]);

  const activeCount = projects.filter((p: any) => {
    const s = p.governance?.governance_status || (p.isActive ? "active" : "archived");
    return s === "active";
  }).length;

  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      const matchesSearch =
        !searchQuery ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.governance?.project_code?.toLowerCase().includes(searchQuery.toLowerCase());
      const s = p.governance?.governance_status || (p.isActive ? "active" : "archived");
      const matchesStatus = statusFilter === "all" || s === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  return (
    <PortalLayout activeNav="Projects">
      <div className="space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <span>Workspace</span>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#ff6900]">Projects</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Project Workspaces
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Discover active projects, track governance status, and collaborate with initiative teams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/projects"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition transform hover:-translate-y-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Project</span>
            </Link>
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active Projects */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Active Projects</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{activeCount}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> Live
            </div>
          </div>

          {/* Card 2: Total Projects */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Total Enrolled</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{projects.length}</div>
            </div>
          </div>

          {/* Card 3: Governance Compliant */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Governance Ready</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">
                {projects.filter((p: any) => p.governance?.project_code).length}
              </div>
            </div>
          </div>

          {/* Card 4: Archive Ratio */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Archived / Closed</div>
              <div className="text-xl font-black text-slate-700 mt-0.5">
                {projects.length - activeCount}
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 w-full sm:w-auto">
              {["all", "active", "archived"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                    statusFilter === st
                      ? "bg-white text-slate-900 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Projects Modern High-Density Table */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Initiatives & Programs ({filteredProjects.length})
            </h3>
          </div>

          {projectsLoading ? (
            <div className="p-12 text-center text-xs font-medium text-slate-400">
              Loading projects directory...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center">
              <FolderKanban className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No projects found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchQuery ? "Try refining your search keyword." : "No project workspaces have been initialized."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Project Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Governance</th>
                    <th className="py-3 px-4">Timeline</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProjects.map((project: any) => {
                    const status =
                      project.governance?.governance_status ||
                      (project.isActive ? "active" : "archived");

                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => {
                          window.location.href = `/projects/${project.id}`;
                        }}
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff6900] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#ff6900] group-hover:text-white transition-colors">
                              <FolderKanban className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors truncate">
                                {project.name}
                              </p>
                              {project.description && (
                                <p className="text-[11px] text-slate-400 truncate max-w-sm">
                                  {project.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/60">
                            {project.governance?.project_code || "UNCATALOGED"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>
                              {formatDate(project.governance?.start_date) || "TBD"} &rarr;{" "}
                              {formatDate(project.governance?.end_date) || "Ongoing"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <Link
                            to={`/projects/${project.id}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-white hover:bg-[#ff6900] border border-slate-200 hover:border-[#ff6900] transition shadow-sm"
                          >
                            <span>Open</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
