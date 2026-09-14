import type { HttpRequest } from "../auth/http-client";

function toQuery(params?: Record<string, unknown>) {
  const query = new URLSearchParams();
  if (!params) return "";
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const raw = query.toString();
  return raw ? `?${raw}` : "";
}

export type FinanceLedgerEntry = {
  id: string;
  entry_date?: string;
  date?: string;
  direction?: "in" | "out" | string;
  amount?: number;
  currency?: string;
  reference?: string | null;
  description?: string | null;
  account_name?: string | null;
  source_type?: string | null;
  status?: string | null;
  [key: string]: unknown;
};

export type FinanceBudgetRecord = {
  id: string;
  year?: number;
  month?: number | null;
  quarter?: number | null;
  status?: string;
  currency?: string;
  total_budget?: number;
  total_actual?: number;
  variance_amount?: number;
  title?: string | null;
  [key: string]: unknown;
};

export type FinanceInvoiceRecord = {
  id: string;
  invoice_number?: string | null;
  customer_name?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  total_amount?: number;
  paid_amount?: number;
  outstanding_amount?: number;
  status?: string;
  currency?: string;
  [key: string]: unknown;
};

export type FinanceBillRecord = {
  id: string;
  bill_number?: string | null;
  vendor_name?: string | null;
  bill_date?: string | null;
  due_date?: string | null;
  total_amount?: number;
  paid_amount?: number;
  outstanding_amount?: number;
  status?: string;
  currency?: string;
  [key: string]: unknown;
};

export type FinanceAssetRecord = {
  id: string;
  asset_id?: string | null;
  asset_description?: string | null;
  asset_code?: string | null;
  asset_name?: string | null;
  category?: string | null;
  status?: string | null;
  condition?: string | null;
  location_project?: string | null;
  serial_tag_no?: string | null;
  assigned_to_user_id?: string | null;
  assigned_to_name?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  useful_life_years?: number | null;
  salvage_value?: number | null;
  supplier?: string | null;
  disposed_at?: string | null;
  disposal_method?: string | null;
  disposal_proceeds?: number | null;
  current_value?: number | null;
  location?: string | null;
  currency?: string | null;
  [key: string]: unknown;
};

export type FinanceChartAccountRecord = {
  id: string;
  code: string;
  name: string;
  type?: string;
  category?: string;
  normal_balance?: string;
  is_active?: boolean;
  [key: string]: unknown;
};

export type FinanceAccountRecord = {
  id: string;
  name: string;
  code?: string | null;
  account_type?: string;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  branch_name?: string | null;
  currency?: string;
  opening_balance?: number;
  current_balance?: number;
  is_active?: boolean;
  [key: string]: unknown;
};

export type FinanceReportingPeriodRecord = {
  id: string;
  year: number;
  month?: number | null;
  quarter?: number | null;
  label?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
};

export type FinancePartyRecord = {
  id: string;
  name?: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  [key: string]: unknown;
};

export type CustomerRecord = FinancePartyRecord & {
  outstanding_amount?: number;
  credit_limit?: number;
  pan?: string | null;
  tpin?: string | null;
};

export type VendorRecord = FinancePartyRecord & {
  outstanding_amount?: number;
  opening_balance?: number;
  tax_number?: string | null;
  contact_type?: "customer" | "vendor" | "both";
  sub_type?: "individual" | "business";
  company_name?: string | null;
  contact_persons?: ContactPersonRecord[];
};

export type ContactPersonRecord = {
  id: string;
  salutation?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  designation?: string | null;
  department?: string | null;
  is_primary: boolean;
};

export type ContactRecord = FinancePartyRecord & {
  contact_type: "customer" | "vendor" | "both";
  sub_type: "individual" | "business";
  company_name?: string | null;
  legal_name?: string | null;
  billing_address?: Record<string, unknown> | null;
  shipping_address?: Record<string, unknown> | null;
  tax_number?: string | null;
  is_taxable?: boolean;
  payment_terms?: number | null;
  credit_limit?: number | null;
  opening_balance?: number | null;
  website?: string | null;
  notes?: string | null;
  primary_contact_id?: string | null;
  contact_persons: ContactPersonRecord[];
  outstanding_amount?: number;
};

export type PartyTransaction = {
  id: string;
  date: string;
  type: "invoice" | "payment" | "credit_note" | "receipt";
  reference: string;
  amount: number;
  balance: number;
  status?: string;
};

