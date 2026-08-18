import { httpRequest } from "@/shared/lib/core";

export type PayslipDistribution = {
  id: string;
  status: string;
  sent_at?: string | null;
  created_at?: string | null;
};

export type PayslipRow = {
  id: string;
  run_id: string;
  run_name: string;
  year: number;
  month: number;
  status: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  payment_status?: string | null;
  payment_reference?: string | null;
  latest_distribution?: PayslipDistribution | null;
};

export type PayslipDetail = PayslipRow & {
  currency: string;
  worker_name: string;
  worker_type?: string | null;
  organization_name?: string | null;
  employer_cost?: number;
  earnings: Array<{ label: string; amount: number }>;
  deductions: Array<{ label: string; amount: number }>;
  employer_costs: Array<{ label: string; amount: number }>;
};

export type PayslipListResponse = {
  data: PayslipRow[];
  meta: { page: number; per_page: number; total: number; last_page: number };
};

export async function listMyPayslips(params?: { page?: number; per_page?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/payroll/my/payslips${suffix}`);
  // parseResponse returns { success, data: { items, meta } } — access via res.data
  const items = res?.data?.items;
  if (Array.isArray(items)) {
    const m = res.data.meta;
    return {
      data: items as PayslipRow[],
      meta: {
        page: m?.page ?? params?.page ?? 1,
        per_page: m?.per_page ?? params?.per_page ?? items.length,
        total: m?.total ?? items.length,
        last_page: m?.pages ?? 1,
      },
    } satisfies PayslipListResponse;
  }
  return { data: [], meta: { page: 1, per_page: 0, total: 0, last_page: 1 } };
}

export async function getMyPayslipDetails(runId: string, itemId: string) {
  return httpRequest<PayslipDetail>(`/payroll/my/payslips/${runId}/${itemId}`);
}

export async function downloadMyPayslip(runId: string, itemId: string) {
  return httpRequest<{ file_name: string; mime_type: string; content_base64: string }>(
    `/payroll/my/payslips/${runId}/${itemId}`,
    { method: "POST" },
  );
}
export type TimesheetRow = {
  id: string;
  project_id?: string;
  fund_id?: string;
  grant_id?: string;
  work_date: string;
  hours: number;
  description?: string;
  status: string;
  organization_id?: string;
  team_id?: string;
  project?: { name: string };
  fund?: { name: string };
  grant?: { name: string };
};

export async function listMyProjectTimesheets(params?: { page?: number; per_page?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await httpRequest<any>(`/payroll/my/timesheets${suffix}`);
  return (response as any)?.data?.items ?? [];
}

export async function createMyProjectTimesheet(payload: Record<string, unknown>) {
  return httpRequest<any>("/payroll/my/timesheets", { method: "POST", body: payload });
}

export async function updateMyProjectTimesheet(id: string, payload: Record<string, unknown>) {
  return httpRequest<any>(`/payroll/my/timesheets/${id}`, { method: "POST", body: payload });
}

export async function submitMyProjectTimesheet(id: string) {
  return httpRequest<any>(`/payroll/my/timesheets/${id}/submit`, { method: "POST" });
}

export type PayrollRunSummary = {
  id: string;
  name: string;
  year: number;
  month: number;
  status: string;
  currency: string;
  net_total?: number;
  worker_count?: number;
};

export type PayrollRunItem = {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_type?: string | null;
  status: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  payment_status?: string | null;
};

export type PayrollRunDetail = PayrollRunSummary & {
  description?: string | null;
  notes?: string | null;
  item_count?: number;
  totals?: { gross: number; deductions: number; employer_cost: number; net: number };
  items: any[];
  review_notes?: string | null;
  rejection_reason?: string | null;
};

export type PayrollWorker = {
  id: string;
  user_id?: string | null;
  name: string;
  worker_type: string;
  employment_type?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  tax_id?: string | null;
  is_active: boolean;
  organization?: { name: string } | null;
};

export async function listPayrollRuns(params?: { page?: number; per_page?: number; organization_id?: string; status_in?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.organization_id) query.set("organization_id", params.organization_id);
  if (params?.status_in) query.set("status_in", params.status_in);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/payroll/runs${suffix}`);
  const items: PayrollRunSummary[] = res?.data?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
  return { items };
}

export async function getPayrollRun(id: string) {
  const res = await httpRequest<any>(`/payroll/runs/${id}`);
  return (res?.data ?? res) as PayrollRunDetail;
}

