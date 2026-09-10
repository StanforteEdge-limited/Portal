import { financeApi, httpRequest } from "@/shared/lib/core";

export type RequestRecord = {
  id: string;
  status: string;
  request_type_id?: string;
  group_id?: string;
  organization_id?: string | null;
  workflow_instance_id?: string | null;
  created_by?: string;
  team_id?: string | null;
  request_number?: string;
  voucher_number?: string | null;
  request_total_amount?: number | null;
  total_amount?: number | null;
  currency?: string | null;
  created_at?: string;
  updated_at?: string;
  data?: Record<string, unknown> | null;
  request_type?: {
    id: string;
    name: string;
    code_prefix?: string | null;
    category_code?: string | null;
    taxonomy_keys?: string[] | null;
    workflow_type?: string | null;
    handler_role_label?: string | null;
    form_schema?: Record<string, unknown> | null;
    approval_flow_json?: Record<string, unknown> | null;
    category_key?: string | null;
  } | null;
  group?: {
    id: string;
    name?: string | null;
    code?: string | null;
  } | null;
  team_name?: string | null;
  creator?: {
    id: string;
    email?: string;
    username?: string;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  team?: {
    id: string;
    name: string;
  } | null;
  items?: Array<{
    id: string;
    description?: string;
    amount?: number;
    quantity?: number;
    notes?: string | null;
    file_id?: string | null;
    bank_name?: string | null;
    account_number?: string | null;
    account_name?: string | null;
    files?: Array<{
      id: string;
      file_name: string;
      mime_type?: string | null;
      public_url?: string | null;
    }>;
  }>;
  approvals?: {
    done: Array<{ action: string; step: string; performed_by_name: string | null; performed_by_email: string | null; comment: string | null; at: string }>;
    pending: Array<{ step: string; approver_type: string; approver_id: string | null }>;
    required_steps?: Array<any>;
  };
};

export type RequestTypeOption = {
  id: string;
  name: string;
  description?: string | null;
  codePrefix?: string | null;
  code_prefix?: string | null;
  categoryId?: string | null;
  category_id?: string | null;
  taxonomyKeys?: string[] | null;
  taxonomy_keys?: string[] | null;
  workflow_type?: string | null;
  handler_role_label?: string | null;
  formSchema?: Record<string, unknown> | null;
  form_schema?: Record<string, unknown> | null;
  approvalFlowJson?: Record<string, unknown> | null;
  approval_flow_json?: Record<string, unknown> | null;
  groupId?: string | null;
  group_id?: string | null;
  categoryKey?: string | null;
  category_key?: string | null;
  category_code?: string | null;
};

export type RequestGroupOption = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
};

export type RequestCategoryOption = {
  id: string;
  groupId: string;
  groupName?: string;
  name: string;
  code: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export type RequestItemInput = {
  description: string;
  amount: number;
  quantity?: number;
  notes?: string;
  file_id?: string;
  file_ids?: string[];
  vendor_id?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
};

export type ProjectOption = {
  id: string;
  name: string;
};

export type TeamOption = {
  id: string;
  name: string;
  members?: Array<{
    userId: string;
    user: {
      id: string;
      email: string;
      username: string;
      firstName?: string | null;
      lastName?: string | null;
    };
  }>;
};

export type ApprovedBudgetLineOption = {
  budget_id: string;
  budget_name: string;
  budget_revision_id: string;
  budget_line_id: string;
  line_label: string;
  chart_account_id?: string | null;
  total_amount: number;
  scope_type: string;
  organization_id?: string | null;
  team_id?: string | null;
  project_id?: string | null;
};

export type RequestItemRecord = {
  id: string;
  request_id: string;
  description: string;
  amount: number;
  quantity: number;
  notes?: string;
  vendor_id?: string;
  file_id?: string;
  file_ids?: string[];
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  created_at: string;
  updated_at: string;
  files?: Array<{ id: string; file_name: string; file_url: string }>;
};

export type MyOrganization = {
  is_primary: boolean;
  organization: {
    id: string;
    name: string;
    code: string;
  };
};

export type LeaveBalanceSummary = {
  leave_type_key: string;
  entitled_days: number;
  ledger_delta_days: number;
  available_days: number;
};

export async function listRequests(params?: Record<string, unknown>) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      query.set(key, String(value));
    });
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/requests${suffix}`);
  return ((res as any)?.data?.items ?? []) as RequestRecord[];
}

export async function listRequestsPaged(params?: Record<string, unknown>) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      query.set(key, String(value));
    });
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/requests${suffix}`);
  return (res as any)?.data as {
    items: RequestRecord[];
    meta: { page: number; per_page: number; total: number; total_pages?: number };
  };
}

