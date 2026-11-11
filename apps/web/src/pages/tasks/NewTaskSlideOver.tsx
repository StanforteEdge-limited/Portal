import React, { useState } from "react";
import {
  X,
  Users,
  Calendar,
  AlertCircle,
  FolderKanban,
  Tag,
  Plus,
} from "lucide-react";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
import type { TaskItem, TaskStatus, TaskPriority, TaskAssignee } from "./types";
import { SAMPLE_TEAM_MEMBERS } from "./types";

interface NewTaskSlideOverProps {
  isOpen: boolean;
  defaultStatus?: TaskStatus;
  onClose: () => void;
  onCreateTask: (newTask: TaskItem) => void;
}

export function NewTaskSlideOver({
  isOpen,
  defaultStatus = "planned",
  onClose,
  onCreateTask,
}: NewTaskSlideOverProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectName, setProjectName] = useState("Portal Modernization");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<TaskAssignee[]>([]);

  // Update defaultStatus if prop changes
  React.useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus]);

  const authorName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Colleague";

  const handleToggleAssignee = (colleague: TaskAssignee) => {
    if (selectedAssignees.some((a) => a.id === colleague.id)) {
      setSelectedAssignees(selectedAssignees.filter((a) => a.id !== colleague.id));
    } else {
      setSelectedAssignees([...selectedAssignees, colleague]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Please enter a task title", "error");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      due_date: dueDate || undefined,
      created_at: new Date().toISOString(),
      owner_name: authorName,
      assignees: selectedAssignees,
      tags: tags.length > 0 ? tags : ["Deliverable"],
      project_name: projectName.trim() || undefined,
      updates: [
        {
          id: `upd-${Date.now()}`,
          author: authorName,
          avatar: authorName.slice(0, 2).toUpperCase(),
          text: `Task created and assigned to ${
            selectedAssignees.length > 0
              ? selectedAssignees.map((a) => a.name).join(", ")
              : "backlog"
          }.`,
          created_at: "Just now",
        },
      ],
    };

    onCreateTask(newTask);
    showToast("New task created successfully", "success");
    // Reset fields
    setTitle("");
    setDescription("");
    setDueDate("");
    setTagsInput("");
    setSelectedAssignees([]);
    onClose();
  };

  return (
    <SlideOver open={isOpen} onClose={onClose} size="xl">
      <SlideOverHeader title="Create New Work Item & Deliverable" onClose={onClose} />

      <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
        <SlideOverContent>
          <div className="space-y-5">
            {/* 1. Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Implement Fastify authentication token rotation..."
                className="w-full text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
              />
            </div>

            {/* 2. Grid for Status, Priority, Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Initial Column / Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 outline-none focus:border-[#ff6900]"
                >
                  <option value="planned">● Planned / Backlog</option>
                  <option value="in_progress">● In Progress</option>
                  <option value="blocked">● Under Review / Blocked</option>
                  <option value="completed">✓ Completed</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 outline-none focus:border-[#ff6900]"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 outline-none focus:border-[#ff6900]"
                />
              </div>
            </div>

            {/* 3. Deliverables Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Deliverables &amp; Details
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Outline specific tasks, deliverables, and acceptance criteria..."
                className="w-full text-xs text-slate-700 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
              />
            </div>

            {/* 4. Tagging People & Assignees */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#ff6900]" />
                  <span>Tag Colleagues &amp; Assignees ({selectedAssignees.length})</span>
                </label>
                <span className="text-[10px] text-slate-400">Click to select teammates</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                {SAMPLE_TEAM_MEMBERS.map((member) => {
                  const isSelected = selectedAssignees.some((a) => a.id === member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleToggleAssignee(member)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl text-left border transition ${
                        isSelected
                          ? "bg-orange-50 border-[#ff6900] text-slate-900 shadow-xs"
                          : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-[#ff6900]" : "bg-slate-800"
                      }`}>
                        {member.avatar || member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{member.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{member.role}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Project & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Linked Project
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Portal Modernization"
                  className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#ff6900]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Backend, Security, Sprint 44"
                  className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#ff6900]"
                />
              </div>
            </div>
          </div>
        </SlideOverContent>

        <SlideOverFooter>
          <div className="w-full flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold transition shadow-sm"
            >
              Create Task
            </button>
          </div>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}
