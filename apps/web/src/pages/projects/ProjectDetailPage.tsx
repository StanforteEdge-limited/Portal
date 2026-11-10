import { useMemo, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { formatDate } from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, financeApi, resourceApi, workApi } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { useParams } from "react-router";
import BudgetWorkspace from "@/features/budgets/BudgetWorkspace";
import {
  FolderKanban,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  Layers,
  ChevronRight,
  ArrowLeft,
  DollarSign,
  Activity,
  CheckSquare,
  FileText,
  PieChart,
  Wallet,
  Handshake,
  HeartHandshake,
  User,
  Shield,
  Tag,
} from "lucide-react";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: profile } = useCachedQuery(
    "user:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  const { data: project, loading } = useCachedQuery(
    `project:detail:${id}`,
    () => (id ? resourceApi.getProject(id) : Promise.resolve(null)),
    { ttlMs: 1000 * 60 * 5, storage: "memory" }
  );

  const { data: projectTasks, loading: projectTasksLoading } = useCachedQuery(
    `project:tasks:${id}`,
    () => (id ? workApi.listTeamWorkItems({ project_id: id }) : Promise.resolve([])),
    { ttlMs: 30_000, storage: "memory" }
  );

  const { data: projectFinance, loading: projectFinanceLoading } = useCachedQuery(
    `project:finance:${id}`,
    async () => {
      if (!id) return { funds: [], grants: [], expenses: [] };
      const [funds, grants, expenses] = await Promise.all([
        financeApi.listFunds({ project_id: id }),
        financeApi.listGrants({ project_id: id }),
        resourceApi.listFinanceExpenses({ project_id: id, per_page: 100 }),
      ]);
      return { funds, grants, expenses: expenses.result };
    },
    { ttlMs: 60_000, storage: "memory" }
  );

  const [activeTab, setActiveTab] = useState("overview");

  const profileProjectIds = useMemo(
    () => new Set((profile?.projects ?? []).map((item: any) => String(item.id))),
    [profile]
  );

  const canSeeInternalProjectTabs = useMemo(
    () =>
      Boolean(
        (project as any)?.isMember ||
          (project as any)?.isLead ||
          (project as any)?.can_manage ||
          (project as any)?.can_view_internal ||
          (project && profileProjectIds.has(String(project.id)))
      ),
    [profileProjectIds, project]
  );

  const tabs = useMemo(() => [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "activities", label: "Activities", icon: Activity },
    ...(canSeeInternalProjectTabs
      ? [
          { id: "tasks", label: "Tasks", icon: CheckSquare },
          { id: "members", label: "Members", icon: Users },
          { id: "requests", label: "Requests", icon: FileText },
          { id: "budgets", label: "Budgets", icon: PieChart },
          { id: "funds", label: "Funds / Spend", icon: Wallet },
          { id: "partners", label: "Partners", icon: Handshake },
          { id: "donors", label: "Donors", icon: HeartHandshake },
        ]
      : []),
  ], [canSeeInternalProjectTabs]);

  if (loading) {
    return (
      <PortalLayout activeNav="Projects">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#ff6900] border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading project details...</p>
        </div>
      </PortalLayout>
    );
  }

  if (!project) {
    return (
      <PortalLayout activeNav="Projects">
        <div className="p-12 text-center max-w-md mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm mt-8">
          <FolderKanban className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Project Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            The requested project workspace may have been decommissioned or moved.
          </p>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a1128] text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Projects</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const status = project.governance?.governance_status || (project.isActive ? "active" : "archived");

  return (
    <PortalLayout activeNav="Projects">
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/projects" className="hover:text-slate-800 transition">
                Projects
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#ff6900] truncate max-w-xs">{project.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
                {project.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  status === "active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Code: {project.governance?.project_code || "UNCATALOGED"} • ID: {project.id}
            </p>
          </div>

          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm self-start sm:self-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Projects</span>
          </Link>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200/80 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#ff6900] text-white shadow-md shadow-orange-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Lifecycle Status</div>
                  <div className="text-base font-black text-slate-900 capitalize mt-0.5">
                    {status.replace("_", " ")}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Start Date</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {formatDate(project.governance?.start_date) || "TBD"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Target Completion</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {formatDate(project.governance?.end_date) || "Ongoing"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Governance Lead</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {project.governance?.owner_user_id ? "Assigned" : "Unassigned"}
                  </div>
                </div>
              </div>
            </div>

            {/* Description & Metadata Section */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Project Mission & Scope</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {project.description ||
                  "No detailed description provided for this project workspace. Governance guidelines recommend documenting objectives and deliverable milestones."}
              </p>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Catalog Classification
                  </span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {(project as any).category || "General Initiative"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Governance Code
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">
                    {project.governance?.project_code || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Access Boundary
                  </span>
                  <span className="text-xs font-bold text-emerald-600 mt-0.5 block">
                    Verified Organization Scope
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Activities */}
        {activeTab === "activities" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center py-12">
            <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Recent Activity</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Activities will automatically stream as milestones, documents, and updates occur.
            </p>
          </div>
        )}

        {/* Tab 3: Tasks */}
        {activeTab === "tasks" && (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Work Items & Deliverables ({projectTasks?.length || 0})
              </h3>
            </div>
            {projectTasksLoading ? (
              <div className="p-8 text-center text-xs font-medium text-slate-400">
                Loading tasks...
              </div>
            ) : !projectTasks?.length ? (
              <div className="p-12 text-center">
                <CheckSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No tasks linked</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tasks created for this project will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projectTasks.map((task: any) => (
                  <div key={task.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{task.title}</p>
                      <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                        {String(task.status || "planned").replaceAll("_", " ")}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                      {task.priority || "medium"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Members */}
        {activeTab === "members" && (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Project Roster & Assignments ({(project as any).members?.length || 0})
              </h3>
            </div>
            {!(project as any).members?.length ? (
              <div className="p-12 text-center">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No members assigned</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Staff assigned to this project workspace will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {(project as any).members.map((member: any) => {
                  const name =
                    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ") ||
                    member.user?.email ||
                    "Member";
                  return (
                    <div
                      key={member.userId || member.user?.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-50 text-[#ff6900] font-bold text-xs flex items-center justify-center">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{name}</p>
                          <p className="text-[11px] text-slate-400">{member.user?.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                        {member.role || "Member"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Requests */}
        {activeTab === "requests" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center py-12">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Project Requests</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Financial and procurement requests associated with this initiative will be cataloged here.
            </p>
          </div>
        )}

        {/* Tab 6: Budgets */}
        {activeTab === "budgets" && (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5">
            <BudgetWorkspace context={{ scopeType: "project", scopeId: id, mode: "owner" }} layout="embedded" />
          </div>
        )}

        {/* Tab 7: Funds / Spend */}
        {activeTab === "funds" && (
          <div className="space-y-6">
            {projectFinanceLoading ? (
              <div className="p-12 text-center text-xs font-medium text-slate-400">
                Loading financial records...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">Allocated Funds</div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">
                      {projectFinance?.funds?.length ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">Linked Grants</div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">
                      {projectFinance?.grants?.length ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">Expense Records</div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">
                      {projectFinance?.expenses?.length ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 8: Partners */}
        {activeTab === "partners" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center py-12">
            <Handshake className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Implementation Partners</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Organizations and delivery partners will be registered in this section.
            </p>
          </div>
        )}

        {/* Tab 9: Donors */}
        {activeTab === "donors" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center py-12">
            <HeartHandshake className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Funding Donors</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Donors and grant institutions sponsoring this initiative will appear here.
            </p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