export async function createPayrollRun(payload: { name: string; year: number; month: number; period_start: string; period_end: string; currency?: string; notes?: string; organization_id?: string; paid_from_account_id?: string }) {
  const res = await httpRequest<any>("/payroll/runs", { method: "POST", body: payload });
  return (res?.data ?? res) as any;
}

export async function generatePayrollRun(id: string) {
  return httpRequest<any>(`/payroll/runs/${id}/generate`, { method: "POST" });
}

export async function submitPayrollRun(id: string) {
  return httpRequest<any>(`/payroll/runs/${id}/submit`, { method: "POST" });
}

export async function deletePayrollRun(id: string) {
  return httpRequest<any>(`/payroll/runs/${id}`, { method: "DELETE" });
}

export async function reviewPayrollRun(id: string, payload: { notes?: string }) {
  return httpRequest<any>(`/payroll/runs/${id}/review`, { method: "POST", body: payload });
}

export async function approvePayrollRun(id: string, payload: { notes?: string }) {
  return httpRequest<any>(`/payroll/runs/${id}/approve`, { method: "POST", body: payload });
}

export async function rejectPayrollRun(id: string, payload: { reason?: string; note?: string; notes?: string }) {
  return httpRequest<any>(`/payroll/runs/${id}/reject`, { method: "POST", body: payload });
}

export async function payPayrollRun(id: string, payload: { payment_reference?: string; payment_date?: string }) {
  return httpRequest<any>(`/payroll/runs/${id}/pay`, { method: "POST", body: payload });
}

export async function closePayrollRun(id: string) {
  return httpRequest<any>(`/payroll/runs/${id}/close`, { method: "POST" });
}

export async function reopenPayrollRun(id: string) {
  return httpRequest<any>(`/payroll/runs/${id}/reopen`, { method: "POST" });
}

export async function listPayrollWorkers(params?: { page?: number; per_page?: number; q?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.q) query.set("q", params.q);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/payroll/workers${suffix}`);
  const items: PayrollWorker[] = res?.data?.items ?? [];
  const meta = res?.data?.meta ?? { page: 1, per_page: 20, total: items.length, pages: 1 };
  return { items, meta };
}

export type ProfileComponentInput = {
  component_id: string;
  amount?: number;
  rate?: number;
  formula?: string;
};

export type WorkerProfileInput = {
  effective_from: string;
  effective_to?: string;
  base_amount?: number;
  payment_mode?: string;
  pay_frequency?: string;
  components?: ProfileComponentInput[];
};

export type UpsertWorkerPayload = {
  full_name: string;
  worker_type: "employee" | "consultant";
  email?: string;
  staff_code?: string;
  currency?: string;
  status?: string;
  pay_basis?: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  tax_identifier?: string;
  pension_identifier?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  organization_id?: string;
  team_id?: string;
  project_id?: string;
  default_fund_id?: string;
  default_grant_id?: string;
  allocation_mode?: string;
  tax_table_id?: string;
  metadata?: Record<string, unknown>;
  hybrid_fixed_percent?: number;
  allocations?: Array<{
    organization_id?: string;
    team_id?: string;
    project_id?: string;
    fund_id?: string;
    grant_id?: string;
    allocation_percent?: number;
    allocation_amount?: number;
  }>;
  standard_hours_per_day?: number;
  profile?: WorkerProfileInput;
};

export async function createPayrollWorker(payload: UpsertWorkerPayload) {
  const res = await httpRequest<any>("/payroll/workers", { method: "POST", body: payload });
  return (res?.data ?? res) as PayrollWorker;
}

export async function updatePayrollWorker(id: string, payload: Partial<UpsertWorkerPayload>) {
  const res = await httpRequest<any>(`/payroll/workers/${id}`, { method: "POST", body: payload });
  return (res?.data ?? res) as PayrollWorker;
}

export async function deletePayrollWorker(id: string) {
  const res = await httpRequest<any>(`/payroll/workers/${id}`, { method: "DELETE" });
  return res?.data ?? res;
}

export async function authorizePayrollRun(id: string, payload?: { notes?: string }) {
  const res = await httpRequest<any>(`/payroll/runs/${id}/authorize`, {
    method: "POST",
    body: payload ?? {},
  });
  return (res?.data ?? res) as any;
}

export async function downloadMonthlyBreakdown(id: string) {
  const res = await httpRequest<any>(`/payroll/runs/${id}/monthly-breakdown`, {
    method: "POST",
  });
  return (res?.data ?? res) as { file_name: string; mime_type: string; content_base64: string };
}

export type PayrollLoan = {
  id: string;
  worker_id: string;
  worker?: { id: string; full_name: string; worker_type: string; email: string } | null;
  component_id?: string | null;
  component?: any;
  request_id?: string | null;
  loan_type: "loan" | "salary_advance";
  title: string;
  principal_amount: number;
  outstanding_amount: number;
  issued_date: string;
  start_recovery_date: string;
  monthly_recovery_amount?: number | null;
  recovery_rate?: number | null;
  status: "active" | "paused" | "closed";
  notes?: string | null;
  repayments?: Array<{ id: string; amount: number; status: string; created_at: string }>;
};

export type UpsertLoanPayload = {
  worker_id: string;
  component_id?: string | null;
  request_id?: string | null;
  loan_type: "loan" | "salary_advance";
  title: string;
  principal_amount: number;
  issued_date: string;
  start_recovery_date: string;
  monthly_recovery_amount?: number | null;
  recovery_rate?: number | null;
  status?: string;
  notes?: string | null;
};

export async function listLoans(params?: { page?: number; per_page?: number; worker_id?: string; status?: string; loan_type?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.worker_id) query.set("worker_id", params.worker_id);
  if (params?.status) query.set("status", params.status);
  if (params?.loan_type) query.set("loan_type", params.loan_type);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/payroll/loans${suffix}`);
  const items: PayrollLoan[] = res?.data?.items ?? res?.data ?? res ?? [];
  return { items };
}