export type FinancePVDeductionRecord = {
  id: string;
  payment_voucher_id: string;
  deduction_type_id: string;
  deduction_type_name: string;
  deduction_type_code: string;
  rate: number;
  gross_amount: number;
  deduction_amount: number;
  request_deduction_id: string | null;
  remittance_status: "pending" | "remitted";
  remittance_number: string | null;
  remittance_ref: string | null;
  remitted_at: string | null;
};

export type FinanceRequestDeductionRecord = {
  id: string;
  request_id: string;
  request_number: string;
  deduction_type_id: string;
  deduction_type_name: string;
  deduction_type_code: string;
  amount: number;
  rate: number;
  gross_amount: number;
  status: "pending" | "partially_remitted" | "remitted";
  remittance_id?: string | null;
  allocated_amount?: number;
  remaining_amount?: number;
  remittance_number: string | null;
  remitted_at: string | null;
  remittance_ref: string | null;
  paid_from_account: { id: string; name: string; bank_name: string | null; account_number: string | null } | null;
  evidence_file: { id: string; file_name: string; public_url: string | null } | null;
  evidence_files?: Array<{ id: string; file_name: string; public_url: string | null }>;
  remittance_allocations?: Array<{
    id: string;
    remittance_number: string;
    remittance_ref: string | null;
    allocated_amount: number;
    remitted_at: string | null;
    remitted_by: { id: string; name: string } | null;
    payment_voucher: { id: string; voucher_number: string } | null;
    paid_from_account: { id: string; name: string; bank_name: string | null; account_number: string | null } | null;
    evidence_file_ids: string[];
    notes: string | null;
  }>;
  notes: string | null;
  created_by_name: string;
  created_at: string;
};

export type FinanceRequestRemittanceRecord = {
  id: string;
  remittance_number: string;
  reference: string | null;
  remitted_at: string | null;
  total_amount: number;
  allocated_amount: number;
  unallocated_amount: number;
  remitted_by: { id: string; name: string } | null;
  created_by: { id: string; name: string } | null;
  payment_voucher: { id: string; voucher_number: string } | null;
  paid_from_account: { id: string; name: string; bank_name: string | null; account_number: string | null } | null;
  evidence_file: { id: string; file_name: string; public_url: string | null } | null;
  evidence_files: Array<{ id: string; file_name: string; public_url: string | null }>;
  notes: string | null;
  deductions: Array<{
    allocation_id: string;
    deduction_id: string;
    request_id: string;
    request_number: string;
    deduction_type_id: string;
    deduction_type_name: string;
    deduction_type_code: string;
    amount: number;
    allocated_amount: number;
    total_allocated_amount: number;
    remaining_amount: number;
    status: "pending" | "partially_remitted" | "remitted";
    payment_voucher: { id: string; voucher_number: string } | null;
  }>;
  created_at: string;
  updated_at: string;
};

export type FinancePaymentVoucherRecord = {
  id: string;
  request_id: string;
  request_number: string;
  request_status: string;
  request_type: string;
  request_creator_name: string;
  request_total_amount: number;
  voucher_number: string;
  amount: number;
  retired_amount: number;
  voucher_balance: number;
  retirement_status: string;
  method: string | null;
  transaction_ref: string | null;
  note: string | null;
  disbursed_at: string;
  retired_at: string | null;
  verified_at: string | null;
  paid_from_account: { id: string; name: string; code: string | null; account_type: string } | null;
  contact_id?: string;
  contact?: { id: string; name: string } | null;
  evidence_file: { id: string; file_name: string; mime_type: string | null; public_url: string | null } | null;
  evidence_files?: Array<{ id: string; file_name: string; mime_type: string | null; public_url: string | null }>;
  retirement_files?: Array<{ id: string; file_name: string; mime_type: string | null; public_url: string | null }>;
  gross_amount?: number;
  net_amount?: number;
  deductions?: FinancePVDeductionRecord[];
};

export type RequestRecord = {
  id: string;
  number: string;
  status: string;
  type: string;
  type_label?: string;
  creator?: { id: string; first_name?: string; last_name?: string; email: string };
  created_at: string;
  updated_at: string;
  total_amount?: number;
  currency?: string;
  [key: string]: unknown;
};

type PaginatedResponse<T> = {
  result: T[];
  total: number;
  total_result: number;
  per_page: number;
  page: number;
  pages: number;
};

