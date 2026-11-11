import React from "react";
import {
  Calendar,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ArrowUpDown,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { TaskItem, TaskStatus, TaskPriority } from "./types";

interface TaskTableViewProps {
  tasks: TaskItem[];
  onSelectTask: (task: TaskItem) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask?: (taskId: string) => void;
}

const STATUS_SELECT_STYLES: Record<TaskStatus, { bg: string; label: string }> = {
  planned: { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Planned" },
  in_progress: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "In Progress" },
  blocked: { bg: "bg-amber-50 text-amber-800 border-amber-200", label: "Under Review" },
  completed: { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "Completed" },
};

const PRIORITY_BADGES: Record<TaskPriority, { text: string; bg: string }> = {
  low: { text: "Low", bg: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { text: "Medium", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  high: { text: "High", bg: "bg-orange-50 text-[#ff6900] border-orange-200 font-bold" },
  critical: { text: "Critical", bg: "bg-rose-50 text-rose-700 border-rose-200 font-extrabold" },
};

export function TaskTableView({
  tasks,
  onSelectTask,
  onUpdateStatus,
  onDeleteTask,
}: TaskTableViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <p className="text-xs font-bold text-slate-700">No tasks match your criteria</p>
        <p className="text-[11px] text-slate-400 mt-1">Adjust filters or create a new task to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Task Deliverable</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Tagged Colleagues</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Updates</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
              const statusStyle = STATUS_SELECT_STYLES[task.status] || STATUS_SELECT_STYLES.planned;
              const isOverdue =
                task.due_date &&
                task.status !== "completed" &&
                new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Task Deliverable */}
                  <td className="py-3.5 px-4 min-w-[260px] max-w-[340px]">
                    <div className="font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors leading-snug">
                      {task.title}
                    </div>
                    {task.project_name && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Project: <span className="font-semibold text-slate-600">{task.project_name}</span>
                      </div>
                    )}
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                      className={`text-[11px] font-bold rounded-lg border px-2.5 py-1 outline-none cursor-pointer transition ${statusStyle.bg}`}
                    >
                      <option value="planned">● Planned</option>
                      <option value="in_progress">● In Progress</option>
                      <option value="blocked">● Under Review</option>
                      <option value="completed">✓ Completed</option>
                    </select>
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] border ${priority.bg}`}>
                      {priority.text}
                    </span>
                  </td>

                  {/* Tagged Colleagues */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {task.assignees?.length > 0 ? (
                        task.assignees.map((a, idx) => (
                          <div
                            key={idx}
                            title={`${a.name} (${a.role || "Team"})`}
                            className="w-6 h-6 rounded-full bg-slate-800 text-white font-extrabold text-[9px] flex items-center justify-center border-2 border-white shadow-xs shrink-0"
                          >
                            {a.avatar || a.name.slice(0, 2).toUpperCase()}
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                      )}
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {task.due_date ? (
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isOverdue
                            ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[11px]"
                            : "text-slate-600"
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        <span>{task.due_date}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No date</span>
                    )}
                  </td>

                  {/* Updates */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {task.updates?.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        <MessageSquare className="h-3 w-3 text-slate-400" />
                        <span>{task.updates.length} updates</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td
                    className="py-3.5 px-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectTask(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                        title="View details & updates"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      {onDeleteTask && (
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
