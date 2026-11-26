import { DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";
import React, { useState } from "react";
import {
  X,
  MessageSquare,
  Send,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Tag,
  AtSign,
  Plus,
} from "lucide-react";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
import type { TaskItem, TaskStatus, TaskPriority, TaskAssignee } from "./types";
import { useColleagues } from "@/shared/hooks/useColleagues";
import { RichTextEditor } from "@/shared/components/ui/RichTextEditor";

export interface TaskDetailSlideOverProps {
  task?: TaskItem;
  item?: any;
  isOpen?: boolean;
  open?: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onSaveTask?: (updatedTask: TaskItem) => void;
  onUpdated?: () => void;
  onDeleteTask?: (taskId: string) => void;
  onLogToday?: (item: any) => void;
}

export function TaskDetailSlideOver({
  task,
  item,
  isOpen = true,
  open = true,
  isAdmin = false,
  onClose,
  onSaveTask,
  onUpdated,
  onDeleteTask,
  onLogToday,
}: TaskDetailSlideOverProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const effectiveTask: TaskItem = task || {
    id: item?.id || "task-fallback",
    title: item?.title || "Task Item",
    description: item?.description || "",
    status: (item?.status as TaskStatus) || "planned",
    priority: (item?.priority as TaskPriority) || "medium",
    due_date: item?.due_date ? String(item.due_date).slice(0, 10) : undefined,
    assignees: item?.assignees || [],
    tags: item?.tags || ["Deliverable"],
    project_name: item?.project_name || item?.owner_team?.name || undefined,
    updates: item?.updates || [],
  };

  const [currentTask, setCurrentTask] = useState<TaskItem>({ ...effectiveTask });
  const [updateText, setUpdateText] = useState("");
  const [selectedColleagueId, setSelectedColleagueId] = useState("");

  // Sync state if task prop changes
  React.useEffect(() => {
    setCurrentTask({ ...effectiveTask });
  }, [task, item]);

  const authorName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Colleague";

  const authorAvatar = authorName.slice(0, 2).toUpperCase();

  // Add a progress update
  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) return;

    const newUpdate = {
      id: `upd-${Date.now()}`,
      author: authorName,
      avatar: authorAvatar,
      text: updateText.trim(),
      created_at: "Just now",
    };

    const updated = {
      ...currentTask,
      updates: [newUpdate, ...currentTask.updates],
    };

    setCurrentTask(updated);
    setUpdateText("");
    if (onSaveTask) onSaveTask(updated);
    if (onUpdated) onUpdated();
    showToast("Progress update posted successfully", "success");
  };

  const { colleagues } = useColleagues();

  // Tag a colleague
  const handleTagColleague = (colleagueId: string) => {
    if (!colleagueId) return;
    const colleague = colleagues.find((m) => m.id === colleagueId);
    if (!colleague) return;

    if (currentTask.assignees.some((a) => a.id === colleagueId)) {
      showToast(`${colleague.name} is already tagged on this task`, "info");
      setSelectedColleagueId("");
      return;
    }

    const updated = {
      ...currentTask,
      assignees: [...currentTask.assignees, colleague],
    };

    setCurrentTask(updated);
    setSelectedColleagueId("");
    if (onSaveTask) onSaveTask(updated);
    if (onUpdated) onUpdated();
    showToast(`Tagged ${colleague.name} on task`, "success");
  };

  // Remove a tagged colleague
  const handleRemoveAssignee = (colleagueId: string) => {
    const updated = {
      ...currentTask,
      assignees: currentTask.assignees.filter((a) => a.id !== colleagueId),
    };
    setCurrentTask(updated);
    if (onSaveTask) onSaveTask(updated);
    if (onUpdated) onUpdated();
  };

  // Quick mention insertion into textarea
  const handleInsertMention = (name: string) => {
    setUpdateText((prev) => `${prev} @${name} `);
  };

  return (
    <SlideOver open={isOpen && open} onClose={onClose} size="xl">
      <SlideOverHeader title="Task Deliverable Details" onClose={onClose} />

      <SlideOverContent>
        <div className="space-y-6">
          {/* 1. Header Information & Editable Title */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-500 block">
              Task Title
            </label>
            <input
              type="text"
              value={currentTask.title}
              onChange={(e) => setCurrentTask({ ...currentTask, title: e.target.value })}
              className="w-full text-base font-medium text-neutral-900 border border-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#C2410C] focus:ring-1 focus:ring-[#C2410C]"
            />
          </div>

          {/* 2. Grid for Status, Priority, Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">
                Status
              </label>
              <SelectBox
                value={currentTask.status}
                onChange={(e) => {
                  const updated = { ...currentTask, status: e.target.value as TaskStatus };
                  setCurrentTask(updated);
                  if (onSaveTask) onSaveTask(updated);
                  if (onUpdated) onUpdated();
                }}
                className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800 outline-none focus:border-[#C2410C]"
              >
                <option value="planned">● Planned / Backlog</option>
                <option value="in_progress">● In Progress</option>
                <option value="blocked">● Under Review / Blocked</option>
                <option value="completed">✓ Completed</option>
              </SelectBox>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">
                Priority
              </label>
              <SelectBox
                value={currentTask.priority}
                onChange={(e) => {
                  const updated = { ...currentTask, priority: e.target.value as TaskPriority };
                  setCurrentTask(updated);
                  if (onSaveTask) onSaveTask(updated);
                  if (onUpdated) onUpdated();
                }}
                className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800 outline-none focus:border-[#C2410C]"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </SelectBox>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-xs font-medium text-neutral-500 block mb-1">
                Target Due Date
              </label>
              <DateInput
                
                value={currentTask.due_date || ""}
                onChange={(e) => {
                  const updated = { ...currentTask, due_date: e.target.value };
                  setCurrentTask(updated);
                  if (onSaveTask) onSaveTask(updated);
                  if (onUpdated) onUpdated();
                }}
                className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800 outline-none focus:border-[#C2410C]"
              />
            </div>
          </div>

          {/* 3. Description / Deliverables notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-500 block">
              Deliverables &amp; Technical Requirements
            </label>
            <RichTextEditor
              value={currentTask.description || ""}
              onChange={(val) => setCurrentTask({ ...currentTask, description: val })}
              placeholder="Outline specific objectives, acceptance criteria, or key dependencies..."
              minHeightClass="min-h-[110px]"
            />
          </div>

          {/* 4. Tagged Colleagues & Assignees */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#C2410C]" />
                <h4 className="text-xs font-medium text-neutral-900">
                  Tagged Colleagues &amp; Assignees ({currentTask.assignees.length})
                </h4>
              </div>

              {/* Tag Colleague Selector (Admins / Managers only) */}
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <SelectBox
                    value={selectedColleagueId}
                    onChange={(e) => handleTagColleague(e.target.value)}
                    className="text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-neutral-700 outline-none hover:bg-neutral-100"
                  >
                    <option value="">+ Reassign / Tag Colleague...</option>
                    {colleagues.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </SelectBox>
                </div>
              )}
            </div>

            {/* List of currently tagged people */}
            <div className="flex flex-wrap gap-2">
              {currentTask.assignees.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">
                  Unassigned task.
                </p>
              ) : (
                currentTask.assignees.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-medium text-neutral-800 shadow-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-xs font-semibold flex items-center justify-center">
                      {a.avatar || a.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span>{a.name}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignee(a.id)}
                        className="text-neutral-400 hover:text-rose-600 transition p-0.5"
                        title={`Remove ${a.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* 5. Progress Updates & Activity Feed */}
          <div className="space-y-4 pt-3 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-neutral-700" />
              <h4 className="text-xs font-medium text-neutral-900">
                Put Updates &amp; Discussion Feed ({currentTask.updates?.length || 0})
              </h4>
            </div>

            {/* Post Update Form */}
            <form onSubmit={handleAddUpdate} className="space-y-2">
              <div className="relative">
                <textarea
                  rows={2}
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  placeholder="Share a progress update, blockers, or deliverables link..."
                  className="w-full text-xs text-neutral-800 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-neutral-300 placeholder-neutral-400"
                />
              </div>

              <div className="flex items-center justify-between">
                {/* Quick Mention buttons */}
                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                  <span className="text-neutral-400 font-semibold flex items-center gap-0.5 mr-1">
                    <AtSign className="h-3 w-3" /> Mention:
                  </span>
                  {colleagues.slice(0, 4).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleInsertMention(m.name)}
                      className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold transition"
                    >
                      @{m.name.split(" ")[0]}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!updateText.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-medium transition shadow-xs"
                >
                  <Send className="h-3 w-3" />
                  <span>Post Update</span>
                </button>
              </div>
            </form>

            {/* Updates Timeline List */}
            <div className="space-y-3 pt-2">
              {currentTask.updates?.length === 0 ? (
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 text-center">
                  <p className="text-xs text-neutral-400">No progress updates logged yet.</p>
                </div>
              ) : (
                currentTask.updates.map((upd) => (
                  <div
                    key={upd.id}
                    className="p-3.5 rounded-xl bg-neutral-50/70 border border-neutral-200/70 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-neutral-900 text-white font-semibold text-xs flex items-center justify-center">
                          {upd.avatar || upd.author.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-neutral-900">{upd.author}</span>
                      </div>
                      <span className="text-xs text-neutral-400 font-medium">
                        {upd.created_at}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-700 pl-8 leading-relaxed">
                      {upd.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SlideOverContent>

      <SlideOverFooter>
        <div className="w-full flex items-center justify-between">
          {onDeleteTask ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this task?")) {
                  onDeleteTask(currentTask.id);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-medium transition"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {onLogToday && (
              <button
                type="button"
                onClick={() => {
                  onLogToday(currentTask);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold transition"
              >
                Log Today
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-medium transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                if (onSaveTask) onSaveTask(currentTask);
                if (onUpdated) onUpdated();
                showToast("Task updated successfully", "success");
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-medium transition shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </SlideOverFooter>
    </SlideOver>
  );
}

export default TaskDetailSlideOver;