type DownloadedFile = {
  file_name: string;
  mime_type: string;
  content_base64: string;
};

function asPaginatedResponse<T>(
  response: unknown,
  endpoint: string,
) {
  // Unwrap { success, data } envelope produced by parseResponse
  const unwrapped = (response as any)?.data ?? response;

  if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) {
    throw new Error(`${endpoint} must return a paginated response object.`);
  }

  // Support new { items, meta } format from paginatedResponse()
  if (Array.isArray((unwrapped as any).items)) {
    const items = (unwrapped as any).items as T[];
    const meta = (unwrapped as any).meta ?? {};
    return {
      result: items,
      total: Number(meta.total ?? items.length),
      total_result: Number(meta.total ?? items.length),
      per_page: Number(meta.per_page ?? 20),
      page: Number(meta.page ?? 1),
      pages: Number(meta.pages ?? 1),
    };
  }

  const payload = unwrapped as {
    result?: unknown;
    total?: unknown;
    total_result?: unknown;
    per_page?: unknown;
    page?: unknown;
    pages?: unknown;
  };
  if (!Array.isArray(payload.result)) {
    throw new Error(`${endpoint} response is missing result[].`);
  }
  const page = Number(payload.page);
  const perPage = Number(payload.per_page);
  const total = Number(payload.total);
  const totalResult = Number(payload.total_result);
  const pages = Number(payload.pages);

  if (
    !Number.isFinite(page) ||
    !Number.isFinite(perPage) ||
    !Number.isFinite(total) ||
    !Number.isFinite(totalResult) ||
    !Number.isFinite(pages)
  ) {
    throw new Error(
      `${endpoint} response must include numeric total, total_result, per_page, page, and pages.`,
    );
  }

  return {
    result: payload.result as T[],
    total: Math.max(0, Math.trunc(total)),
    total_result: Math.max(0, Math.trunc(totalResult)),
    per_page: Math.max(1, Math.trunc(perPage)),
    page: Math.max(1, Math.trunc(page)),
    pages: Math.max(1, Math.trunc(pages)),
  };
}

