import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/shared/router-adapter";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { formatDate } from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { useCachedQuery, financeApi, httpRequest, resourceApi, workApi } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { useParams } from "react-router";
import BudgetWorkspace from "@/features/budgets/BudgetWorkspace";
import { useToast } from "@/shared";
import { useColleagues } from "@/shared/hooks/useColleagues";
import { ColleagueMultiSelect } from "@/shared/components/ui/ColleagueMultiSelect";
import { uploadFileAsset } from "@/pages/files/files-api";
import { FilePreviewModal } from "@/shared/components/media/FilePreviewModal";
import { SelectBox } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-picker";
import type { TaskAssignee, TaskItem, TaskPriority, TaskStatus } from "@/pages/tasks/types";
import {
  isUserPartOfTask,
  loadStoredTasks,
  TASKS_UPDATED_EVENT,
  updateStoredTaskStatus,
  upsertStoredTask,
} from "@/pages/tasks/task-store";
import type { ProjectAttachment } from "./CreateProjectSlideOver";
import { RichTextEditor, RichTextViewer, stripHtml } from "@/shared/components/ui/RichTextEditor";
import {
  FolderKanban,
  Calendar,
  CheckCircle2,
  Circle,
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
  Tag,
  Plus,
  Upload,
  Eye,
  UserPlus,
} from "lucide-react";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { mode, isAdmin } = useWorkspace();
  const isAdminView = mode === "admin" && isAdmin;
  const { showToast } = useToast();
  const { colleagues } = useColleagues();
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const { data: profile } = useCachedQuery(
    "user:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  const { data: project, loading, refetch: refetchProject } = useCachedQuery(
    `project:detail:${id}`,
    () => (id ? resourceApi.getProject(id) : Promise.resolve(null)),
    { ttlMs: 1000 * 60 * 5, storage: "memory" }
  );

  const { data: projectTasks, loading: projectTasksLoading } = useCachedQuery(
    `project:tasks:${id}`,
    () => (id ? workApi.listTeamWorkItems({ project_id: id }).catch(() => []) : Promise.resolve([])),
    { ttlMs: 30_000, storage: "memory" }
  );

  // Synced project tasks from shared portal_tasks_data store
  const [storedTasks, setStoredTasks] = useState<TaskItem[]>(() => loadStoredTasks());
  useEffect(() => {
    const sync = () => setStoredTasks(loadStoredTasks());
    window.addEventListener(TASKS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TASKS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Add Task form state on Project page
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskTagsInput, setTaskTagsInput] = useState("");
  const [taskAssignees, setTaskAssignees] = useState<TaskAssignee[]>([]);

  // Documents & Member management state
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ProjectAttachment | null>(null);
  const [addingMemberId, setAddingMemberId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

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
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "members", label: "Members", icon: Users },
    { id: "activities", label: "Activities", icon: Activity },
    ...(canSeeInternalProjectTabs
      ? [
          { id: "requests", label: "Requests", icon: FileText },
          { id: "budgets", label: "Budgets", icon: PieChart },
          { id: "funds", label: "Funds / Spend", icon: Wallet },
          { id: "partners", label: "Partners", icon: Handshake },
          { id: "donors", label: "Donors", icon: HeartHandshake },
        ]
      : []),
  ], [canSeeInternalProjectTabs]);

  // Project-scoped tasks visible to current user (strict: non-assigned users only see tasks they are part of unless admin)
  const visibleProjectTasks = useMemo(() => {
    if (!project) return [];
    const projId = String(project.id);
    const projName = String(project.name || "").trim().toLowerCase();

    const localMatching = storedTasks.filter((t) => {
      const matchesProject =
        (Boolean(t.project_id) && String(t.project_id) === projId) ||
        (Boolean(projName) && (t.project_name || "").trim().toLowerCase() === projName);
      if (!matchesProject) return false;
      return isAdminView || isUserPartOfTask(t, user);
    });

    const apiItems: TaskItem[] = (Array.isArray(projectTasks) ? projectTasks : [])
      .filter((item: any) => !localMatching.some((lt) => lt.id === String(item.id)))
      .map((item: any) => ({
        id: String(item.id),
        title: item.title,
        description: item.description,
        status: (item.status || "planned") as TaskStatus,
        priority: (item.priority || "medium") as TaskPriority,
        due_date: item.due_date ? String(item.due_date).slice(0, 10) : undefined,
        project_id: projId,
        project_name: project.name,
        assignees: item.assignee
          ? [{ id: String(item.assignee.id), name: item.assignee.name || item.assignee.email || "Assignee", email: item.assignee.email }]
          : [],
        tags: Array.isArray(item.tags) ? item.tags : [],
        updates: [],
      }))
      .filter((t) => isAdminView || isUserPartOfTask(t, user));

    return [...localMatching, ...apiItems];
  }, [project, storedTasks, projectTasks, isAdminView, user]);

  const projectMetadata = (project as any)?.metadata && typeof (project as any).metadata === "object"
    ? ((project as any).metadata as Record<string, any>)
    : {};
  const projectTags: string[] = Array.isArray(projectMetadata.tags) ? projectMetadata.tags : [];
  const projectDocuments: ProjectAttachment[] = Array.isArray(projectMetadata.documents)
    ? projectMetadata.documents
    : [];

  const handleCreateProjectTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !taskTitle.trim()) return;
    const authorName = user?.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : user?.username || "Colleague";
    const parsedTags = Array.from(
      new Set([
        ...projectTags,
        ...taskTagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ]),
    );
    const assignees: TaskAssignee[] =
      taskAssignees.length > 0
        ? taskAssignees
        : [
            {
              id: user?.id ? String(user.id) : "usr-self",
              name: authorName,
              email: user?.email,
              avatar: authorName.slice(0, 2).toUpperCase(),
            },
          ];

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: taskTitle.trim(),
      description: taskDesc.trim() || undefined,
      status: "planned",
      priority: taskPriority,
      due_date: taskDueDate || undefined,
      created_at: new Date().toISOString(),
      owner_id: user?.id ? String(user.id) : undefined,
      owner_name: authorName,
      is_personal: false,
      project_id: String(project.id),
      project_name: project.name,
      assignees,
      tags: parsedTags.length > 0 ? parsedTags : ["Project"],
      updates: [
        {
          id: `upd-${Date.now()}`,
          author: authorName,
          avatar: authorName.slice(0, 2).toUpperCase(),
          text: `Task created under project "${project.name}".`,
          created_at: "Just now",
        },
      ],
    };

    const next = upsertStoredTask(newTask);
    setStoredTasks(next);
    setTaskTitle("");
    setTaskDesc("");
    setTaskDueDate("");
    setTaskTagsInput("");
    setTaskAssignees([]);
    setShowAddTask(false);
    showToast({ tone: "success", title: "Task added", message: "Task added and synced to Tasks page." });
  };

  const handleChangeProjectTaskStatus = (taskId: string, nextStatus: TaskStatus) => {
    const next = updateStoredTaskStatus(taskId, nextStatus);
    setStoredTasks(next);
    showToast({
      tone: "success",
      title: nextStatus === "completed" ? "Task completed" : "Status updated",
      message: `Marked as ${nextStatus.replace("_", " ")}.`,
    });
  };

  const handleAttachProjectDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !project) return;
    setUploadingDoc(true);
    try {
      const uploaded: ProjectAttachment[] = [];
      for (const file of files) {
        const asset = await uploadFileAsset(file, { metadata: { purpose: "project_document", project_id: String(project.id) } });
        uploaded.push({
          file_id: asset.id,
          file_name: asset.file_name || file.name,
          mime_type: asset.mime_type || file.type || null,
          file_size: Number(asset.file_size ?? file.size ?? 0),
          uploaded_at: new Date().toISOString(),
        });
      }
      await httpRequest(`/projects/${project.id}`, {
        method: "PUT",
        body: {
          metadata: {
            ...projectMetadata,
            documents: [...projectDocuments, ...uploaded],
          },
        },
      });
      await refetchProject();
      showToast({ tone: "success", title: "Document attached", message: `${uploaded.length} document(s) added to project.` });
    } catch {
      showToast({ tone: "danger", title: "Upload failed", message: "Could not attach document to project." });
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleAddProjectMember = async () => {
    if (!project || !addingMemberId) return;
    setAddingMember(true);
    try {
      await httpRequest(`/projects/${project.id}/members`, {
        method: "POST",
        body: { user_id: addingMemberId, role: "member" },
      });
      setAddingMemberId("");
      await refetchProject();
      showToast({ tone: "success", title: "Member assigned", message: "Added to project roster." });
    } catch {
      showToast({ tone: "danger", title: "Error", message: "Failed to assign member." });
    } finally {
      setAddingMember(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout activeNav="Projects">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#ff6900] border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-neutral-500">Loading project details...</p>
        </div>
      </PortalLayout>
    );
  }

  if (!project) {
    return (
      <PortalLayout activeNav="Projects">
        <div className="p-12 text-center max-w-md mx-auto bg-white rounded-2xl border border-neutral-200/80 shadow-sm mt-8">
          <FolderKanban className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <h2 className="text-base font-medium text-neutral-900">Project Not Found</h2>
          <p className="text-xs text-neutral-500 mt-1 mb-5">
            The requested project workspace may have been decommissioned or moved.
          </p>
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0a1128] text-white text-xs font-medium hover:bg-neutral-800 transition"
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
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 mb-1">
              <Link to="/projects" className="hover:text-neutral-800 transition">
                Projects
              </Link>
              <ChevronRight className="h-3 w-3 text-neutral-400" />
              <span className="text-[#ff6900] truncate max-w-xs">{project.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight font-headline">
                {project.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                  status === "active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-mono">
              Code: {project.governance?.project_code || "UNCATALOGED"} • ID: {project.id}
            </p>
          </div>

          <Link
            to="/projects"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition shadow-sm self-start sm:self-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Projects</span>
          </Link>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-neutral-200/80 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[#ff6900] text-white shadow-md "
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-neutral-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0 capitalize">
                    {status.replace("_", " ")}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Lifecycle Status</div>
                  <div className="text-base sm:text-lg font-semibold text-neutral-900 capitalize mt-0.5 tracking-tight truncate">
                    {status.replace("_", " ")}
                  </div>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full shrink-0">
                    Start
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Start Date</div>
                  <div className="text-base sm:text-lg font-semibold text-neutral-900 mt-0.5 tracking-tight truncate">
                    {formatDate(project.governance?.start_date) || "TBD"}
                  </div>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full shrink-0">
                    Target
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Target Completion</div>
                  <div className="text-base sm:text-lg font-semibold text-neutral-900 mt-0.5 tracking-tight truncate">
                    {formatDate(project.governance?.end_date) || "Ongoing"}
                  </div>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                    Lead
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Governance Lead</div>
                  <div className="text-base sm:text-lg font-semibold text-neutral-900 mt-0.5 tracking-tight truncate">
                    {project.governance?.owner_user_id ? "Assigned" : "Unassigned"}
                  </div>
                </div>
              </div>
            </div>

            {/* Description & Metadata Section */}
            <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-medium text-neutral-900">Project Mission &amp; Scope</h3>
              <RichTextViewer
                content={project.description}
                placeholder="No detailed description provided for this project workspace. Governance guidelines recommend documenting objectives and deliverable milestones."
              />

              <div className="pt-4 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 block">
                    Catalog Classification
                  </span>
                  <span className="text-xs font-medium text-neutral-800 mt-0.5 block">
                    {(project as any).category || "General Initiative"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-400 block">
                    Governance Code
                  </span>
                  <span className="text-xs font-mono font-medium text-neutral-800 mt-0.5 block">
                    {project.governance?.project_code || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-400 block">
                    Access Boundary
                  </span>
                  <span className="text-xs font-medium text-emerald-600 mt-0.5 block">
                    Verified Organization Scope
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Activities */}
        {activeTab === "activities" && (
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-sm text-center py-12">
            <Activity className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-neutral-700">No Recent Activity</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Activities will automatically stream as milestones, documents, and updates occur.
            </p>
          </div>
        )}

        {/* Tab 3: Tasks (Interactive — Add Task, Assignees, Tags, Mark Completed) */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-medium text-neutral-700">
                    Project Tasks &amp; Deliverables ({visibleProjectTasks.length})
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Tasks added here sync automatically to the Tasks page and are only visible to assigned members.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTask((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium transition shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{showAddTask ? "Close Form" : "Add Task"}</span>
                </button>
              </div>

              {showAddTask && (
                <form onSubmit={handleCreateProjectTask} className="p-5 bg-neutral-50/70 border-b border-neutral-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-neutral-700 block mb-1">Task Title *</label>
                      <input
                        type="text"
                        required
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="e.g., Finalize architecture specification"
                        className="w-full text-xs border border-neutral-200 rounded-xl px-3 py-2 bg-white text-neutral-900 focus:outline-none focus:border-[#ff6900]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-700 block mb-1">Priority</label>
                      <SelectBox
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                        className="w-full text-xs border border-neutral-200 rounded-xl px-2.5 py-2 bg-white text-neutral-800"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </SelectBox>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-700 block mb-1">Due Date</label>
                      <DateInput
                        value={taskDueDate}
                        onChange={(e) => setTaskDueDate(e.target.value)}
                        className="w-full text-xs border border-neutral-200 rounded-xl px-2.5 py-2 bg-white text-neutral-800"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-700 block mb-1">Tags (comma separated)</label>
                      <input
                        type="text"
                        value={taskTagsInput}
                        onChange={(e) => setTaskTagsInput(e.target.value)}
                        placeholder={projectTags.length ? `Inherits: ${projectTags.join(", ")}` : "Design, API, Sprint 1"}
                        className="w-full text-xs border border-neutral-200 rounded-xl px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:border-[#ff6900]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1">Description</label>
                    <RichTextEditor
                      value={taskDesc}
                      onChange={setTaskDesc}
                      placeholder="Details and acceptance criteria..."
                      minHeightClass="min-h-[90px]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700 block mb-1.5">
                      Assign People ({taskAssignees.length} selected — only assigned people see this task)
                    </label>
                    <ColleagueMultiSelect
                      colleagues={colleagues}
                      selectedIds={taskAssignees.map((a) => a.id)}
                      onChange={(ids) =>
                        setTaskAssignees(colleagues.filter((c) => ids.includes(c.id)))
                      }
                      placeholder="Search staff by name, email, or role..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddTask(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium"
                    >
                      Save Project Task
                    </button>
                  </div>
                </form>
              )}

              {projectTasksLoading && visibleProjectTasks.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium text-neutral-400">
                  Loading tasks...
                </div>
              ) : visibleProjectTasks.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckSquare className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-neutral-700">No tasks assigned to you in this project</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Click Add Task above to attach deliverables and assign teammates.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {visibleProjectTasks.map((task) => {
                    const isDone = task.status === "completed";
                    return (
                      <div key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50/80 transition">
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleChangeProjectTaskStatus(task.id, isDone ? "in_progress" : "completed")}
                            title={isDone ? "Reopen task" : "Mark as completed"}
                            className={`mt-0.5 shrink-0 transition-colors ${
                              isDone ? "text-emerald-600" : "text-neutral-400 hover:text-[#ff6900]"
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Circle className="h-4.5 w-4.5" />}
                          </button>
                          <div className="min-w-0">
                            <p className={`text-xs font-medium ${isDone ? "line-through text-neutral-400" : "text-neutral-900"}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{stripHtml(task.description)}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {task.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[11px] font-mono"
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {task.assignees?.length > 0 && (
                                <span className="text-[11px] text-neutral-400">
                                  • {task.assignees.map((a) => a.name).join(", ")}
                                </span>
                              )}
                              {task.due_date && (
                                <span className="text-[11px] text-neutral-400">• Due {task.due_date}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 capitalize">
                            {task.priority || "medium"}
                          </span>
                          <SelectBox
                            value={task.status}
                            onChange={(e) => handleChangeProjectTaskStatus(task.id, e.target.value as TaskStatus)}
                            className="text-xs font-medium bg-white border border-neutral-200 rounded-lg px-2 py-1 text-neutral-800"
                          >
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="blocked">Under Review</option>
                            <option value="completed">Completed</option>
                          </SelectBox>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Project Documents */}
        {activeTab === "documents" && (
          <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between gap-3">
              <h3 className="text-xs font-medium text-neutral-700">
                Attached Project Documents ({projectDocuments.length})
              </h3>
              <div>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={uploadingDoc}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingDoc ? "Uploading..." : "Attach Document"}</span>
                </button>
                <input
                  ref={docInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleAttachProjectDocument(e)}
                />
              </div>
            </div>
            {projectDocuments.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-neutral-700">No documents attached yet</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Upload specs, briefs, or deliverables so the project team has everything in one place.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {projectDocuments.map((doc) => (
                  <div key={doc.file_id} className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-900 truncate">{doc.file_name}</p>
                        <p className="text-[11px] text-neutral-400">
                          {doc.mime_type || "Document"} • Added {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Members */}
        {activeTab === "members" && (
          <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-medium text-neutral-500">
                Project Roster &amp; Assignments ({(project as any).members?.length || 0})
              </h3>
              <div className="flex items-center gap-2">
                <SelectBox
                  value={addingMemberId}
                  onChange={(e) => setAddingMemberId(e.target.value)}
                  className="text-xs bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-neutral-800"
                >
                  <option value="">Select colleague to assign...</option>
                  {colleagues.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role})
                    </option>
                  ))}
                </SelectBox>
                <button
                  type="button"
                  onClick={() => void handleAddProjectMember()}
                  disabled={!addingMemberId || addingMember}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{addingMember ? "Adding..." : "Assign"}</span>
                </button>
              </div>
            </div>
            {!(project as any).members?.length ? (
              <div className="p-12 text-center">
                <Users className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-neutral-700">No members assigned</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Staff assigned to this project workspace will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {(project as any).members.map((member: any) => {
                  const name =
                    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ") ||
                    member.user?.email ||
                    "Member";
                  return (
                    <div
                      key={member.userId || member.user?.id}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-50 text-[#ff6900] font-medium text-xs flex items-center justify-center">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-neutral-900">{name}</p>
                          <p className="text-xs text-neutral-400">{member.user?.email}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 capitalize">
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
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-sm text-center py-12">
            <FileText className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-neutral-700">No Project Requests</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Financial and procurement requests associated with this initiative will be cataloged here.
            </p>
          </div>
        )}

        {/* Tab 6: Budgets */}
        {activeTab === "budgets" && (
          <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm p-5">
            <BudgetWorkspace context={{ scopeType: "project", scopeId: id, mode: "owner" }} layout="embedded" />
          </div>
        )}

        {/* Tab 7: Funds / Spend */}
        {activeTab === "funds" && (
          <div className="space-y-6">
            {projectFinanceLoading ? (
              <div className="p-12 text-center text-xs font-medium text-neutral-400">
                Loading financial records...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Allocated Funds</div>
                    <div className="text-xl font-semibold text-neutral-900 mt-0.5">
                      {projectFinance?.funds?.length ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Linked Grants</div>
                    <div className="text-xl font-semibold text-neutral-900 mt-0.5">
                      {projectFinance?.grants?.length ?? 0}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Expense Records</div>
                    <div className="text-xl font-semibold text-neutral-900 mt-0.5">
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
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-sm text-center py-12">
            <Handshake className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-neutral-700">No Implementation Partners</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Organizations and delivery partners will be registered in this section.
            </p>
          </div>
        )}

        {/* Tab 9: Donors */}
        {activeTab === "donors" && (
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-sm text-center py-12">
            <HeartHandshake className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-neutral-700">No Funding Donors</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Donors and grant institutions sponsoring this initiative will appear here.
            </p>
          </div>
        )}
      </div>

      {previewDoc && (
        <FilePreviewModal
          isOpen={Boolean(previewDoc)}
          file={{
            id: previewDoc.file_id,
            file_name: previewDoc.file_name,
            mime_type: previewDoc.mime_type ?? undefined,
            file_size: previewDoc.file_size ?? undefined,
          }}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </PortalLayout>
  );
}
