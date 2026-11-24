import { DateInput } from "@/components/ui/date-picker";
import { SelectBox } from "@/components/ui/select";
import React, { useState } from "react";
import {
  Users,
  AlertCircle,
} from "lucide-react";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { useAuth } from "@/shared/context/AuthProvider";
import { useToast } from "@/shared";
import type { TaskItem, TaskStatus, TaskPriority, TaskAssignee } from "./types";
import { useColleagues } from "@/shared/hooks/useColleagues";

interface NewTaskSlideOverProps {
  isOpen: boolean;
  defaultStatus?: TaskStatus;
  isAdmin?: boolean;
  projects?: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreateTask: (newTask: TaskItem) => void;
}

export function NewTaskSlideOver({
  isOpen,
  defaultStatus = "planned",
  isAdmin = false,
  projects = [],
  onClose,
  onCreateTask,
}: NewTaskSlideOverProps) {
  const { user } = useAuth();
  const { colleagues } = useColleagues();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<TaskAssignee[]>([]);

  // Update defaultStatus if prop changes
  React.useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus]);

  const authorName = user?.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user?.username || "Colleague";

  const selfAssignee: TaskAssignee = {
    id: user?.id || "usr-self",
    name: authorName,
    avatar: authorName.slice(0, 2).toUpperCase(),
    role: "Staff Member",
  };

  // If normal staff, assign to self automatically
  React.useEffect(() => {
    if (!isAdmin) {
      setSelectedAssignees([selfAssignee]);
    }
  }, [isAdmin, user]);

  const handleToggleAssignee = (colleague: TaskAssignee) => {
    if (!isAdmin) return; // Prevent normal staff from assigning to others
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

    const assignees = !isAdmin ? [selfAssignee] : selectedAssignees;

    const selectedProject = projects.find((p) => p.id === selectedProjectId);

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      due_date: dueDate || undefined,
      created_at: new Date().toISOString(),
      owner_id: user?.id ? String(user.id) : undefined,
      owner_name: authorName,
      is_personal: !isAdmin,
      assignees,
      tags: tags.length > 0 ? tags : ["Deliverable"],
      project_id: selectedProject && !selectedProject.id.startsWith("name:") ? selectedProject.id : undefined,
      project_name: selectedProject?.name || undefined,
      updates: [
        {
          id: `upd-${Date.now()}`,
          author: authorName,
          avatar: authorName.slice(0, 2).toUpperCase(),
          text: !isAdmin
            ? "Personal task created and added to your schedule."
            : `Task created and assigned to ${assignees.length > 0
              ? assignees.map((a) => a.name).join(", ")
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
    setSelectedProjectId("");
    setTagsInput("");
    setSelectedAssignees([]);
    onClose();
  };

  return (
    <SlideOver open={isOpen} onClose={onClose} size="xl">
      <SlideOverHeader
        title={isAdmin ? "Create New Work Item & Deliverable" : "Create New Personal Task"}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
        <SlideOverContent>
          <div className="space-y-5">
            {/* Staff info banner */}
            {!isAdmin && (
              <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-blue-900 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-neutral-700 shrink-0" />
                <span>
                  This task will be saved as your <strong>Personal Task</strong> to organize your daily deliverables and standup logs.
                </span>
              </div>
            )}

            {/* 1. Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 block">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isAdmin ? "e.g., Implement Fastify authentication token rotation..." : "e.g., Review project documentation, test staging build..."}
                className="w-full text-xs font-medium text-neutral-900 border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
              />
            </div>

            {/* 2. Grid for Status, Priority, Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">
                  Initial Column / Status
                </label>
                <SelectBox
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800 outline-none focus:border-[#ff6900]"
                >
                  <option value="planned">● Planned / Backlog</option>
                  <option value="in_progress">● In Progress</option>
                  <option value="blocked">● Under Review / Blocked</option>
                  <option value="completed">✓ Completed</option>
                </SelectBox>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">
                  Priority
                </label>
                <SelectBox
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800 outline-none focus:border-[#ff6900]"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </SelectBox>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">
                  Due Date
                </label>
                <DateInput

                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800 outline-none focus:border-[#ff6900]"
                />
              </div>
            </div>

            {/* 3. Deliverables Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 block">
                Deliverables &amp; Details
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Outline specific tasks, deliverables, and acceptance criteria..."
                className="w-full text-xs text-neutral-700 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-[#ff6900] focus:ring-1 focus:ring-[#ff6900]"
              />
            </div>

            {/* 4. Tagging People & Assignees */}
            {isAdmin ? (
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-700 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-[#ff6900]" />
                    <span>Tag Colleagues &amp; Assignees ({selectedAssignees.length})</span>
                  </label>
                  <span className="text-xs text-neutral-400">Click to select teammates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 border border-neutral-200 rounded-xl bg-neutral-50/50">
                  {colleagues.map((member) => {
                    const isSelected = selectedAssignees.some((a) => a.id === member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleToggleAssignee(member)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-left border transition ${isSelected
                            ? "bg-orange-50 border-[#ff6900] text-neutral-900 shadow-xs"
                            : "bg-white border-neutral-200/80 text-neutral-700 hover:bg-neutral-100"
                          }`}
                      >
                        <div className={`w-7 h-7 rounded-full text-white text-xs font-semibold flex items-center justify-center shrink-0 ${isSelected ? "bg-[#ff6900]" : "bg-neutral-800"
                          }`}>
                          {member.avatar || member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{member.name}</div>
                          <div className="text-xs text-neutral-400 truncate">{member.role}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                <label className="text-xs font-medium text-neutral-700 block">
                  Assignee
                </label>
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#0a1128] text-white text-xs font-medium flex items-center justify-center">
                      {authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-neutral-900">{authorName} (You)</div>
                      <div className="text-xs text-neutral-400">Assigned to self</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-50 text-[#ff6900] border border-orange-200">
                    Personal Task
                  </span>
                </div>
              </div>
            )}

            {/* 5. Project & Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">
                  Project <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <SelectBox
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full text-xs font-medium bg-white border border-neutral-200 rounded-xl px-2.5 py-2 text-neutral-800 outline-none focus:border-[#ff6900]"
                >
                  <option value="">No project</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </SelectBox>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 block mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Backend, Security, Sprint 44"
                  className="w-full text-xs font-semibold text-neutral-800 border border-neutral-200 rounded-xl px-3 py-2 outline-none focus:border-[#ff6900]"
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
              className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-medium transition shadow-sm"
            >
              Create Task
            </button>
          </div>
        </SlideOverFooter>
      </form>
    </SlideOver>
  );
}

