import { SelectBox } from "@/components/ui/select";
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
  planned: { bg: "bg-neutral-100 text-neutral-700 border-neutral-200", label: "Planned" },
  in_progress: { bg: "bg-neutral-100 text-neutral-700 border-neutral-200", label: "In Progress" },
  blocked: { bg: "bg-amber-50 text-amber-800 border-amber-200", label: "Under Review" },
  completed: { bg: "bg-emerald-50 text-emerald-800 border-emerald-200", label: "Completed" },
};

const PRIORITY_BADGES: Record<TaskPriority, { text: string; bg: string }> = {
  low: { text: "Low", bg: "bg-neutral-100 text-neutral-600 border-neutral-200" },
  medium: { text: "Medium", bg: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  high: { text: "High", bg: "bg-orange-50 text-[#C2410C] border-orange-200 font-medium" },
  critical: { text: "Critical", bg: "bg-rose-50 text-rose-700 border-rose-200 font-semibold" },
};

export function TaskTableView({
  tasks,
  onSelectTask,
  onUpdateStatus,
  onDeleteTask,
}: TaskTableViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80 shadow-sm">
        <p className="text-xs font-medium text-neutral-700">No tasks match your criteria</p>
        <p className="text-xs text-neutral-400 mt-1">Adjust filters or create a new task to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-sm overflow-hidden">
      {/* Mobile Card List (< 768px) */}
      <div className="block md:hidden divide-y divide-neutral-100">
        {tasks.map((task) => {
          const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
          const statusStyle = STATUS_SELECT_STYLES[task.status] || STATUS_SELECT_STYLES.planned;
          const isOverdue =
            task.due_date &&
            task.status !== "completed" &&
            new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="p-4 active:bg-neutral-50 transition cursor-pointer flex flex-col gap-3"
            >
              {/* Header: Title + Priority */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-neutral-900 leading-snug">
                    {task.title}
                  </div>
                  {task.project_name && (
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Project: <span className="font-semibold text-neutral-600">{task.project_name}</span>
                    </div>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-md text-xs border shrink-0 ${priority.bg}`}>
                  {priority.text}
                </span>
              </div>

              {/* Status Select & Due Date */}
              <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                <SelectBox
                  value={task.status}
                  onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                  className={`text-xs font-medium rounded-lg border px-2.5 py-1.5 outline-none cursor-pointer transition ${statusStyle.bg}`}
                >
                  <option value="planned">● Planned</option>
                  <option value="in_progress">● In Progress</option>
                  <option value="blocked">● Under Review</option>
                  <option value="completed">✓ Completed</option>
                </SelectBox>

                {task.due_date ? (
                  <span
                    className={`inline-flex items-center gap-1 font-semibold text-xs ${
                      isOverdue
                        ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full"
                        : "text-neutral-600"
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{task.due_date}</span>
                  </span>
                ) : (
                  <span className="text-neutral-400 text-xs">No date</span>
                )}
              </div>

              {/* Assignees, Updates & Actions Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                <div className="flex items-center gap-3">
                  {/* Tagged colleagues */}
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {task.assignees?.length > 0 ? (
                      task.assignees.map((a, idx) => (
                        <div
                          key={idx}
                          title={`${a.name} (${a.role || "Team"})`}
                          className="w-6 h-6 rounded-full bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center border-2 border-white shadow-xs shrink-0"
                        >
                          {a.avatar || a.name.slice(0, 2).toUpperCase()}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-400 italic">Unassigned</span>
                    )}
                  </div>

                  {/* Updates count */}
                  {task.updates?.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium text-xs">
                      <MessageSquare className="h-3 w-3 text-neutral-400" />
                      <span>{task.updates.length}</span>
                    </span>
                  )}
                </div>

                {/* Touch actions */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onSelectTask(task)}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 active:bg-neutral-100 transition"
                    title="View details & updates"
                    aria-label="View details & updates"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  {onDeleteTask && (
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-rose-600 active:bg-rose-50 transition"
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop/Tablet Data Table (>= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/70 text-xs font-medium text-neutral-500">
              <th className="py-3 px-4">Task Deliverable</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Tagged Colleagues</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Updates</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
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
                  className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                >
                  {/* Task Deliverable */}
                  <td className="py-3.5 px-4 min-w-[260px] max-w-[340px]">
                    <div className="font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors leading-snug">
                      {task.title}
                    </div>
                    {task.project_name && (
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Project: <span className="font-semibold text-neutral-600">{task.project_name}</span>
                      </div>
                    )}
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <SelectBox
                      value={task.status}
                      onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                      className={`text-xs font-medium rounded-lg border px-2.5 py-1 outline-none cursor-pointer transition ${statusStyle.bg}`}
                    >
                      <option value="planned">● Planned</option>
                      <option value="in_progress">● In Progress</option>
                      <option value="blocked">● Under Review</option>
                      <option value="completed">✓ Completed</option>
                    </SelectBox>
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md text-xs border ${priority.bg}`}>
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
                            className="w-6 h-6 rounded-full bg-neutral-800 text-white font-semibold text-xs flex items-center justify-center border-2 border-white shadow-xs shrink-0"
                          >
                            {a.avatar || a.name.slice(0, 2).toUpperCase()}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-400 italic">Unassigned</span>
                      )}
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {task.due_date ? (
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isOverdue
                            ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-xs"
                            : "text-neutral-600"
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        <span>{task.due_date}</span>
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-xs">No date</span>
                    )}
                  </td>

                  {/* Updates */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {task.updates?.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium text-xs">
                        <MessageSquare className="h-3 w-3 text-neutral-400" />
                        <span>{task.updates.length} updates</span>
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
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
                        className="min-h-[36px] min-w-[36px] p-2 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition"
                        title="View details & updates"
                        aria-label="View details & updates"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      {onDeleteTask && (
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          className="min-h-[36px] min-w-[36px] p-2 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete task"
                          aria-label="Delete task"
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