export async function listApprovals(params?: Record<string, unknown>) {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      query.set(key, String(value));
    });
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/requests/approvals${suffix}`);
  return ((res as any)?.data?.items ?? []) as RequestRecord[];
}

export async function listRequestTypes() {
  const res = await httpRequest<any>("/requests/types");
  return (res as any)?.data?.items ?? [];
}

export async function listRequestGroups(): Promise<RequestGroupOption[]> {
  const res = await httpRequest<any>("/requests/groups");
  return (res as any)?.data?.items ?? [];
}

export async function listCategories(groupId?: string): Promise<RequestCategoryOption[]> {
  const suffix = groupId ? `?group_id=${groupId}` : "";
  const res = await httpRequest<any>(`/requests/categories${suffix}`);
  const items: any[] = (res as any)?.data?.items ?? [];
  return items.map((item: any) => ({
    id: String(item.id),
    groupId: String(item.groupId),
    groupName: item.group?.name ?? undefined,
    name: String(item.name),
    code: String(item.code),
    description: item.description ?? null,
    sortOrder: item.sortOrder ?? 0,
    isActive: item.isActive ?? true,
  }));
}

export async function createCategory(payload: {
  group_id: string;
  name: string;
  code: string;
  description?: string;
}) {
  const res = await httpRequest<any>("/requests/categories", {
    method: "POST",
    body: payload,
  });
  return res;
}

export async function updateCategory(
  id: string,
  payload: {
    name?: string;
    code?: string;
    description?: string;
    is_active?: boolean;
  },
) {
  const res = await httpRequest<any>(`/requests/categories/${id}`, {
    method: "PATCH",
    body: payload,
  });
  return res;
}

export async function deleteCategory(id: string) {
  return httpRequest<{ success: boolean }>(`/requests/categories/${id}`, {
    method: "DELETE",
  });
}

export async function getRequest(id: string) {
  return httpRequest<RequestRecord>(`/requests/${id}`);
}

export async function getRequestActions(id: string) {
  const res = await httpRequest<any>(`/requests/${id}/actions`);
  return Array.isArray(res) ? res : (res as any)?.data?.items ?? [];
}

export async function createRequest(payload: {
  request_type_id: string;
  team_id?: string;
  organization_id?: string;
  currency?: string;
  total_amount?: number;
  data?: Record<string, unknown>;
  items: RequestItemInput[];
}) {
  const res = await httpRequest<any>("/requests", {
    method: "POST",
    body: payload,
  });
  return res as RequestRecord;
}

export async function updateRequest(
  id: string,
  payload: {
    team_id?: string;
    organization_id?: string;
    currency?: string;
    total_amount?: number;
    data?: Record<string, unknown>;
    items?: RequestItemInput[];
  }
) {
  const res = await httpRequest<any>(`/requests/${id}`, {
    method: "POST",
    body: payload,
  });
  return res as RequestRecord;
}

export async function listApprovedBudgetLines(params?: Record<string, unknown>) {
  const res = await financeApi.listApprovedBudgetLines(params);
  return res as ApprovedBudgetLineOption[];
}

export async function submitRequest(id: string, comment?: string) {
  return httpRequest<RequestRecord>(`/requests/${id}/submit`, {
    method: "POST",
    body: { comment: comment || undefined },
  });
}

export async function deleteRequest(id: string) {
  return httpRequest<{ success: boolean }>(`/requests/${id}`, {
    method: "DELETE",
  });
}

export async function approveRequest(id: string, comment?: string) {
  return httpRequest<RequestRecord>(`/requests/${id}/approve`, {
    method: "POST",
    body: { action: "approve", comment: comment || undefined },
  });
}

export async function rejectRequest(id: string, comment?: string) {
  return httpRequest<RequestRecord>(`/requests/${id}/reject`, {
    method: "POST",
    body: { action: "reject", comment: comment || undefined },
  });
}

export async function returnRequest(id: string, comment?: string) {
  return httpRequest<RequestRecord>(`/requests/${id}/return`, {
    method: "POST",
    body: { action: "return", comment: comment || undefined },
  });
}

export async function confirmRequest(id: string) {
  return httpRequest<RequestRecord>(`/requests/${id}/confirm`, {
    method: "POST",
  });
}

export type ThreadEntry = {
  type: "submission" | "approval" | "rejection" | "return" | "clearance";
  actor_name: string;
  actor_email: string | null;
  role_label: string;
  comment: string | null;
  at: string;
  attachments?: Array<{ id: string; name: string }>;
};

export async function getRequestThread(id: string): Promise<ThreadEntry[]> {
  const res = await httpRequest<any>(`/requests/${id}/thread`);
  return (Array.isArray(res) ? res : (res as any)?.data ?? []) as ThreadEntry[];
}

export async function completeRequest(id: string) {
  return httpRequest<RequestRecord>(`/requests/${id}/complete`, {
    method: "POST",
  });
}

export const confirmRequestDisbursement = confirmRequest;

export type RequestDownloadAction =
  | "request_pdf"
  | "pv_pdf"
  | "request_with_attachments"
  | "pv_with_attachments"
  | "full_package"
  | "full_document"
  | "certificate_of_honor_pdf";

export type DownloadedRequestFile = {
  file_name: string;
  mime_type: string;
  content_base64: string;
  generated_at?: string;
  request_id?: string;
  voucher_no?: string;
  voucher_number?: string;
  total_amount?: number;
};

export async function downloadRequestArtifact(
  id: string,
  payload: {
    action: RequestDownloadAction;
    voucher_id?: string;
    delivery?: "download" | "email";
    email_to?: string;
    // Certificate of Honor fields
    staff_name?: string;
    request_label?: string;
    voucher_number?: string;
    amount_label?: string;
    declaration?: string;
    reason?: string;
    issued_at?: string;
    signature_file_id?: string;
  },
) {
  return httpRequest<DownloadedRequestFile>(`/requests/${id}/download`, {
    method: "POST",
    body: {
      action: payload.action,
      voucher_id: payload.voucher_id || undefined,
      delivery: payload.delivery || undefined,
      email_to: payload.email_to || undefined,
      staff_name: payload.staff_name || undefined,
      request_label: payload.request_label || undefined,
      voucher_number: payload.voucher_number || undefined,
      amount_label: payload.amount_label || undefined,
      declaration: payload.declaration || undefined,
      reason: payload.reason || undefined,
      issued_at: payload.issued_at || undefined,
      signature_file_id: payload.signature_file_id || undefined,
    },
  });
}

export async function retireRequest(
  id: string,
  payload?: {
    notes?: string;
    voucher_id?: string;
    retired_amount?: number;
    retirement_file_ids?: string[];
    breakdown?: Record<string, unknown>;
  }
) {
  return httpRequest<RequestRecord>(`/requests/${id}/retire`, {
    method: "POST",
    body: {
      notes: payload?.notes || undefined,
      voucher_id: payload?.voucher_id || undefined,
      retired_amount: payload?.retired_amount ?? undefined,
      retirement_file_ids: payload?.retirement_file_ids?.length ? payload.retirement_file_ids : undefined,
      breakdown: payload?.breakdown || undefined,
    },
  });
}

type DisburseResult = {
  id: string;
  status: string;
  voucher?: { id: string };
};

export async function disburseRequest(
  id: string,
  payload?: {
    note?: string;
    amount?: number;
    method?: string;
    transaction_ref?: string;
    evidence_file_id?: string;
    evidence_file_ids?: string[];
    paid_from_account_id?: string;
    disbursed_at?: string;
    contact_id?: string;
  },
  options?: {
    traceId?: string;
  }
) {
  return httpRequest<DisburseResult>(`/finance/requests/${id}/disburse`, {
    method: "POST",
    body: payload ?? {},
    headers: options?.traceId ? { "x-trace-id": options.traceId } : undefined,
  });
}

export async function listProjects() {
  const res = await httpRequest<any>("/projects?active_only=true");
  return (res as any)?.data?.items ?? [];
}

export async function listMyOrganizations() {
  const res = await httpRequest<any>("/organizations/my");
  return (res as any)?.data?.items ?? [];
}

export async function listGroups(params?: { active_only?: boolean; organization_id?: string }) {
  const query = new URLSearchParams();
  query.set("active_only", params?.active_only === false ? "false" : "true");
  if (params?.organization_id) query.set("organization_id", params.organization_id);
  const res = await httpRequest<any>(`/groups?${query.toString()}`);
  return (res as any)?.data?.items ?? [];
}

export async function listGroupsForUser(params?: { organization_id?: string }) {
  const query = new URLSearchParams();
  if (params?.organization_id) query.set("organization_id", params.organization_id);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/groups/for-user${suffix}`);
  return (res as any) ?? [];
}

export async function getMyLeaveBalance(params?: { year?: number; leave_type_key?: string }) {
  const query = new URLSearchParams();
  if (params?.year) query.set("year", String(params.year));
  if (params?.leave_type_key) query.set("leave_type_key", params.leave_type_key);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return httpRequest<{
    summary: LeaveBalanceSummary[];
  }>(`/requests/leave/balance${suffix}`);
}
