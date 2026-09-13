import type { HttpRequest } from "../auth/http-client";

export type WorkItemType = "weekly_task" | "project_activity" | "recurring_responsibility";
export type WorkItemPriority = "low" | "medium" | "high" | "critical";
export type WorkItemStatus = "planned" | "in_progress" | "completed" | "blocked" | "carried_over" | "cancelled";

export type WorkItem = {
  id: string;
  title: string;
  description?: string | null;
  item_type: WorkItemType;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  assigned_to_id?: string | null;
  assigned_to?: { id: string; full_name?: string } | null;
  due_date?: string | null;
  week_start_date?: string | null;
  expected_hours?: number | null;
  organization_id?: string | null;
  owner_team_id?: string | null;
  project_id?: string | null;
  sprint_id?: string | null;
  parent_id?: string | null;
  estimate_points?: number | null;
  sort_order?: number | null;
  goal_id?: string | null;
  objective_id?: string | null;
  kpi_id?: string | null;
  requires_manager_ack?: boolean;
  is_staff_added?: boolean;
  project?: { id: string; name: string } | null;
  goal?: { id: string; title: string } | null;
  objective?: { id: string; title: string } | null;
  owner_team?: { id: string; name: string } | null;
  parent?: { id: string; title: string; status?: WorkItemStatus } | null;
  subtasks?: { id: string; title: string; status?: WorkItemStatus }[];
  sprint?: { id: string; name: string; status?: string } | null;
};

export type WorkLog = {
  id: string;
  status: string;
  approval_status: string;
  log_date: string;
  hours_spent: number;
  note?: string | null;
  notes?: string | null;
  blocker_note?: string | null;
  rejection_note?: string | null;
  staff?: { id: string; full_name?: string } | null;
  work_item?: { id: string; title: string } | null;
};

export type WorkGoal = {
  id: string;
  title: string;
  description?: string | null;
  period_year: number;
  period_type?: string | null;
  period_label?: string | null;
  team_id?: string | null;
  organization_id?: string | null;
};

export type WorkObjective = {
  id: string;
  title: string;
  description?: string | null;
  goal_id?: string | null;
  team_id?: string | null;
  organization_id?: string | null;
  due_date?: string | null;
};

export type WorkKpi = {
  id: string;
  title: string;
  description?: string | null;
  goal_id?: string | null;
  objective_id?: string | null;
  team_id?: string | null;
  organization_id?: string | null;
  target_type: "count" | "percentage" | "currency" | "milestone";
  target_value?: number | null;
  unit_label?: string | null;
  period_year?: number | null;
  quarter?: number | null;
};

export type CreateWorkItemDto = {
  title: string;
  description?: string;
  item_type: WorkItemType;
  status?: WorkItemStatus;
  priority: WorkItemPriority;
  assigned_to_id?: string;
  due_date?: string;
  week_start_date?: string;
  expected_hours?: number;
  organization_id?: string;
  owner_team_id?: string;
  project_id?: string;
  sprint_id?: string;
  parent_id?: string;
  estimate_points?: number;
  sort_order?: number;
  goal_id?: string;
  objective_id?: string;
  kpi_id?: string;
  requires_manager_ack?: boolean;
  is_staff_added?: boolean;
};

export type CreateWorkLogDto = {
  work_item_id: string;
  log_date: string;
  note: string;
  hours_spent?: number;
};

export type CreateWorkGoalDto = {
  title: string;
  description?: string;
  period_year: number;
  period_type?: string;
  period_label?: string;
  team_id?: string;
  organization_id?: string;
};

export type CreateWorkObjectiveDto = {
  title: string;
  description?: string;
  goal_id?: string;
  team_id?: string;
  organization_id?: string;
  due_date?: string;
};

export type CreateWorkKpiDto = {
  title: string;
  description?: string;
  goal_id?: string;
  objective_id?: string;
  team_id?: string;
  organization_id?: string;
  target_type: "count" | "percentage" | "currency" | "milestone";
  target_value?: number;
  unit_label?: string;
  period_year?: number;
  quarter?: number;
};

export type Sprint = {
  id: string;
  name: string;
  goal?: string | null;
  project_id?: string | null;
  project?: { id: string; name: string } | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  is_active?: boolean;
  total_items?: number;
  completed_items?: number;
  items?: WorkItem[];
  created_at?: string;
};

