import { useState, useMemo } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { formatDate } from "@stanforte/shared";
import { useCachedQuery, resourceApi } from "@/shared/lib/core";
import { CreateProjectSlideOver } from "./CreateProjectSlideOver";
import { stripHtml } from "@/shared/components/ui/RichTextEditor";
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
  const { isAdmin } = useWorkspace();
  const [listKey, setListKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

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
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Project Workspaces"
          description="Discover active projects, track governance status, and collaborate with initiative teams."
          icon={FolderKanban}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Link
                    to="/admin/projects"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200/80 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition shadow-xs"
                  >
                    <Layers className="h-4 w-4 text-neutral-500" />
                    <span>Admin Table</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium shadow-md transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Project</span>
                  </button>
                </>
              )}
            </div>
          }
        />

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Active Projects */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <FolderKanban className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Live
              </div>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Active Projects</div>
              <div className="text-lg sm:text-xl font-semibold text-neutral-900 mt-0.5">{activeCount}</div>
            </div>
          </div>

          {/* Card 2: Total Projects */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Total Enrolled</div>
              <div className="text-lg sm:text-xl font-semibold text-neutral-900 mt-0.5">{projects.length}</div>
            </div>
          </div>

          {/* Card 3: Governance Compliant */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Governance Ready</div>
              <div className="text-lg sm:text-xl font-semibold text-emerald-600 mt-0.5">
                {projects.filter((p: any) => p.governance?.project_code).length}
              </div>
            </div>
          </div>

          {/* Card 4: Archive Ratio */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Archived / Closed</div>
              <div className="text-lg sm:text-xl font-semibold text-neutral-700 mt-0.5">
                {projects.length - activeCount}
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search projects or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-semibold text-neutral-600 w-full sm:w-auto">
              {["all", "active", "archived"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                    statusFilter === st
                      ? "bg-white text-neutral-900 shadow-sm font-medium"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Projects Modern High-Density Table */}
        <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-xs font-medium text-neutral-500">
              Initiatives & Programs ({filteredProjects.length})
            </h3>
          </div>

          {projectsLoading ? (
            <div className="p-12 text-center text-xs font-medium text-neutral-400">
              Loading projects directory...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center">
              <FolderKanban className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-neutral-700">No projects found</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {searchQuery ? "Try refining your search keyword." : "No project workspaces have been initialized."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50/75 border-b border-neutral-100 text-xs font-medium text-neutral-500">
                    <th className="py-3 px-5">Project Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Governance</th>
                    <th className="py-3 px-4">Timeline</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {filteredProjects.map((project: any) => {
                    const status =
                      project.governance?.governance_status ||
                      (project.isActive ? "active" : "archived");

                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-neutral-50/80 transition-colors group cursor-pointer"
                        onClick={() => {
                          window.location.href = `/projects/${project.id}`;
                        }}
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff6900] flex items-center justify-center font-medium text-xs shrink-0 group-hover:bg-[#ff6900] group-hover:text-white transition-colors">
                              <FolderKanban className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-neutral-900 group-hover:text-[#ff6900] transition-colors truncate">
                                {project.name}
                              </p>
                              {project.description && (
                                <p className="text-xs text-neutral-400 truncate max-w-sm">
                                  {stripHtml(project.description)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-semibold border border-neutral-200/60">
                            {project.governance?.project_code || "UNCATALOGED"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              status === "active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-neutral-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-neutral-400 shrink-0" />
                            <span>
                              {formatDate(project.governance?.start_date) || "TBD"} –{" "}
                              {formatDate(project.governance?.end_date) || "Ongoing"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <Link
                            to={`/projects/${project.id}`}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-white hover:bg-[#ff6900] border border-neutral-200 hover:border-[#ff6900] transition shadow-sm"
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

      {isAdmin && (
        <CreateProjectSlideOver
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => setListKey((k) => k + 1)}
        />
      )}
    </PortalLayout>
  );
}