export function createFinanceApi(httpRequest: HttpRequest) {
  return {
    async listRequests(params?: Record<string, unknown>) {
      const suffix = toQuery(params);
      const response = await httpRequest<any>(`/finance/requests${suffix}`);
      const paged = asPaginatedResponse<RequestRecord>(response, "/finance/requests");
      return paged.result;
    },

    async listRequestsPaged(params?: Record<string, unknown>) {
      const suffix = toQuery(params);
      const response = await httpRequest<any>(`/finance/requests${suffix}`);
      return asPaginatedResponse<RequestRecord>(response, "/finance/requests");
    },

    exportRequests(params?: Record<string, unknown>) {
      return httpRequest<{ job_id: string }>(`/finance/requests/export${toQuery(params)}`);
    },

    listPaymentVouchers(params?: Record<string, unknown>) {
      const suffix = toQuery(params);
      return httpRequest<PaginatedResponse<FinancePaymentVoucherRecord>>(
        `/finance/payment-vouchers${suffix}`,
      ).then((response) =>
        asPaginatedResponse<FinancePaymentVoucherRecord>(response, "/finance/payment-vouchers"),
      );
    },

    async listRequestPaymentVouchers(requestId: string) {
      const res = await httpRequest<any>(`/finance/requests/${requestId}/payment-vouchers`);
      return ((res as any)?.data?.items ?? []) as FinancePaymentVoucherRecord[];
    },

    updatePaymentVoucher(requestId: string, voucherId: string, payload: Record<string, unknown>) {
      return httpRequest(`/finance/requests/${requestId}/payment-vouchers/${voucherId}`, {
        method: "POST",
        body: payload,
      });
    },

    async listAccounts(params?: Record<string, unknown>) {
      const suffix = toQuery(params);
      const res = await httpRequest<any>(`/finance/accounts${suffix}`);
      return ((res as any)?.data?.items ?? []) as FinanceAccountRecord[];
    },

    getAccount(id: string) {
      return httpRequest<FinanceAccountRecord>(`/finance/accounts/${id}`);
    },

    listLedger(params?: Record<string, unknown>) {
      return httpRequest<PaginatedResponse<FinanceLedgerEntry>>(`/finance/ledger${toQuery(params)}`).then(
        (response) => asPaginatedResponse<FinanceLedgerEntry>(response, "/finance/ledger").result,
      );
    },

    async listLedgerPaged(params?: Record<string, unknown>) {
      const response = await httpRequest<PaginatedResponse<FinanceLedgerEntry>>(
        `/finance/ledger${toQuery(params)}`,
      );
      return asPaginatedResponse<FinanceLedgerEntry>(response, "/finance/ledger");
    },

    exportLedger(params?: Record<string, unknown>) {
      return httpRequest<{ job_id: string }>(`/finance/ledger/export${toQuery(params)}`);
    },

    async listManualEntries(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/manual-entry${toQuery(params)}`);
      return (res?.data ?? res) as {
        result: Record<string, unknown>[];
        total: number;
        total_result: number;
        per_page: number;
        page: number;
        pages: number;
      };
    },

    createManualEntry(payload: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/manual-entry`, {
        method: "POST",
        body: payload,
      });
    },

    updateJournalEntry(id: string, payload: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/manual-entry/${id}`, {
        method: "PATCH",
        body: payload,
      });
    },

    async listStatutoryDeductionManualEntries(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/manual-entry/statutory-deductions${toQuery(params)}`);
      return (res?.data ?? res) as {
        result: Record<string, unknown>[];
        total: number;
        total_result: number;
        per_page: number;
        page: number;
        pages: number;
      };
    },

    createStatutoryDeductionManualEntry(payload: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/manual-entry/statutory-deductions`, {
        method: "POST",
        body: payload,
      });
    },

    updateStatutoryDeductionManualEntry(id: string, payload: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/manual-entry/${id}`, {
        method: "PATCH",
        body: payload,
      });
    },

    async listBudgets(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/budgets${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as FinanceBudgetRecord[];
    },

    listApprovedBudgetLines(params?: Record<string, unknown>) {
      return httpRequest<any[]>(`/finance/budgets/approved-lines${toQuery(params)}`);
    },

    getBudget(id: string) {
      return httpRequest<FinanceBudgetRecord>(`/finance/budgets/${id}`);
    },

    createBudget(payload: Record<string, unknown>) {
      return httpRequest<FinanceBudgetRecord>(`/finance/budgets`, {
        method: "POST",
        body: payload,
      });
    },

    updateBudget(id: string, payload: Record<string, unknown>) {
      return httpRequest<FinanceBudgetRecord>(`/finance/budgets/${id}`, {
        method: "POST",
        body: payload,
      });
    },

    approveBudget(id: string) {
      return httpRequest<void>(`/finance/budgets/${id}/approve`, {
        method: "POST",
      });
    },

    recalculateBudget(id: string) {
      return httpRequest<void>(`/finance/budgets/${id}/recalculate`, {
        method: "POST",
      });
    },

    // ── Budget Revision Workflow ────────────────────────────────────────────

    listBudgetRevisions(budgetId: string) {
      return httpRequest<Record<string, unknown>[]>(`/finance/budgets/${budgetId}/revisions`);
    },

    submitBudgetRevision(revisionId: string, payload?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/budget-revisions/${revisionId}/submit`, {
        method: "POST",
        body: payload,
      });
    },

    approveBudgetRevision(revisionId: string, payload?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/budget-revisions/${revisionId}/approve`, {
        method: "POST",
        body: payload,
      });
    },

    rejectBudgetRevision(revisionId: string, payload?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/budget-revisions/${revisionId}/reject`, {
        method: "POST",
        body: payload,
      });
    },

    returnBudgetRevision(revisionId: string, payload?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/budget-revisions/${revisionId}/return`, {
        method: "POST",
        body: payload,
      });
    },

    copyBudget(id: string, payload?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/budgets/${id}/copy`, {
        method: "POST",
        body: payload,
      });
    },

    listSalesInvoices(params?: Record<string, unknown>) {
      return httpRequest<PaginatedResponse<FinanceInvoiceRecord>>(
        `/finance/sales-invoices${toQuery(params)}`,
      ).then((response) =>
        asPaginatedResponse<FinanceInvoiceRecord>(response, "/finance/sales-invoices").result,
      );
    },

    getSalesInvoice(id: string) {
      return httpRequest<FinanceInvoiceRecord>(`/finance/sales-invoices/${id}`);
    },

    listBills(params?: Record<string, unknown>) {
      return httpRequest<PaginatedResponse<FinanceBillRecord>>(`/finance/bills${toQuery(params)}`).then(
        (response) => asPaginatedResponse<FinanceBillRecord>(response, "/finance/bills").result,
      );
    },

    getBill(id: string) {
      return httpRequest<FinanceBillRecord>(`/finance/bills/${id}`);
    },

    async listAssets(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/assets${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as FinanceAssetRecord[];
    },

    getAsset(id: string) {
      return httpRequest<FinanceAssetRecord>(`/finance/assets/${id}`);
    },

    async listAssetDisposals(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/assets/disposals${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as FinanceAssetRecord[];
    },

    createAsset(payload: Record<string, unknown>) {
      return httpRequest<FinanceAssetRecord>(`/finance/assets`, {
        method: "POST",
        body: payload,
      });
    },

    updateAsset(id: string, payload: Record<string, unknown>) {
      return httpRequest<FinanceAssetRecord>(`/finance/assets/${id}`, {
        method: "POST",
        body: payload,
      });
    },

    verifyAsset(id: string, payload: Record<string, unknown>) {
      return httpRequest<FinanceAssetRecord>(`/finance/assets/${id}/verify`, {
        method: "POST",
        body: payload,
      });
    },

    disposeAsset(id: string, payload: Record<string, unknown>) {
      return httpRequest<FinanceAssetRecord>(`/finance/assets/${id}/dispose`, {
        method: "POST",
        body: payload,
      });
    },

    listChartAccounts(params?: Record<string, unknown>) {
      return httpRequest<any>(`/finance/chart-accounts${toQuery(params)}`).then((response) => {
        const inner = (response as any)?.data ?? response;
        const rows = Array.isArray(inner?.result) ? inner.result : Array.isArray(inner?.items) ? inner.items : Array.isArray(inner) ? inner : [];
        return {
          result: rows,
          total: Number(inner?.total ?? inner?.meta?.total ?? rows.length),
          total_result: Number(inner?.total_result ?? inner?.total ?? rows.length),
          per_page: Number(inner?.per_page ?? inner?.meta?.per_page ?? 20),
          page: Number(inner?.page ?? inner?.meta?.page ?? 1),
          pages: Number(inner?.pages ?? inner?.meta?.pages ?? 1)
        };
      });
    },

    async listReportingPeriods(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/reporting-periods${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as FinanceReportingPeriodRecord[];
    },

    listCustomers(params?: Record<string, unknown>) {
      return httpRequest<any>(`/finance/customers${toQuery(params)}`).then((response) => {
        const inner = (response as any)?.data ?? response;
        const rows = Array.isArray(inner?.result) ? inner.result : Array.isArray(inner?.items) ? inner.items : Array.isArray(inner) ? inner : [];
        return {
          result: rows,
          total: Number(inner?.total ?? inner?.meta?.total ?? rows.length),
          total_result: Number(inner?.total_result ?? inner?.total ?? rows.length),
          per_page: Number(inner?.per_page ?? inner?.meta?.per_page ?? 20),
          page: Number(inner?.page ?? inner?.meta?.page ?? 1),
          pages: Number(inner?.pages ?? inner?.meta?.pages ?? 1)
        };
      });
    },

    getCustomer(id: string) {
      return httpRequest<CustomerRecord>(`/finance/customers/${id}`);
    },

    createCustomer(payload: Record<string, unknown>) {
      return httpRequest<CustomerRecord>("/finance/customers", { method: "POST", body: payload });
    },

    updateCustomer(id: string, payload: Record<string, unknown>) {
      return httpRequest<CustomerRecord>(`/finance/customers/${id}`, { method: "POST", body: payload });
    },

    getCustomerTransactions(id: string) {
      return httpRequest<PartyTransaction[]>(`/finance/customers/${id}/transactions`);
    },

    listVendors(params?: Record<string, unknown>) {
      return httpRequest<any>(`/finance/vendors${toQuery(params)}`).then((response) => {
        const inner = (response as any)?.data ?? response;
        const rows = Array.isArray(inner?.result) ? inner.result : Array.isArray(inner?.items) ? inner.items : Array.isArray(inner) ? inner : [];
        return {
          result: rows,
          total: Number(inner?.total ?? inner?.meta?.total ?? rows.length),
          total_result: Number(inner?.total_result ?? inner?.total ?? rows.length),
          per_page: Number(inner?.per_page ?? inner?.meta?.per_page ?? 20),
          page: Number(inner?.page ?? inner?.meta?.page ?? 1),
          pages: Number(inner?.pages ?? inner?.meta?.pages ?? 1)
        };
      });
    },

    getVendor(id: string) {
      return httpRequest<VendorRecord>(`/finance/vendors/${id}`);
    },

    createVendor(payload: Record<string, unknown>) {
      return httpRequest<VendorRecord>("/finance/vendors", { method: "POST", body: payload });
    },

    updateVendor(id: string, payload: Record<string, unknown>) {
      return httpRequest<VendorRecord>(`/finance/vendors/${id}`, { method: "POST", body: payload });
    },

    getVendorTransactions(id: string) {
      return httpRequest<PartyTransaction[]>(`/finance/vendors/${id}/transactions`);
    },

    listContacts(params?: Record<string, unknown>) {
      return httpRequest<any>(`/finance/contacts${toQuery(params)}`).then((response) => {
        const inner = (response as any)?.data ?? response;
        const rows = Array.isArray(inner?.result) ? inner.result : Array.isArray(inner?.items) ? inner.items : Array.isArray(inner) ? inner : [];
        return {
          result: rows,
          total: Number(inner?.total ?? inner?.meta?.total ?? rows.length),
          total_result: Number(inner?.total_result ?? inner?.total ?? rows.length),
          per_page: Number(inner?.per_page ?? inner?.meta?.per_page ?? 20),
          page: Number(inner?.page ?? inner?.meta?.page ?? 1),
          pages: Number(inner?.pages ?? inner?.meta?.pages ?? 1)
        };
      });
    },

    getContact(id: string) {
      return httpRequest<ContactRecord>(`/finance/contacts/${id}`);
    },

    createContact(payload: Record<string, unknown>) {
      return httpRequest<ContactRecord>("/finance/contacts", { method: "POST", body: payload });
    },

    updateContact(id: string, payload: Record<string, unknown>) {
      return httpRequest<ContactRecord>(`/finance/contacts/${id}`, { method: "POST", body: payload });
    },

    getContactTransactions(id: string) {
      return httpRequest<PartyTransaction[]>(`/finance/contacts/${id}/transactions`);
    },

    async listDonors(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/donors${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as FinancePartyRecord[];
    },

    createDonor(dto: Record<string, unknown>) {
      return httpRequest<FinancePartyRecord>("/finance/donors", { method: "POST", body: dto });
    },

    updateDonor(id: string, dto: Record<string, unknown>) {
      return httpRequest<FinancePartyRecord>(`/finance/donors/${id}`, { method: "POST", body: dto });
    },

    deleteDonor(id: string) {
      return httpRequest<{ success: boolean }>(`/finance/donors/${id}`, { method: "DELETE" });
    },

    async listFunds(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/funds${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as FinancePartyRecord[];
    },

    createFund(dto: Record<string, unknown>) {
      return httpRequest<FinancePartyRecord>("/finance/funds", { method: "POST", body: dto });
    },

    updateFund(id: string, dto: Record<string, unknown>) {
      return httpRequest<FinancePartyRecord>(`/finance/funds/${id}`, { method: "POST", body: dto });
    },

    deleteFund(id: string) {
      return httpRequest<{ success: boolean }>(`/finance/funds/${id}`, { method: "DELETE" });
    },

    async listGrants(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/grants${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as FinancePartyRecord[];
    },

    createGrant(dto: Record<string, unknown>) {
      return httpRequest<FinancePartyRecord>("/finance/grants", { method: "POST", body: dto });
    },

    updateGrant(id: string, dto: Record<string, unknown>) {
      return httpRequest<FinancePartyRecord>(`/finance/grants/${id}`, { method: "POST", body: dto });
    },

    deleteGrant(id: string) {
      return httpRequest<{ success: boolean }>(`/finance/grants/${id}`, { method: "DELETE" });
    },

    getSettings() {
      return httpRequest<Record<string, unknown>>("/finance/settings");
    },

    updateSettings(dto: {
      prepared_by?: { name?: string; title?: string; signature_file_id?: string };
      reviewed_by?: { name?: string; title?: string; signature_file_id?: string };
      approved_by?: { name?: string; title?: string; signature_file_id?: string };
    }) {
      return httpRequest<Record<string, unknown>>("/finance/settings", {
        method: "POST",
        body: dto as Record<string, unknown>,
      });
    },

    getExecutiveSummary(params?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/reports/executive-summary${toQuery(params)}`);
    },

    getIncomeSummary(params?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/reports/income-summary${toQuery(params)}`);
    },

    getExpenseSummary(params?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/reports/expense-summary${toQuery(params)}`);
    },

    getProfitLoss(params?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/reports/profit-loss${toQuery(params)}`);
    },

    getBalancesReport(params?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/reports/balances${toQuery(params)}`);
    },

    getReceivablesReport(params?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/reports/receivables${toQuery(params)}`);
    },

    getPayablesReport(params?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/reports/payables${toQuery(params)}`);
    },

    getBudgetVsActualReport(params?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/reports/budget-vs-actual${toQuery(params)}`);
    },

    getGrantUtilizationReport(params?: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/reports/grant-utilization${toQuery(params)}`);
    },

    // ── Deduction Types ────────────────────────────────────────────────────

    async listDeductionTypes(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/deduction-types${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as Record<string, unknown>[];
    },

    createDeductionType(body: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>('/finance/deduction-types', { method: 'POST', body });
    },

    updateDeductionType(id: string, body: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/deduction-types/${id}`, { method: 'POST', body });
    },

    // ── PV Deductions ──────────────────────────────────────────────────────

    async listPVDeductions(pvId: string) {
      const res = await httpRequest<any>(`/finance/payment-vouchers/${pvId}/deductions`);
      return ((res as any)?.data?.items ?? []) as Record<string, unknown>[];
    },

    applyPVDeductions(pvId: string, body: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/payment-vouchers/${pvId}/deductions`, { method: 'POST', body });
    },

    // ── Vendor WHT Accruals ────────────────────────────────────────────────

    async listVendorWHTAccruals(vendorId: string, params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/vendors/${vendorId}/wht-accruals${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as Record<string, unknown>[];
    },

    // ── WHT Remittances ────────────────────────────────────────────────────

    async listWHTRemittances(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/wht-remittances${toQuery(params)}`);
      return ((res as any)?.data?.items ?? []) as Record<string, unknown>[];
    },

    getWHTRemittance(id: string) {
      return httpRequest<Record<string, unknown>>(`/finance/wht-remittances/${id}`);
    },

    createWHTRemittance(body: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>('/finance/wht-remittances', { method: 'POST', body });
    },

    // ── Request-level Statutory Deductions ──────────────────────────────────

    async listRequestDeductions(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/statutory-deductions${toQuery(params)}`);
      return {
        items: ((res as any)?.data?.items ?? []) as FinanceRequestDeductionRecord[],
        pagination: (res as any)?.data?.pagination ?? null,
      };
    },

    async listRequestRemittances(params?: Record<string, unknown>) {
      const res = await httpRequest<any>(`/finance/request-remittances${toQuery(params)}`);
      return {
        items: ((res as any)?.data?.items ?? []) as FinanceRequestRemittanceRecord[],
        pagination: (res as any)?.data?.pagination ?? null,
      };
    },

    batchRemitDeductions(body: Record<string, unknown>) {
      return httpRequest<FinanceRequestRemittanceRecord>('/finance/request-remittances', {
        method: 'POST',
        body,
      });
    },

    updatePendingDeduction(id: string, payload: Record<string, unknown>) {
      return httpRequest<Record<string, unknown>>(`/finance/statutory-deductions/${id}`, {
        method: 'PATCH',
        body: payload,
      });
    },

    updateRemittanceRecord(id: string, payload: Record<string, unknown>) {
      return httpRequest<FinanceRequestRemittanceRecord>(`/finance/request-remittances/${id}`, {
        method: 'PATCH',
        body: payload,
      });
    },

    addRemittanceAllocations(id: string, payload: Record<string, unknown>) {
      return httpRequest<FinanceRequestRemittanceRecord>(`/finance/request-remittances/${id}/allocations`, {
        method: 'POST',
        body: payload,
      });
    },

    downloadTrmSlip(remittanceId: string) {
      return httpRequest<{ job_id: string }>(
        `/finance/request-remittances/${remittanceId}/pdf`,
        { method: 'POST' },
      );
    },

    downloadWhtCertificate(pvDeductionId: string) {
      return httpRequest<{ job_id: string }>(
        `/finance/payment-vouchers/${pvDeductionId}/wht-certificate`,
        { method: 'POST' },
      );
    },
  };
}

export type FinanceApi = ReturnType<typeof createFinanceApi>;
