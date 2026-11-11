import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { useAuth } from "@/shared/context/AuthProvider";
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
  Sparkles,
} from "lucide-react";
import type { TaskItem, TaskStatus, TaskPriority } from "./types";
import { INITIAL_TASKS } from "./types";
import { TaskKanbanView } from "./TaskKanbanView";
import { TaskTableView } from "./TaskTableView";
import { TaskDetailSlideOver } from "./TaskDetailSlideOver";
import { NewTaskSlideOver } from "./NewTaskSlideOver";
import DailyLogTab from "./DailyLogTab";

type ViewMode = "kanban" | "table" | "log";

export default function TasksPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Load from local storage or fallback to INITIAL_TASKS
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem("portal_tasks_data");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_TASKS;
  });

  const saveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem("portal_tasks_data", JSON.stringify(newTasks));
    } catch {}
  };

  // View Mode: Kanban vs Table vs Daily Log
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get("view") as ViewMode | null) || "kanban"
  );

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setSearchParams({ view: mode }, { replace: true });
  };

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // Slide-over states
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskDefaultStatus, setNewTaskDefaultStatus] = useState<TaskStatus>("planned");
  const [logTaskId, setLogTaskId] = useState<string | undefined>();

  // Metrics
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const blockedCount = tasks.filter((t) => t.status === "blocked").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
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

      // Assignee
      const matchesAssignee =
        assigneeFilter === "all" ||
        task.assignees.some((a) => a.id === assigneeFilter || a.name === assigneeFilter);

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter]);

  // Task Actions
  const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    saveTasks(updated);
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus });
    }
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
    <PortalLayout activeNav="Tasks & Board">
      <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
        {/* 1. Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-slate-800 transition">
                Workspace
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#ff6900]">Task Management &amp; Kanban</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Work Items &amp; Deliverables
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose your preferred view (Kanban Board or Table), tag colleagues, post progress updates, and organize team sprints.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenNewTask("planned")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* 2. Top 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Tasks */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tasks</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 font-headline">{tasks.length}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Sprint 44
            </span>
          </div>

          {/* In Progress */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">In Progress</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 font-headline">{inProgressCount}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              Active
            </span>
          </div>

          {/* Blocked / Under Review */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Under Review</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5 font-headline">{blockedCount}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
              Review
            </span>
          </div>

          {/* Completed Rate */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed</div>
                <div className="text-2xl font-black text-emerald-600 mt-0.5 font-headline">{completedCount}</div>
              </div>
            </div>
            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              {completionRate}% Done
            </span>
          </div>
        </div>

        {/* 3. View Mode Switcher + Search & Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Left: View Mode Pills (Kanban Board vs Table vs Daily Log) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 self-start">
            <button
              type="button"
              onClick={() => handleSetViewMode("kanban")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "kanban"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className={`h-4 w-4 ${viewMode === "kanban" ? "text-[#ff6900]" : "text-slate-400"}`} />
              <span>Kanban Board</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode("table")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className={`h-4 w-4 ${viewMode === "table" ? "text-[#ff6900]" : "text-slate-400"}`} />
              <span>Table View</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode("log")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "log"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className={`h-4 w-4 ${viewMode === "log" ? "text-[#ff6900]" : "text-slate-400"}`} />
              <span>Daily Log &amp; Standup</span>
            </button>
          </div>

          {/* Right: Search & Filters (Shown for Kanban & Table) */}
          {viewMode !== "log" && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, tags, or assignees..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 outline-none hover:bg-slate-100"
              >
                <option value="all">All Lanes</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Under Review</option>
                <option value="completed">Completed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 outline-none hover:bg-slate-100"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
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
              onOpenNewTask={handleOpenNewTask}
            />
          )}

          {viewMode === "table" && (
            <TaskTableView
              tasks={filteredTasks}
              onSelectTask={(task) => setSelectedTask(task)}
              onUpdateStatus={handleUpdateStatus}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {viewMode === "log" && (
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
            onClose={() => setSelectedTask(null)}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {isNewTaskOpen && (
          <NewTaskSlideOver
            isOpen={isNewTaskOpen}
            defaultStatus={newTaskDefaultStatus}
            onClose={() => setIsNewTaskOpen(false)}
            onCreateTask={handleCreateTask}
          />
        )}
      </div>
    </PortalLayout>
  );
}
