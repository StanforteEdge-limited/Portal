import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, resourceApi, workApi } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import BudgetWorkspace from "@/features/budgets/BudgetWorkspace";
import {
  Users,
  Building2,
  ChevronRight,
  ArrowLeft,
  CheckSquare,
  FileText,
  PieChart,
  FolderKanban,
  Layers,
  Crown,
  User,
  Plus,
  Shield,
} from "lucide-react";

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [budgetCreateAttempt, setBudgetCreateAttempt] = useState(0);

  const { data: profile } = useCachedQuery(
    "user:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 60_000, storage: "memory" }
  );

  const { data: groupDetail, loading: groupLoading } = useCachedQuery(
    `group:detail:${id}`,
    () => (id ? resourceApi.getGroupDetail(id) : Promise.resolve(null)),
    { ttlMs: 60_000, storage: "memory" }
  );

  const { data: groupTasks, loading: tasksLoading } = useCachedQuery(
    `group:tasks:${id}`,
    () => (id ? workApi.listTeamWorkItems({ team_id: id }) : Promise.resolve([])),
    { ttlMs: 30_000, storage: "memory" }
  );

  const allTeams = profile?.teams ?? profile?.groups ?? [];
  const team: Record<string, any> | undefined = (groupDetail as any) ?? allTeams.find((t: any) => t.id === id);
  const groupName = String(team?.name ?? "Group");
  const groupType = String(team?.type ?? "other").toLowerCase();
  const role = String(team?.role ?? "member").toLowerCase();
  const orgId = String(team?.organization_id ?? "");
  const canSeeAllRequests = ["lead", "moderator", "manager", "admin", "owner"].includes(role);
  const canWorkBudgets = groupType === "department" && canSeeAllRequests;

  const tabs = useMemo(() => [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "members", label: "Members", icon: Users },
    { id: "requests", label: "Requests", icon: FileText },
    ...(canWorkBudgets ? [{ id: "budgets", label: "Budgets", icon: PieChart }] : []),
    { id: "projects", label: "Projects", icon: FolderKanban },
  ], [canWorkBudgets]);

  if (!team && !groupLoading) {
    return (
      <PortalLayout activeNav="Teams & Groups">
        <div className="p-12 text-center max-w-md mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm mt-8">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900">Team Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            The requested team or departmental workspace is not accessible.
          </p>
          <Link
            to="/teams"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a1128] text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Teams</span>
          </Link>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout activeNav="Teams & Groups">
      <div className="space-y-6">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/teams" className="hover:text-slate-800 transition">
                Teams & Groups
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#ff6900] truncate max-w-xs">{groupName}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
                {groupName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {team?.type || "Team"}
              </span>
              {team?.is_primary && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Primary Group
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Role: <span className="font-bold capitalize text-slate-800">{role}</span> • ID: {id}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/teams"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Teams</span>
            </Link>
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Classification</div>
                  <div className="text-base font-black text-slate-900 capitalize mt-0.5">
                    {team?.type || "General Unit"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Your Authority</div>
                  <div className="text-base font-black text-slate-900 capitalize mt-0.5">{role}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Enrolled Members</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {team?.members?.length || "—"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Active Tasks</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">
                    {groupTasks?.length || 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Organizational Unit Profile</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {team?.description ||
                  "This work group acts as an operating structure for permissions, budget ownership, procurement approvals, and team deliverable tracking."}
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Tasks */}
        {activeTab === "tasks" && (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Shared Tasks ({groupTasks?.length || 0})
              </h3>
            </div>
            {tasksLoading ? (
              <div className="p-8 text-center text-xs font-medium text-slate-400">Loading tasks...</div>
            ) : !groupTasks?.length ? (
              <div className="p-12 text-center">
                <CheckSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No tasks assigned to this group</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tasks delegated to this unit will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {groupTasks.map((task: any) => (
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

        {/* Tab 3: Members */}
        {activeTab === "members" && (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assigned Team Roster ({team?.members?.length || 0})
              </h3>
            </div>
            {groupLoading ? (
              <div className="p-8 text-center text-xs font-medium text-slate-400">Loading roster...</div>
            ) : !team?.members?.length ? (
              <div className="p-12 text-center">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No members listed</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Team members can be configured by administrators.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {team.members.map((member: any) => {
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
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{name}</p>
                          <p className="text-[11px] text-slate-400">{member.user?.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                        {member.role || "member"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Requests */}
        {activeTab === "requests" && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <FileText className="h-8 w-8 text-slate-300 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-800">
                {canSeeAllRequests ? "Team Requests Queue" : "Your Requests for this Team"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {canSeeAllRequests
                  ? "View and review requisitions originated from this department."
                  : "Submit procurement or expenditure requests linked to this team."}
              </p>
            </div>
            {canSeeAllRequests && (
              <Link
                to={`/requests/new?team_id=${id}${orgId ? `&organization_id=${orgId}` : ""}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff6900] text-white text-xs font-bold hover:bg-[#ea580c] transition shadow-md shadow-orange-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Group Request</span>
              </Link>
            )}
          </div>
        )}

        {/* Tab 5: Budgets */}
        {activeTab === "budgets" && canWorkBudgets && (
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Departmental Budgets</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage fiscal allocations and spending caps.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBudgetCreateAttempt((c) => c + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Budget</span>
              </button>
            </div>
            <BudgetWorkspace
              context={{ scopeType: "team", scopeId: id, mode: "owner" }}
              layout="embedded"
              createAttempt={budgetCreateAttempt}
              showInlineCreateButton={false}
            />
          </div>
        )}

        {/* Tab 6: Projects */}
        {activeTab === "projects" && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <FolderKanban className="h-8 w-8 text-slate-300 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-800">Linked Projects</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Initiatives and project workspaces scoped to this group.
              </p>
            </div>
            {canSeeAllRequests && (
              <Link
                to={`/admin/projects?create=1${orgId ? `&organization_id=${orgId}` : ""}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Linked Project</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
