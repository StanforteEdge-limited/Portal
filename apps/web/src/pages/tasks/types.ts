export type TaskStatus = "planned" | "in_progress" | "blocked" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskAssignee {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role?: string;
}

export interface TaskUpdate {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  created_at: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  created_at?: string;
  owner_id?: string;
  owner_name?: string;
  assignees: TaskAssignee[];
  tags: string[];
  project_id?: string;
  project_name?: string;
  is_personal?: boolean;
  updates: TaskUpdate[];
}
