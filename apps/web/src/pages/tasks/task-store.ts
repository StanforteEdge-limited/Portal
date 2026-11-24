import type { TaskItem, TaskStatus } from "./types";

export const TASKS_STORAGE_KEY = "portal_tasks_data";
export const TASKS_UPDATED_EVENT = "portal:tasks-updated";

export function loadStoredTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore storage parse errors
  }
  return [];
}

export function saveStoredTasks(tasks: TaskItem[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT));
  } catch {
    // ignore storage write errors
  }
}

export function upsertStoredTask(task: TaskItem): TaskItem[] {
  const existing = loadStoredTasks();
  const idx = existing.findIndex((t) => t.id === task.id);
  const next = idx >= 0 ? existing.map((t) => (t.id === task.id ? task : t)) : [task, ...existing];
  saveStoredTasks(next);
  return next;
}

export function updateStoredTaskStatus(taskId: string, status: TaskStatus): TaskItem[] {
  const existing = loadStoredTasks();
  const next = existing.map((t) => (t.id === taskId ? { ...t, status } : t));
  saveStoredTasks(next);
  return next;
}

/**
 * Strict task visibility check: a non-admin user may only see a task if they
 * are explicitly assigned to it or created/own it.
 */
export function isUserPartOfTask(
  task: TaskItem,
  user: { id?: string; email?: string; first_name?: string | null; last_name?: string | null; username?: string } | null | undefined,
): boolean {
  if (!user) return false;
  const userId = user.id ? String(user.id) : "";
  const userEmail = (user.email || "").trim().toLowerCase();
  const fullName = (
    user.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : user.username || ""
  ).toLowerCase();

  const isOwner =
    (Boolean(userId) && Boolean(task.owner_id) && String(task.owner_id) === userId) ||
    (Boolean(fullName) && Boolean(task.owner_name) && task.owner_name!.trim().toLowerCase() === fullName);

  const isAssigned = (task.assignees ?? []).some((a) => {
    if (userId && a.id && String(a.id) === userId) return true;
    if (userEmail && a.email && a.email.trim().toLowerCase() === userEmail) return true;
    if (fullName && a.name && a.name.trim().toLowerCase() === fullName) return true;
    return false;
  });

  return isOwner || isAssigned;
}
