// apps/shared/src/api/timesheet-api.ts
import type { HttpRequest } from "../auth/http-client";

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export type TimesheetEntry = {
  id: string;
  worker_id: string;
  worker?: { id: string; full_name: string; worker_type?: string | null; email?: string | null } | null;
  component_id?: string | null;
  organization_id?: string | null;
  team_id?: string | null;
  project_id?: string;
  fund_id?: string;
  grant_id?: string;
  work_date: string;
  hours: number;
  description?: string;
  status: TimesheetStatus;
  project?: { name: string };
  fund?: { name: string };
  grant?: { name: string };
  synced_run?: { id: string; name: string; year: number; month: number; status: string } | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

/** Payloads accepted by the upsert routes. `worker_id` is set server-side. */
export type UpsertTimesheetEntryPayload = {
  worker_id?: string;
  component_id?: string;
  organization_id?: string;
  team_id?: string;
  project_id?: string;
  fund_id?: string;
  grant_id?: string;
  work_date: string;
  hours: number;
  description?: string;
  status?: TimesheetStatus;
};

export type TimesheetListParams = {
  page?: number;
  per_page?: number;
  status?: TimesheetStatus;
  project_id?: string;
  from?: string;
  to?: string;
};

/** One line of the self-service rollup, grouped across work-log dimensions. */
export type TimesheetSummaryRow = {
  organization_id: string;
  organization_name: string;
  team_id: string;
  team_name: string;
  project_id: string;
  project_name: string;
  fund_id: string;
  fund_name: string;
  grant_id: string;
  grant_name: string;
  hours: number;
  entries: number;
};

/** Serves `/v1/timesheets`, which owns timesheet entries and their approval queue. */
export function createTimesheetApi(httpRequest: HttpRequest) {
  const toQuery = (params?: TimesheetListParams) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    });
    const encoded = query.toString();
    return encoded ? `?${encoded}` : "";
  };

  return {
    async listMyEntries(params?: TimesheetListParams): Promise<TimesheetEntry[]> {
      const res = await httpRequest<any>(`/timesheets/my/entries${toQuery(params)}`);
      return (res as any)?.data?.items ?? [];
    },

    /**
     * The server returns a bare array, which `httpRequest` unwraps — so this
     * resolves to the rows directly, unlike the paginated `list*` calls.
     */
    async mySummary(params?: { from?: string; to?: string }): Promise<TimesheetSummaryRow[]> {
      const res = await httpRequest<any>(`/timesheets/my/summary${toQuery(params)}`);
      return Array.isArray(res) ? res : [];
    },

    async createMyEntry(payload: UpsertTimesheetEntryPayload) {
      return httpRequest<any>("/timesheets/my/entries", { method: "POST", body: payload });
    },

    async updateMyEntry(id: string, payload: UpsertTimesheetEntryPayload) {
      return httpRequest<any>(`/timesheets/my/entries/${id}`, { method: "POST", body: payload });
    },

    async submitMyEntry(id: string) {
      return httpRequest<any>(`/timesheets/my/entries/${id}/submit`, { method: "POST" });
    },

    async listEntries(params?: TimesheetListParams): Promise<TimesheetEntry[]> {
      const res = await httpRequest<any>(`/timesheets/entries${toQuery(params)}`);
      return (res as any)?.data?.items ?? [];
    },

    async createEntry(payload: UpsertTimesheetEntryPayload) {
      return httpRequest<any>("/timesheets/entries", { method: "POST", body: payload });
    },

    async updateEntry(id: string, payload: UpsertTimesheetEntryPayload) {
      return httpRequest<any>(`/timesheets/entries/${id}`, { method: "POST", body: payload });
    },

    async submitEntry(id: string) {
      return httpRequest<any>(`/timesheets/entries/${id}/submit`, { method: "POST" });
    },

    async approveEntry(id: string) {
      return httpRequest<any>(`/timesheets/entries/${id}/approve`, { method: "POST" });
    },

    async rejectEntry(id: string) {
      return httpRequest<any>(`/timesheets/entries/${id}/reject`, { method: "POST" });
    },
  };
}
