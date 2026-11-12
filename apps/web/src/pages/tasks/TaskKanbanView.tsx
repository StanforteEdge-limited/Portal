import { SelectBox } from "@/components/ui/select";
import React from "react";
import {
  Clock,
  MessageSquare,
  AlertCircle,
  MoreVertical,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import type { TaskItem, TaskStatus, TaskPriority } from "./types";

interface TaskKanbanViewProps {
  tasks: TaskItem[];
  onSelectTask: (task: TaskItem) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onOpenNewTask: (defaultStatus?: TaskStatus) => void;
}

interface ColumnDef {
  status: TaskStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
  headerBorder: string;
}

const COLUMNS: ColumnDef[] = [
  {
    status: "planned",
    title: "Planned / Backlog",
    dotColor: "bg-slate-400",
    badgeBg: "bg-slate-100 text-slate-700",
    headerBorder: "border-slate-300",
  },
  {
    status: "in_progress",
    title: "In Progress",
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-50 text-blue-700 border border-blue-200/60",
    headerBorder: "border-blue-500",
  },
  {
    status: "blocked",
    title: "Under Review / Blocked",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-50 text-amber-800 border border-amber-200/60",
    headerBorder: "border-amber-500",
  },
  {
    status: "completed",
    title: "Completed",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-50 text-emerald-800 border border-emerald-200/60",
    headerBorder: "border-emerald-500",
  },
];

const PRIORITY_BADGES: Record<TaskPriority, { text: string; bg: string }> = {
  low: { text: "Low", bg: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { text: "Medium", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  high: { text: "High", bg: "bg-orange-50 text-[#ff6900] border-orange-200 font-bold" },
  critical: { text: "Critical", bg: "bg-rose-50 text-rose-700 border-rose-200 font-extrabold" },
};

export function TaskKanbanView({
  tasks,
  onSelectTask,
  onUpdateStatus,
  onOpenNewTask,
}: TaskKanbanViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);

        return (
          <div
            key={col.status}
            className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/70 mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {col.title}
                </h3>
                <span className={`text-[11px] font-extrabold px-2 py-0.2 rounded-full ${col.badgeBg}`}>
                  {colTasks.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onOpenNewTask(col.status)}
                className="p-1 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition"
                title={`Add task to ${col.title}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Tasks Container */}
            <div className="space-y-3 flex-1">
              {colTasks.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-white/40">
                  <p className="text-[11px] font-semibold text-slate-400">No tasks in this lane</p>
                  <button
                    type="button"
                    onClick={() => onOpenNewTask(col.status)}
                    className="text-[11px] font-bold text-[#ff6900] hover:underline mt-1"
                  >
                    + Add a task
                  </button>
                </div>
              ) : (
                colTasks.map((task) => {
                  const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                  const isOverdue =
                    task.due_date &&
                    task.status !== "completed" &&
                    new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-[#ff6900]/60 hover:shadow-md transition-all duration-150 cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Meta: Priority & Project */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border ${priority.bg}`}>
                            {priority.text}
                          </span>

                          {task.project_name && (
                            <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[120px]">
                              {task.project_name}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors leading-snug mb-1.5">
                          {task.title}
                        </h4>

                        {/* Description snippet */}
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                            {task.description}
                          </p>
                        )}

                        {/* Tags */}
                        {task.tags?.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mb-3">
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-500"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Assignees & Due Date */}
                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-1">
                        {/* Tagged Colleagues Avatars */}
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {task.assignees?.length > 0 ? (
                            task.assignees.slice(0, 3).map((a, idx) => (
                              <div
                                key={idx}
                                title={`${a.name} (${a.role || "Team"})`}
                                className="w-6 h-6 rounded-full bg-slate-800 text-white font-extrabold text-[9px] flex items-center justify-center border-2 border-white shadow-xs"
                              >
                                {a.avatar || a.name.slice(0, 2).toUpperCase()}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                          )}
                          {task.assignees?.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center border-2 border-white shadow-xs">
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>

                        {/* Right info: Updates count & Due date */}
                        <div className="flex items-center gap-2 text-[10px]">
                          {task.updates?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-400 font-semibold" title={`${task.updates.length} progress updates`}>
                              <MessageSquare className="h-3 w-3" />
                              <span>{task.updates.length}</span>
                            </span>
                          )}

                          {task.due_date && (
                            <span
                              className={`flex items-center gap-1 font-semibold ${
                                isOverdue
                                  ? "text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded"
                                  : "text-slate-500"
                              }`}
                              title={isOverdue ? "Overdue task!" : `Due ${task.due_date}`}
                            >
                              <Calendar className="h-3 w-3" />
                              <span>{task.due_date.slice(5)}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Move Action Bar on Hover */}
                      <div className="pt-2 mt-2 border-t border-dashed border-slate-100 flex items-center justify-between">
                        <SelectBox
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(task.id, e.target.value as TaskStatus);
                          }}
                          className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 outline-none hover:bg-slate-100 transition"
                        >
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="blocked">Blocked / Review</option>
                          <option value="completed">Completed</option>
                        </SelectBox>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTask(task);
                          }}
                          className="text-[10px] font-bold text-[#ff6900] hover:underline flex items-center gap-0.5"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