export async function createLoan(payload: UpsertLoanPayload) {
  const res = await httpRequest<any>("/payroll/loans", { method: "POST", body: payload });
  return (res?.data ?? res) as PayrollLoan;
}

export async function updateLoan(id: string, payload: Partial<UpsertLoanPayload>) {
  const res = await httpRequest<any>(`/payroll/loans/${id}`, { method: "POST", body: payload });
  return (res?.data ?? res) as PayrollLoan;
}

export async function logManualRepayment(id: string, payload: { amount: number; notes?: string }) {
  const res = await httpRequest<any>(`/payroll/loans/${id}/repayments`, {
    method: "POST",
    body: payload,
  });
  return (res?.data ?? res) as PayrollLoan;
}

export type PayrollComponent = {
  id: string;
  code: string;
  name: string;
  component_type: "earning" | "deduction" | "employer_cost";
  calculation_type: string;
  amount?: number | null;
  rate?: number | null;
  taxable: boolean;
  statutory: boolean;
  is_active: boolean;
};

export type UpsertComponentPayload = {
  code: string;
  name: string;
  component_type: "earning" | "deduction" | "employer_cost";
  calculation_type: string;
  amount?: number;
  rate?: number;
  taxable?: boolean;
  statutory?: boolean;
  notes?: string;
};

export async function listPayrollComponents() {
  const res = await httpRequest<any>("/payroll/components");
  const items: PayrollComponent[] = res?.data?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
  return { items };
}

export async function createPayrollComponent(payload: UpsertComponentPayload) {
  const res = await httpRequest<any>("/payroll/components", { method: "POST", body: payload });
  return (res?.data ?? res) as PayrollComponent;
}

export async function updatePayrollComponent(id: string, payload: Partial<UpsertComponentPayload>) {
  const res = await httpRequest<any>(`/payroll/components/${id}`, { method: "POST", body: payload });
  return (res?.data ?? res) as PayrollComponent;
}

export async function deletePayrollComponent(id: string) {
  return httpRequest<any>(`/payroll/components/${id}`, { method: "DELETE" });
}

export type TaxBand = {
  from: number;
  to?: number | null;
  rate: number;
};

export type PayrollTaxTable = {
  id: string;
  name: string;
  worker_type?: string | null;
  effective_date: string;
  currency?: string | null;
  bands: TaxBand[];
  is_active: boolean;
};

export type UpsertTaxTablePayload = {
  name: string;
  worker_type?: string;
  effective_date: string;
  currency?: string;
  bands: TaxBand[];
};

export async function listPayrollTaxTables() {
  const res = await httpRequest<any>("/payroll/tax-tables");
  const items: PayrollTaxTable[] = res?.data?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
  return { items };
}

export async function createPayrollTaxTable(payload: UpsertTaxTablePayload) {
  const res = await httpRequest<any>("/payroll/tax-tables", { method: "POST", body: payload });
  return (res?.data ?? res) as PayrollTaxTable;
}

export async function updatePayrollTaxTable(id: string, payload: Partial<UpsertTaxTablePayload>) {
  const res = await httpRequest<any>(`/payroll/tax-tables/${id}`, { method: "POST", body: payload });
  return (res?.data ?? res) as PayrollTaxTable;
}