export type CreateSprintDto = {
  name: string;
  goal?: string;
  project_id: string;
  start_date?: string;
  end_date?: string;
  status?: "planned" | "active" | "completed";
  is_active?: boolean;
};

export type BoardColumn = {
  status: WorkItemStatus;
  total: number;
  items: WorkItem[];
};

export function createWorkApi(httpRequest: HttpRequest) {
  function toQuery(params?: Record<string, unknown>) {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") q.set(k, String(v)); });
    return q.toString() ? `?${q.toString()}` : "";
  }

  return {
    async listTeamGoals(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/tasks/goals${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as WorkGoal[];
    },

    async createTeamGoal(dto: CreateWorkGoalDto) {
      const res = await httpRequest<any>("/tasks/goals", { method: "POST", body: dto });
      return (res?.data ?? res) as WorkGoal;
    },

    async listTeamObjectives(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/tasks/objectives${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as WorkObjective[];
    },

    async createTeamObjective(dto: CreateWorkObjectiveDto) {
      const res = await httpRequest<any>("/tasks/objectives", { method: "POST", body: dto });
      return (res?.data ?? res) as WorkObjective;
    },

    async listTeamKpis(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/tasks/kpis${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as WorkKpi[];
    },

    async createTeamKpi(dto: CreateWorkKpiDto) {
      const res = await httpRequest<any>("/tasks/kpis", { method: "POST", body: dto });
      return (res?.data ?? res) as WorkKpi;
    },

    async listTeamWorkItems(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/tasks/team/items${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as WorkItem[];
    },

    async createWorkItem(dto: CreateWorkItemDto) {
      const res = await httpRequest<any>("/tasks/items", { method: "POST", body: dto });
      return (res?.data ?? res) as WorkItem;
    },

    async updateWorkItem(id: string, dto: Partial<CreateWorkItemDto>) {
      const res = await httpRequest<any>(`/tasks/items/${id}`, { method: "POST", body: dto });
      return (res?.data ?? res) as WorkItem;
    },

    async listTeamWorkLogs(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/tasks/team/logs${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as WorkLog[];
    },

    async approveWorkLog(id: string) {
      return httpRequest<void>(`/tasks/logs/${id}/approve`, { method: "POST" });
    },

    async rejectWorkLog(id: string) {
      return httpRequest<void>(`/tasks/logs/${id}/reject`, { method: "POST" });
    },

    async listMyWorkItems(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/tasks/my/items${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as WorkItem[];
    },

    async listMyWorkLogs(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/tasks/my/logs${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as WorkLog[];
    },

    async createWorkLog(dto: CreateWorkLogDto) {
      const res = await httpRequest<any>("/tasks/logs", { method: "POST", body: dto });
      return (res?.data ?? res) as WorkLog;
    },

    async updateWorkLog(id: string, dto: Partial<CreateWorkLogDto>) {
      const res = await httpRequest<any>(`/tasks/logs/${id}`, { method: "POST", body: dto });
      return (res?.data ?? res) as WorkLog;
    },

    async submitWorkLog(id: string) {
      const res = await httpRequest<any>(`/tasks/logs/${id}/submit`, { method: "POST" });
      return (res?.data ?? res) as WorkLog;
    },

    async board(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/tasks/board${toQuery(params)}`);
      return ((res as any)?.data ?? res) as BoardColumn[];
    },

    async listSprints(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/tasks/sprints${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as Sprint[];
    },

    async getSprint(id: string) {
      const res = await httpRequest<any>(`/tasks/sprints/${id}`);
      return (res?.data ?? res) as Sprint;
    },

    async createSprint(dto: CreateSprintDto) {
      const res = await httpRequest<any>("/tasks/sprints", { method: "POST", body: dto });
      return (res?.data ?? res) as Sprint;
    },

    async updateSprint(id: string, dto: Partial<CreateSprintDto>) {
      const res = await httpRequest<any>(`/tasks/sprints/${id}`, { method: "POST", body: dto });
      return (res?.data ?? res) as Sprint;
    },

    async startSprint(id: string) {
      const res = await httpRequest<any>(`/tasks/sprints/${id}/start`, { method: "POST" });
      return (res?.data ?? res) as Sprint;
    },

    async completeSprint(id: string) {
      const res = await httpRequest<any>(`/tasks/sprints/${id}/complete`, { method: "POST" });
      return (res?.data ?? res) as Sprint;
    },
  };
}
