import { SelectBox } from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PortalLayout, useWorkspace } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
import { PageHeader } from "@/shared";
import {
  CheckSquare,
  Clock,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Filter,
  Plus,
  Layers,
  AlertCircle,
  CheckCircle2,
  Users,
  User,
} from "lucide-react";
import type { TaskItem, TaskStatus, TaskPriority } from "./types";
import {
  loadStoredTasks,
  saveStoredTasks,
  isUserPartOfTask,
  TASKS_UPDATED_EVENT,
} from "./task-store";
import { useColleagues } from "@/shared/hooks/useColleagues";
import { resourceApi, useCachedQuery } from "@/shared/lib/core";
import { TaskKanbanView } from "./TaskKanbanView";
import { TaskTableView } from "./TaskTableView";
import { TaskDetailSlideOver } from "./TaskDetailSlideOver";
import { NewTaskSlideOver } from "./NewTaskSlideOver";
import DailyLogTab from "./DailyLogTab";

type ViewMode = "kanban" | "table" | "log";
type ScopeFilter = "all" | "assigned" | "personal";

export default function TasksPage() {
  const { user } = useAuth();
  const { colleagues } = useColleagues();
  const { mode, isAdmin } = useWorkspace();
  const isAdminView = mode === "admin" && isAdmin;
  const [searchParams, setSearchParams] = useSearchParams();

  const currentUserName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Colleague";

  const [tasks, setTasks] = useState<TaskItem[]>(() => loadStoredTasks());

  const saveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    saveStoredTasks(newTasks);
  };

  // Stay synced when tasks are created or marked completed from a Project page
  useEffect(() => {
    const sync = () => setTasks(loadStoredTasks());
    window.addEventListener(TASKS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TASKS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // View Mode: Kanban vs Table vs Daily Log
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get("view") as ViewMode | null) || "kanban"
  );

  const handleSetViewMode = (nextMode: ViewMode) => {
    setViewMode(nextMode);
    setSearchParams({ view: nextMode }, { replace: true });
  };

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  // Load workspace projects for filtering and optional task project linking
  const { data: projectsData } = useCachedQuery(
    "tasks:projects",
    () => resourceApi.listProjects({ active_only: true }).catch(() => ({ items: [] })),
  );

  const projectOptions = useMemo(() => {
    const raw = Array.isArray(projectsData)
      ? projectsData
      : ((projectsData as any)?.items ?? (projectsData as any)?.data?.items ?? (projectsData as any)?.data ?? []);
    const byKey = new Map<string, { id: string; name: string }>();
    for (const p of raw) {
      if (!p?.id || !p?.name) continue;
      byKey.set(String(p.id), { id: String(p.id), name: String(p.name) });
    }
    // Also include any legacy project_name strings already attached to tasks
    for (const t of tasks) {
      if (t.project_name && !Array.from(byKey.values()).some((p) => p.name === t.project_name)) {
        const key = t.project_id ? String(t.project_id) : `name:${t.project_name}`;
        if (!byKey.has(key)) {
          byKey.set(key, { id: key, name: t.project_name });
        }
      }
    }
    return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [projectsData, tasks]);

  // Slide-over states
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskDefaultStatus, setNewTaskDefaultStatus] = useState<TaskStatus>("planned");
  const [logTaskId, setLogTaskId] = useState<string | undefined>();

  // Open new task modal if ?new=1 is in URL
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setIsNewTaskOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Filter tasks based on active workspace mode:
  // - Admin Mode (isAdminView): see all staff work items across the organization (not personal to-dos)
  // - Personal Workplace (!isAdminView): strict visibility — users ONLY see tasks they own or are assigned to
  const scopedTasks = useMemo(() => {
    if (isAdminView) {
      return tasks.filter((t) => !t.is_personal);
    }

    return tasks.filter((t) => {
      if (!isUserPartOfTask(t, user)) return false;

      const isPersonal = Boolean(t.is_personal);
      const isAssigned = !isPersonal;

      if (scopeFilter === "personal") return isPersonal;
      if (scopeFilter === "assigned") return isAssigned;
      return true;
    });
  }, [tasks, isAdminView, user, scopeFilter]);

  // Metrics based on scoped tasks
  const inProgressCount = scopedTasks.filter((t) => t.status === "in_progress").length;
  const blockedCount = scopedTasks.filter((t) => t.status === "blocked").length;
  const completedCount = scopedTasks.filter((t) => t.status === "completed").length;
  const completionRate = scopedTasks.length > 0 ? Math.round((completedCount / scopedTasks.length) * 100) : 0;

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return scopedTasks.filter((task) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        task.title.toLowerCase().includes(q) ||
        task.description?.toLowerCase().includes(q) ||
        task.project_name?.toLowerCase().includes(q) ||
        task.tags.some((t) => t.toLowerCase().includes(q)) ||
        task.assignees.some((a) => a.name.toLowerCase().includes(q));

      // Status
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;

      // Priority
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

      // Assignee (for admin)
      const matchesAssignee =
        assigneeFilter === "all" ||
        task.assignees.some((a) => a.id === assigneeFilter || a.name === assigneeFilter);

      // Project
      let matchesProject = true;
      if (projectFilter === "none") {
        matchesProject = !task.project_id && !task.project_name;
      } else if (projectFilter !== "all") {
        const selectedProj = projectOptions.find((p) => p.id === projectFilter);
        matchesProject =
          (Boolean(task.project_id) && String(task.project_id) === projectFilter) ||
          (Boolean(selectedProj) && task.project_name === selectedProj!.name) ||
          task.project_name === projectFilter;
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesProject;
    });
  }, [scopedTasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, projectFilter, projectOptions]);

  // Task Actions
  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    saveTasks(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus });
    }
  };

  const handleMoveTask = (taskId: string, newStatus: TaskStatus, targetTaskId?: string) => {
    const moving = tasks.find((t) => t.id === taskId);
    if (!moving) return;
    const updatedTask: TaskItem = {
      ...moving,
      status: newStatus,
    };
    const withoutMoving = tasks.filter((t) => t.id !== taskId);
    if (targetTaskId) {
      const targetIndex = withoutMoving.findIndex((t) => t.id === targetTaskId);
      if (targetIndex !== -1) {
        withoutMoving.splice(targetIndex, 0, updatedTask);
        saveTasks(withoutMoving);
        return;
      }
    }
    saveTasks([...withoutMoving, updatedTask]);
  };

  const handleSaveTask = (updatedTask: TaskItem) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    saveTasks(updated);
    setSelectedTask(updatedTask);
  };

  const handleCreateTask = (newTask: TaskItem) => {
    const updated = [newTask, ...tasks];
    saveTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasks(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const handleOpenNewTask = (defaultStatus: TaskStatus = "planned") => {
    setNewTaskDefaultStatus(defaultStatus);
    setIsNewTaskOpen(true);
  };

  return (
    <PortalLayout activeNav={isAdminView ? "Staff Tasks" : "My Tasks"}>
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* 1. Grounded Modern Header (No Breadcrumbs) */}
        <PageHeader
          title={isAdminView ? "Organization Tasks & Staff Sprint Board" : "My Deliverables & Personal Tasks"}
          description={
            isAdminView
              ? "View everyone's tasks across the organization, create & assign deliverables to any staff member, and review team blockers."
              : "Manage your personal to-dos and assigned deliverables. Update your progress and log daily standups."
          }
          icon={CheckSquare}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <button
              type="button"
              onClick={() => handleOpenNewTask("planned")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-medium transition shadow-sm active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isAdminView ? "Create & Assign Task to Staff" : "+ New Personal Task"}</span>
            </button>
          }
        />

        {/* 2. Top 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Total Tasks */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 truncate max-w-[80px] sm:max-w-none">
                {isAdminView ? "Org Scope" : "Personal"}
              </span>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-medium text-neutral-500 truncate">
                {isAdminView ? "All Staff Work Items" : "My Tasks"}
              </div>
              <div className="text-lg sm:text-2xl font-semibold text-neutral-900 mt-0.5 font-headline">{scopedTasks.length}</div>
            </div>
          </div>

          {/* In Progress */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                Active
              </span>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-medium text-neutral-500 truncate">In Progress</div>
              <div className="text-lg sm:text-2xl font-semibold text-neutral-900 mt-0.5 font-headline">{inProgressCount}</div>
            </div>
          </div>

          {/* Blocked / Under Review */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                Review
              </span>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-medium text-neutral-500 truncate">Under Review</div>
              <div className="text-lg sm:text-2xl font-semibold text-neutral-900 mt-0.5 font-headline">{blockedCount}</div>
            </div>
          </div>

          {/* Completed Rate */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                {completionRate}% Done
              </span>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-medium text-neutral-500 truncate">Completed</div>
              <div className="text-lg sm:text-2xl font-semibold text-emerald-600 mt-0.5 font-headline">{completedCount}</div>
            </div>
          </div>
        </div>

        {/* 3. View Mode Switcher + Scope Filter & Search Toolbar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 sm:gap-4">
          {/* Left: View Mode Pills (Kanban Board vs Table vs Daily Log) + Scope Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl overflow-x-auto no-scrollbar max-w-full">
              <button
                type="button"
                onClick={() => handleSetViewMode("kanban")}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition ${
                  viewMode === "kanban"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <LayoutGrid className={`h-4 w-4 ${viewMode === "kanban" ? "text-[#ff6900]" : "text-neutral-400"}`} />
                <span>Kanban<span className="hidden sm:inline"> Board</span></span>
              </button>

              <button
                type="button"
                onClick={() => handleSetViewMode("table")}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition ${
                  viewMode === "table"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <TableIcon className={`h-4 w-4 ${viewMode === "table" ? "text-[#ff6900]" : "text-neutral-400"}`} />
                <span>Table<span className="hidden sm:inline"> View</span></span>
              </button>

              {!isAdminView && (
                <button
                  type="button"
                  onClick={() => handleSetViewMode("log")}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition ${
                    viewMode === "log"
                      ? "bg-white text-neutral-900 shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <Clock className={`h-4 w-4 ${viewMode === "log" ? "text-[#ff6900]" : "text-neutral-400"}`} />
                  <span>Daily Log<span className="hidden sm:inline"> &amp; Standup</span></span>
                </button>
              )}
            </div>

            {/* Scope Filter for Personal Workplace: All My Tasks / Assigned to Me / Personal Tasks */}
            {!isAdminView && viewMode !== "log" && (
              <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl text-xs font-semibold shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setScopeFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    scopeFilter === "all" ? "bg-white text-neutral-900 font-medium shadow-xs" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  All ({scopedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter("assigned")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    scopeFilter === "assigned" ? "bg-white text-neutral-900 font-medium shadow-xs" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Assigned
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter("personal")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    scopeFilter === "personal" ? "bg-white text-neutral-900 font-medium shadow-xs" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  Personal
                </button>
              </div>
            )}
          </div>

          {/* Right: Search & Filters (Shown for Kanban & Table) */}
          {viewMode !== "log" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto">
              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAdminView ? "Search staff tasks..." : "Search my tasks or tags..."}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                />
              </div>

              {/* Filter Dropdowns Grid on Mobile: side-by-side instead of stacking 3-4 deep */}
              <div className={`grid ${isAdminView ? "grid-cols-2" : "grid-cols-3"} sm:flex sm:items-center gap-2 w-full sm:w-auto`}>
                {/* Staff Member Filter (Admin Console Only) */}
                {isAdminView && (
                  <SelectBox
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="h-9 text-xs font-medium bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1 text-neutral-700 outline-none hover:bg-neutral-100 truncate"
                  >
                    <option value="all">All Staff</option>
                    {colleagues.map((member) => (
                      <option key={member.id} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </SelectBox>
                )}

                {/* Project Filter */}
                <SelectBox
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="h-9 text-xs font-medium bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1 text-neutral-700 outline-none hover:bg-neutral-100 truncate"
                >
                  <option value="all">All Projects</option>
                  <option value="none">No Project</option>
                  {projectOptions.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </SelectBox>

                {/* Status Filter */}
                <SelectBox
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 text-xs font-medium bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1 text-neutral-700 outline-none hover:bg-neutral-100 truncate"
                >
                  <option value="all">All Lanes</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Under Review</option>
                  <option value="completed">Completed</option>
                </SelectBox>

                {/* Priority Filter */}
                <SelectBox
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="h-9 text-xs font-medium bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1 text-neutral-700 outline-none hover:bg-neutral-100 truncate"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </SelectBox>
              </div>
            </div>
          )}
        </div>

        {/* 4. Main Views */}
        <div className="min-w-0">
          {viewMode === "kanban" && (
            <TaskKanbanView
              tasks={filteredTasks}
              onSelectTask={(task) => setSelectedTask(task)}
              onUpdateStatus={handleUpdateStatus}
              onMoveTask={handleMoveTask}
              onOpenNewTask={handleOpenNewTask}
            />
          )}

          {viewMode === "table" && (
            <TaskTableView
              tasks={filteredTasks}
              onSelectTask={(task) => setSelectedTask(task)}
              onUpdateStatus={handleUpdateStatus}
              onDeleteTask={isAdminView ? handleDeleteTask : undefined}
            />
          )}

          {viewMode === "log" && !isAdminView && (
            <DailyLogTab
              preselectedTaskId={logTaskId}
              onPreselectedConsumed={() => setLogTaskId(undefined)}
            />
          )}
        </div>

        {/* 5. Slide-Overs */}
        {selectedTask && (
          <TaskDetailSlideOver
            task={selectedTask}
            isOpen={Boolean(selectedTask)}
            isAdmin={isAdminView}
            onClose={() => setSelectedTask(null)}
            onSaveTask={handleSaveTask}
            onDeleteTask={isAdminView ? handleDeleteTask : undefined}
          />
        )}

        {isNewTaskOpen && (
          <NewTaskSlideOver
            isOpen={isNewTaskOpen}
            defaultStatus={newTaskDefaultStatus}
            isAdmin={isAdminView}
            projects={projectOptions}
            onClose={() => setIsNewTaskOpen(false)}
            onCreateTask={handleCreateTask}
          />
        )}
      </div>
    </PortalLayout>
  );
}
