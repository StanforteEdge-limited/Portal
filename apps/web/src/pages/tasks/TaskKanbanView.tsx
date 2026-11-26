import { SelectBox } from "@/components/ui/select";
import React, { useState } from "react";
import {
  MessageSquare,
  Plus,
  Calendar,
  ArrowRight,
  GripVertical,
} from "lucide-react";
import type { TaskItem, TaskStatus, TaskPriority } from "./types";
import { stripHtml } from "@/shared/components/ui/RichTextEditor";

interface TaskKanbanViewProps {
  tasks: TaskItem[];
  onSelectTask: (task: TaskItem) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onMoveTask?: (taskId: string, newStatus: TaskStatus, targetTaskId?: string) => void;
  onOpenNewTask: (defaultStatus?: TaskStatus) => void;
}

interface ColumnDef {
  status: TaskStatus;
  title: string;
  dotColor: string;
}

const COLUMNS: ColumnDef[] = [
  { status: "planned", title: "Planned", dotColor: "bg-neutral-400" },
  { status: "in_progress", title: "In progress", dotColor: "bg-[#C2410C]" },
  { status: "blocked", title: "In review", dotColor: "bg-amber-600" },
  { status: "completed", title: "Completed", dotColor: "bg-emerald-600" },
];

const PRIORITY_BADGES: Record<TaskPriority, { text: string; bg: string }> = {
  low: { text: "Low", bg: "bg-neutral-100 text-neutral-600 border-neutral-900/[0.06]" },
  medium: { text: "Medium", bg: "bg-neutral-100 text-neutral-700 border-neutral-900/[0.08]" },
  high: { text: "High", bg: "bg-orange-50 text-[#c2410c] border-orange-600/15" },
  critical: { text: "Critical", bg: "bg-red-50 text-red-700 border-red-600/15" },
};

