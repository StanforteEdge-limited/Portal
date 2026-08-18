// apps/pwa/src/modules/hr/leave/hr-leave-api.ts
import { httpRequest } from "@/shared/lib/core";
import {
  listRequests,
  listApprovals,
  approveRequest,
  rejectRequest,
  type RequestRecord,
} from "@/pages/requests/requests-api";
import { requestCategoryFromRecord } from "@/pages/requests/request-helpers";

export type { RequestRecord };

export type HrLeaveBalanceItem = {
  user_id: string;
  leave_type_key: string;
  entitled: number;
  used: number;
  adjustments: number;
  available: number;
};

export type HrLeaveBalancesResponse = {
  year: number;
  data: HrLeaveBalanceItem[];
};

// All staff leave requests (admin view — no only_mine filter)
export async function listHrLeaveRequests(params?: {
  status?: string;
  user_id?: string;
  from?: string;
  to?: string;
}): Promise<RequestRecord[]> {
  const query: Record<string, unknown> = { family: "leave" };
  if (params?.status) query.status = params.status;
  if (params?.user_id) query.user_id = params.user_id;
  if (params?.from) query.from = params.from;
  if (params?.to) query.to = params.to;
  const requests = await listRequests(query);
  return requests;
}

export async function listHrLeaveRequestsPaged(params?: {
  status?: string;
  user_id?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}) {
  const query: Record<string, unknown> = { family: "leave" };
  if (params?.status) query.status = params.status;
  if (params?.user_id) query.user_id = params.user_id;
  if (params?.from) query.from = params.from;
  if (params?.to) query.to = params.to;
  if (params?.page) query.page = params.page;
  if (params?.per_page) query.per_page = params.per_page;
  
  const { listRequestsPaged } = await import("@/pages/requests/requests-api");
  const data = await listRequestsPaged(query);
  return data;
}

// Leave requests pending HR approval
export async function listHrLeaveApprovals(): Promise<RequestRecord[]> {
  const approvals = await listApprovals({ family: "leave" });
  return approvals.filter((record) => requestCategoryFromRecord(record) === "leave");
}

// Per-staff leave balances — HR-specific endpoint
export async function getHrLeaveBalances(params?: {
  year?: number;
  user_id?: string;
}): Promise<HrLeaveBalancesResponse> {
  const query = new URLSearchParams();
  if (params?.year) query.set("year", String(params.year));
  if (params?.user_id) query.set("user_id", String(params.user_id));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return httpRequest<HrLeaveBalancesResponse>(`/hr/leave/balance${suffix}`);
}

// Re-export for use in the page without additional imports
export { approveRequest, rejectRequest };