export function TaskKanbanView({
  tasks,
  onSelectTask,
  onUpdateStatus,
  onMoveTask,
  onOpenNewTask,
}: TaskKanbanViewProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverLane, setDragOverLane] = useState<TaskStatus | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverLane(null);
    setDragOverTaskId(null);
  };

  const handleLaneDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverLane !== status) {
      setDragOverLane(status);
    }
  };

  const handleLaneDrop = (e: React.DragEvent, status: TaskStatus, targetTaskId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId && taskId !== targetTaskId) {
      if (onMoveTask) {
        onMoveTask(taskId, status, targetTaskId);
      } else {
        onUpdateStatus(taskId, status);
      }
    }
    handleDragEnd();
  };

  return (
    <div className="flex md:grid md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory pb-4 md:pb-0 items-start no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status);
        const isLaneTarget = dragOverLane === col.status && draggedTaskId !== null;

        return (
          <div
            key={col.status}
            onDragOver={(e) => handleLaneDragOver(e, col.status)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setDragOverLane((prev) => (prev === col.status ? null : prev));
              }
            }}
            onDrop={(e) => handleLaneDrop(e, col.status)}
            className={`w-[82vw] sm:w-[320px] md:w-auto shrink-0 snap-center md:shrink rounded-2xl p-3 flex flex-col min-h-[400px] sm:min-h-[500px] border transition-colors duration-150 ${
              isLaneTarget
                ? "bg-orange-50/40 border-[#ff6900]/50"
                : "bg-neutral-100/70 border-neutral-900/[0.08]"
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 px-1 border-b border-neutral-900/[0.08] mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <h3 className="text-xs font-medium text-neutral-900">{col.title}</h3>
                <span className="text-xs font-mono text-neutral-500 tabular-nums">
                  {colTasks.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onOpenNewTask(col.status)}
                className="p-1 rounded-md hover:bg-neutral-200/70 text-neutral-500 hover:text-neutral-900 transition-colors"
                title={`Add task to ${col.title}`}
                aria-label={`Add task to ${col.title}`}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Tasks Container */}
            <div className="space-y-2.5 flex-1">
              {colTasks.length === 0 ? (
                <div
                  className={`py-8 text-center border border-dashed rounded-xl transition-colors ${
                    isLaneTarget
                      ? "border-[#ff6900]/50 bg-white/80"
                      : "border-neutral-900/[0.10] bg-white/40"
                  }`}
                >
                  <p className="text-xs text-neutral-500">
                    {isLaneTarget ? "Drop task here" : "No tasks in this lane"}
                  </p>
                  {!isLaneTarget ? (
                    <button
                      type="button"
                      onClick={() => onOpenNewTask(col.status)}
                      className="text-xs font-medium text-[#c2410c] hover:underline mt-1"
                    >
                      Add task
                    </button>
                  ) : null}
                </div>
              ) : (
                colTasks.map((task) => {
                  const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                  const isOverdue =
                    task.due_date &&
                    task.status !== "completed" &&
                    new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                  const isDragging = draggedTaskId === task.id;
                  const isDropTarget = dragOverTaskId === task.id && draggedTaskId !== task.id;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverLane(col.status);
                        setDragOverTaskId(task.id);
                      }}
                      onDragLeave={() => {
                        setDragOverTaskId((prev) => (prev === task.id ? null : prev));
                      }}
                      onDrop={(e) => handleLaneDrop(e, col.status, task.id)}
                      onClick={() => onSelectTask(task)}
                      className={`bg-white p-4 rounded-xl border shadow-xs transition-[border-color,opacity,box-shadow] duration-150 cursor-grab active:cursor-grabbing group flex flex-col justify-between ${
                        isDragging
                          ? "opacity-45 border-neutral-300"
                          : isDropTarget
                          ? "border-t-2 border-t-[#ff6900] border-neutral-900/[0.12]"
                          : "border-neutral-900/[0.08] hover:border-neutral-900/[0.20]"
                      }`}
                    >
                      <div>
                        {/* Top Meta: Drag Handle, Priority & Project */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <GripVertical
                              className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-600 shrink-0"
                              strokeWidth={1.5}
                            />
                            <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${priority.bg}`}>
                              {priority.text}
                            </span>
                          </div>

                          {task.project_name && (
                            <span className="text-xs text-neutral-500 truncate max-w-[120px]">
                              {task.project_name}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-medium text-neutral-900 leading-snug mb-1.5">
                          {task.title}
                        </h4>

                        {/* Description snippet */}
                        {task.description && (
                          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-3">
                            {stripHtml(task.description)}
                          </p>
                        )}

                        {/* Tags */}
                        {task.tags?.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mb-3">
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs font-mono px-1.5 py-0.5 rounded bg-neutral-50 border border-neutral-900/[0.06] text-neutral-500"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Assignees & Due Date */}
                      <div className="pt-2.5 border-t border-neutral-900/[0.06] flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {task.assignees?.length > 0 ? (
                            task.assignees.slice(0, 3).map((a, idx) => (
                              <div
                                key={idx}
                                title={`${a.name} (${a.role || "Team"})`}
                                className="w-6 h-6 rounded-md bg-neutral-900 text-white font-medium text-[11px] flex items-center justify-center border border-white"
                              >
                                {a.avatar || a.name.slice(0, 2).toUpperCase()}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-neutral-400">Unassigned</span>
                          )}
                          {task.assignees?.length > 3 && (
                            <div className="w-6 h-6 rounded-md bg-neutral-200 text-neutral-700 font-medium text-[11px] flex items-center justify-center border border-white">
                              +{task.assignees.length - 3}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                          {task.updates?.length > 0 && (
                            <span
                              className="flex items-center gap-1 text-neutral-500"
                              title={`${task.updates.length} updates`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span>{task.updates.length}</span>
                            </span>
                          )}

                          {task.due_date && (
                            <span
                              className={`flex items-center gap-1 ${
                                isOverdue
                                  ? "text-red-700 bg-red-50 px-1.5 py-0.5 rounded"
                                  : "text-neutral-500"
                              }`}
                              title={isOverdue ? "Overdue task" : `Due ${task.due_date}`}
                            >
                              <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                              <span>{task.due_date.slice(5)}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Accessible Quick Move Bar */}
                      <div className="pt-2 mt-2 border-t border-neutral-900/[0.06] flex items-center justify-between gap-2">
                        <SelectBox
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(task.id, e.target.value as TaskStatus);
                          }}
                          className="h-7 text-xs font-medium text-neutral-700 bg-neutral-50 border border-neutral-900/[0.08] rounded-md px-2 py-0.5 outline-none hover:bg-neutral-100 transition-colors"
                        >
                          <option value="planned">Planned</option>
                          <option value="in_progress">In progress</option>
                          <option value="blocked">In review</option>
                          <option value="completed">Completed</option>
                        </SelectBox>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTask(task);
                          }}
                          className="text-xs font-medium text-[#c2410c] hover:underline flex items-center gap-1"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
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
