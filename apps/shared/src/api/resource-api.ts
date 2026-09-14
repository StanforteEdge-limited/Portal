// apps/shared/src/api/resource-api.ts
import type { HttpRequest } from "../auth/http-client";

export type OrganizationItem = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
};

export type TeamItem = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
};

export type OrganizationMapping = {
  id: string;
  organizationId: string;
  isPrimary: boolean;
  organization: { id: string; name: string; code: string };
};

export type TeamMember = {
  userId: string;
  role: "member" | "lead" | "manager";
  user: {
    id: string;
    email: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
  };
  scopeOrganizationIds?: string[];
  organizationScopes?: Array<{
    id: string;
    organizationId: string;
    scopeRole?: string | null;
    organization: { id: string; name: string; code: string };
  }>;
};

export type TeamOption = {
  id: string;
  name: string;
  groupType?: string;
  description?: string | null;
  isActive?: boolean;
  organizationId?: string | null;
  organizationIds?: string[];
  organizationMappings?: OrganizationMapping[];
  members?: TeamMember[];
};

function mapRole(role: string): "member" | "lead" | "manager" {
  if (role === "moderator") return "lead";
  if (role === "admin") return "manager";
  return "member";
}

function mapTeam(item: any): TeamOption {
  const orgMappings = item.organization_mappings ?? item.organizationMappings ?? [];
  const orgIds = item.organization_ids ?? orgMappings.map((m: any) => m.organization_id ?? m.organizationId).filter(Boolean);
  return {
    id: String(item.id),
    name: String(item.name ?? ""),
    groupType: String(item.type ?? item.group_type ?? "team"),
    description: item.description ?? null,
    isActive: Boolean(item.isActive ?? item.is_active ?? true),
    organizationId: item.organizationId ?? item.organization_id ?? null,
    organizationIds: orgIds.map((id: any) => String(id)),
    organizationMappings: (item.organization_mappings ?? item.organizationMappings ?? []).map((mapping: any) => ({
      id: String(mapping.id ?? ""),
      organizationId: String(mapping.organization_id ?? mapping.organizationId ?? ""),
      isPrimary: Boolean(mapping.is_primary ?? mapping.isPrimary ?? false),
      organization: {
        id: String(mapping.organization?.id ?? ""),
        name: String(mapping.organization?.name ?? ""),
        code: String(mapping.organization?.code ?? ""),
      },
    })),
    members: (item.members ?? []).map((member: any) => ({
      userId: String(member.userId ?? member.user_id ?? ""),
      role: mapRole(String(member.role || "member")),
      user: {
        id: String(member.user?.id ?? ""),
        email: String(member.user?.email ?? ""),
        username: String(member.user?.username ?? ""),
        firstName: member.user?.firstName ?? null,
        lastName: member.user?.lastName ?? null,
      },
      scopeOrganizationIds: (member.scope_organization_ids ?? member.organizationScopes ?? []).map((entry: any) =>
        String(entry.organization_id ?? entry.organizationId ?? entry)
      ),
      organizationScopes: (member.organization_scopes ?? member.organizationScopes ?? []).map((scope: any) => ({
        id: String(scope.id ?? ""),
        organizationId: String(scope.organization_id ?? scope.organizationId ?? ""),
        scopeRole: scope.scope_role ?? scope.scopeRole ?? null,
        organization: {
          id: String(scope.organization?.id ?? ""),
          name: String(scope.organization?.name ?? ""),
          code: String(scope.organization?.code ?? ""),
        },
      })),
    })),
  };
}

export function createResourceApi(httpRequest: HttpRequest) {
  return {
    async listOrganizations() {
      const response = await httpRequest<any>("/organizations");
      const data = (response as any)?.data?.items ?? [];
      return data.map((row: any) => ({
        id: String(row.id),
        name: String(row.name),
        code: String(row.code),
        is_active: Boolean(row.is_active ?? true)
      })) as OrganizationItem[];
    },

    async listGroups(params?: {
      active_only?: boolean;
      search?: string;
      organization_id?: string;
      group_type?: string;
    }) {
      const query = new URLSearchParams();
      if (params?.active_only !== undefined) {
        query.set("active_only", params.active_only ? "true" : "false");
      }
      if (params?.search) query.set("search", params.search);
      if (params?.organization_id) query.set("organization_id", params.organization_id);
      if (params?.group_type) query.set("group_type", params.group_type);
      const qs = query.toString();
      const path = qs ? `/groups?${qs}` : "/groups";
      const response = await httpRequest<any>(path);
      const data = (response as any)?.data?.items ?? [];
      return data.map(mapTeam) as TeamOption[];
    },

    async getGroupDetail(id: string) {
      const response = await httpRequest<any>(`/groups/${id}`);
      return mapTeam(response?.data ?? {});
    },

    async createGroup(payload: {
      name: string;
      description?: string;
      organization_id?: string;
      organization_ids?: string[];
      primary_organization_id?: string;
      group_type?: string;
    }) {
      const response = await httpRequest<any>("/groups", {
        method: "POST",
        body: payload,
      });
      return response?.data as Record<string, unknown>;
    },

    async updateGroup(
      id: string,
      payload: {
        name?: string;
        description?: string;
        organization_id?: string;
        organization_ids?: string[];
        primary_organization_id?: string;
        is_active?: boolean;
        group_type?: string;
      }
    ) {
      const response = await httpRequest<any>(`/groups/${id}`, {
        method: "POST",
        body: payload,
      });
      return response?.data as Record<string, unknown>;
    },

    async addGroupMember(
      id: string,
      payload: { user_id: string; role: "member" | "lead" | "manager"; organization_ids?: string[] }
    ) {
      const response = await httpRequest<any>(`/groups/${id}/members`, {
        method: "POST",
        body: payload,
      });
      return response?.data as Record<string, unknown>;
    },

    async removeGroupMember(id: string, userId: string) {
      const response = await httpRequest<any>(`/groups/${id}/members/${userId}`, {
        method: "DELETE",
      });
      return response?.data as Record<string, unknown>;
    },

    async setGroupOrganizations(
      id: string,
      payload: { organization_ids: string[]; primary_organization_id?: string }
    ) {
      const response = await httpRequest<any>(`/groups/${id}/organizations`, {
        method: "POST",
        body: payload,
      });
      return response?.data as Record<string, unknown>;
    },

    async setGroupMemberScopes(
      id: string,
      userId: string,
      payload: { organization_ids: string[]; scope_role?: string }
    ) {
      const response = await httpRequest<any>(`/groups/${id}/members/${userId}/scopes`, {
        method: "POST",
        body: payload,
      });
      return response?.data as Record<string, unknown>;
    },

    async listProjects(params?: {
      active_only?: boolean;
      search?: string;
    }) {
      const query = new URLSearchParams();
      if (params?.active_only !== undefined) {
        query.set("active_only", params.active_only ? "true" : "false");
      }
      if (params?.search) query.set("search", params.search);
      const qs = query.toString();
      const path = qs ? `/projects?${qs}` : "/projects";
      const response = await httpRequest<any>(path);
      const data = (response as any)?.data?.items ?? [];
      return data.map((item: any) => ({
        id: String(item.id),
        name: String(item.name ?? ""),
        description: item.description ?? null,
        isActive: Boolean(item.isActive ?? item.is_active ?? true),
        organizationId: item.organizationId ?? item.organization_id ?? null,
        governance: item.governance ?? null,
      }));
    },

    async getProject(id: string) {
      const response = await httpRequest<any>(`/projects/${id}`);
      const item = Array.isArray(response) ? response[0] : response?.data ?? response;
      return {
        id: String(item.id),
        name: String(item.name ?? ""),
        description: item.description ?? null,
        isActive: Boolean(item.isActive ?? item.is_active ?? true),
        organizationId: item.organizationId ?? item.organization_id ?? null,
        governance: item.governance ?? null,
      };
    },

    async createProject(payload: {
      name: string;
      description?: string;
      organization_id?: string;
      owner_user_id?: string;
      project_code?: string;
      start_date?: string;
      end_date?: string;
      governance_status?: string;
    }) {
      const response = await httpRequest<any>("/projects", {
        method: "POST",
        body: payload,
      });
      return response?.data as Record<string, unknown>;
    },

    async updateProject(
      id: string,
      payload: {
        name?: string;
        description?: string;
        is_active?: boolean;
        owner_user_id?: string;
        project_code?: string;
        start_date?: string;
        end_date?: string;
        governance_status?: string;
      }
    ) {
      const response = await httpRequest<any>(`/projects/${id}`, {
        method: "POST",
        body: payload,
      });
      return response?.data as Record<string, unknown>;
    },

    async archiveProject(id: string) {
      const response = await httpRequest<any>(`/projects/${id}/archive`, {
        method: "POST",
      });
      return response?.data as Record<string, unknown>;
    },

    async unarchiveProject(id: string) {
      const response = await httpRequest<any>(`/projects/${id}/unarchive`, {
        method: "POST",
      });
      return response?.data as Record<string, unknown>;
    },

    async listFiles(params?: {
      search?: string;
      include_usage?: boolean;
      page?: number;
      per_page?: number;
      file_type?: "images" | "videos" | "documents";
      attached?: boolean;
    }) {
      const query = new URLSearchParams();
      if (params?.search) query.set("search", params.search);
      if (params?.include_usage) query.set("include_usage", "true");
      if (params?.page) query.set("page", String(params.page));
      if (params?.per_page) query.set("per_page", String(params.per_page));
      if (params?.file_type) query.set("file_type", params.file_type);
      if (params?.attached !== undefined) query.set("attached", String(params.attached));
      const qs = query.toString();
      const path = qs ? `/files?${qs}` : "/files";
      const response = await httpRequest<any>(path);
      const inner = response?.data ?? response;
      const rows = Array.isArray(inner?.result) ? inner.result
        : Array.isArray(inner?.items) ? inner.items
        : Array.isArray(inner) ? inner
        : [];
      return {
        result: rows.map((row: any) => ({
          id: String(row.id),
          file_name: String(row.file_name ?? row.fileName ?? ""),
          mime_type: row.mime_type ?? row.mimeType ?? null,
          file_size: row.file_size ?? row.fileSize ?? null,
          storage_path: String(row.storage_path ?? row.storagePath ?? ""),
          public_url: row.public_url ?? row.publicUrl ?? null,
          usage: row.usage ? {
            attached: Boolean(row.usage.attached),
            request_items: Number(row.usage.request_items ?? 0),
            pv_evidence: Number(row.usage.pv_evidence ?? 0),
            retirement_refs: Number(row.usage.retirement_refs ?? 0),
          } : undefined,
        })),
        total: Number(inner?.total ?? inner?.meta?.total ?? rows.length),
        total_result: Number(inner?.total_result ?? inner?.total ?? inner?.meta?.total ?? rows.length),
        per_page: Number(inner?.per_page ?? inner?.meta?.per_page ?? params?.per_page ?? 20),
        page: Number(inner?.page ?? inner?.meta?.page ?? params?.page ?? 1),
        pages: Number(inner?.pages ?? inner?.meta?.pages ?? 1),
      };
    },

    async uploadFile(file: File, options?: { organization_id?: string; metadata?: Record<string, unknown> }) {
      const form = new FormData();
      form.append("file", file);
      if (options?.organization_id) form.append("organization_id", options.organization_id);
      if (options?.metadata) form.append("metadata_json", JSON.stringify(options.metadata));
      const response = await httpRequest<any>("/files/upload", {
        method: "POST",
        body: form,
      });
      const row = response?.data ?? response;
      return {
        id: String(row.id),
        file_name: String(row.file_name ?? row.fileName ?? file.name),
        mime_type: row.mime_type ?? row.mimeType ?? file.type ?? null,
        file_size: row.file_size ?? row.fileSize ?? file.size,
        storage_path: String(row.storage_path ?? row.storagePath ?? ""),
        public_url: row.public_url ?? row.publicUrl ?? null,
      };
    },

    async deleteFile(fileId: string) {
      const response = await httpRequest<any>(`/files/${fileId}`, {
        method: "DELETE",
      });
      return response?.data as { success: boolean };
    },

    async listChartAccounts(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value != null && value !== "") query.set(key, String(value));
        });
      }
      const qs = query.toString();
      const path = qs ? `/finance/chart-accounts?${qs}` : "/finance/chart-accounts";
      const response = await httpRequest<any>(path);
      const rows = (response as any)?.data?.items ?? [];
      return rows.map((row: any) => ({
        id: String(row.id),
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        type: String(row.type ?? "asset"),
        category: String(row.category ?? ""),
        normal_balance: String(row.normal_balance ?? "debit"),
        is_control_account: Boolean(row.is_control_account),
        is_active: Boolean(row.is_active ?? true),
        finance_account: row.finance_account ? {
          id: String(row.finance_account.id),
          name: String(row.finance_account.name ?? ""),
          code: row.finance_account.code ?? null,
          account_type: String(row.finance_account.account_type ?? ""),
        } : null,
        organization: row.organization ? {
          id: String(row.organization.id),
          name: String(row.organization.name ?? ""),
          code: String(row.organization.code ?? ""),
        } : null,
      }));
    },

    async createChartAccount(payload: {
      code: string;
      name: string;
      type: string;
      category?: string;
      normal_balance?: string;
      is_control_account?: boolean;
      is_active?: boolean;
    }) {
      const response = await httpRequest<any>("/finance/chart-accounts", {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async updateChartAccount(id: string, payload: {
      code?: string;
      name?: string;
      type?: string;
      category?: string;
      normal_balance?: string;
      is_control_account?: boolean;
      is_active?: boolean;
    }) {
      const response = await httpRequest<any>(`/finance/chart-accounts/${id}`, {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async listFinanceAccounts(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value != null && value !== "") query.set(key, String(value));
        });
      }
      const qs = query.toString();
      const path = qs ? `/finance/accounts?${qs}` : "/finance/accounts";
      const response = await httpRequest<any>(path);
      const inner2 = response?.data ?? response;
      const rows = Array.isArray(inner2?.result) ? inner2.result
        : Array.isArray(inner2?.items) ? inner2.items
        : Array.isArray(inner2) ? inner2
        : [];
      return {
        result: rows.map((row: any) => ({
          id: String(row.id),
          name: String(row.name ?? ""),
          code: row.code ?? null,
          account_type: String(row.account_type ?? "bank"),
          bank_name: row.bank_name ?? null,
          account_name: row.account_name ?? null,
          account_number: row.account_number ?? null,
          branch_name: row.branch_name ?? null,
          currency: String(row.currency ?? "NGN"),
          opening_balance: Number(row.opening_balance ?? 0),
          current_balance: Number(row.current_balance ?? 0),
          is_active: Boolean(row.is_active ?? row.isActive ?? true),
        })),
        total: Number(inner2?.total ?? inner2?.meta?.total ?? rows.length),
        total_result: Number(inner2?.total_result ?? inner2?.total ?? inner2?.meta?.total ?? rows.length),
        per_page: Number(inner2?.per_page ?? inner2?.meta?.per_page ?? 20),
        page: Number(inner2?.page ?? inner2?.meta?.page ?? 1),
        pages: Number(inner2?.pages ?? inner2?.meta?.pages ?? 1),
      };
    },

    async createFinanceAccount(payload: {
      name: string;
      code?: string;
      account_type?: string;
      bank_name?: string;
      account_name?: string;
      account_number?: string;
      branch_name?: string;
      currency?: string;
      opening_balance?: number;
      is_active?: boolean;
    }) {
      const response = await httpRequest<any>("/finance/accounts", {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async updateFinanceAccount(id: string, payload: {
      name?: string;
      code?: string;
      account_type?: string;
      bank_name?: string;
      account_name?: string;
      account_number?: string;
      branch_name?: string;
      currency?: string;
      opening_balance?: number;
      is_active?: boolean;
    }) {
      const response = await httpRequest<any>(`/finance/accounts/${id}`, {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async listFinanceIncome(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/income?${qs}` : "/finance/income");
      const _income = response?.data ?? response;
      if (!_income || typeof _income !== "object" || Array.isArray(_income) || !Array.isArray(_income.result)) {
        throw new Error("/finance/income must return paginated result.");
      }
      const rows = _income.result.map((row: any) => ({
        id: String(row.id),
        account_id: String(row.account_id ?? ""),
        account_name: row.account_name ?? "",
        amount: Number(row.amount ?? 0),
        currency: String(row.currency ?? "NGN"),
        received_at: row.received_at ?? null,
        reference: row.reference ?? null,
        payer: row.payer ?? null,
        notes: row.notes ?? null,
        fund_id: row.fund_id ?? null,
        grant_id: row.grant_id ?? null,
        pledge_id: row.pledge_id ?? null,
        receipt_number: row.receipt_number ?? null,
        file: row.file ?? null,
      }));
      return {
        result: rows,
        total: Number(_income.total ?? 0),
        total_result: Number(_income.total_result ?? 0),
        per_page: Number(_income.per_page ?? 20),
        page: Number(_income.page ?? 1),
        pages: Number(_income.pages ?? 1),
      };
    },

    async createFinanceIncome(payload: {
      account_id: string;
      amount: number;
      currency?: string;
      received_at?: string;
      reference?: string;
      payer?: string;
      notes?: string;
      file_id?: string;
      fund_id?: string;
      grant_id?: string;
      pledge_id?: string;
      donor_id?: string;
    }) {
      const response = await httpRequest<any>("/finance/income", {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async listFinanceBills(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/bills?${qs}` : "/finance/bills");
      const _bills = response?.data ?? response;
      if (!_bills || typeof _bills !== "object" || Array.isArray(_bills) || !Array.isArray(_bills.result)) {
        throw new Error("/finance/bills must return paginated result.");
      }
      return {
        result: _bills.result,
        total: Number(_bills.total ?? 0),
        total_result: Number(_bills.total_result ?? 0),
        per_page: Number(_bills.per_page ?? 20),
        page: Number(_bills.page ?? 1),
        pages: Number(_bills.pages ?? 1),
      };
    },

    async createFinanceBill(payload: Record<string, unknown>) {
      const response = await httpRequest<any>("/finance/bills", {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async listSalesInvoices(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/sales-invoices?${qs}` : "/finance/sales-invoices");
      const _invoices = response?.data ?? response;
      if (!_invoices || typeof _invoices !== "object" || Array.isArray(_invoices) || !Array.isArray(_invoices.result)) {
        throw new Error("/finance/sales-invoices must return paginated result.");
      }
      return {
        result: _invoices.result,
        total: Number(_invoices.total ?? 0),
        total_result: Number(_invoices.total_result ?? 0),
        per_page: Number(_invoices.per_page ?? 20),
        page: Number(_invoices.page ?? 1),
        pages: Number(_invoices.pages ?? 1),
      };
    },

    async createSalesInvoice(payload: Record<string, unknown>) {
      const response = await httpRequest<any>("/finance/sales-invoices", {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async listFinanceVendors(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/vendors?${qs}` : "/finance/vendors");
      const rows = (response as any)?.data?.items ?? [];
      return rows;
    },

    async listFinanceItems(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/items?${qs}` : "/finance/items");
      const _items = response?.data ?? response;
      if (!_items || typeof _items !== "object" || Array.isArray(_items) || !Array.isArray(_items.result)) {
        throw new Error("/finance/items must return paginated result.");
      }
      return {
        result: _items.result,
        total: Number(_items.total ?? 0),
        total_result: Number(_items.total_result ?? 0),
        per_page: Number(_items.per_page ?? 50),
        page: Number(_items.page ?? 1),
        pages: Number(_items.pages ?? 1),
      };
    },

    async createFinanceItem(payload: Record<string, unknown>) {
      const response = await httpRequest<any>("/finance/items", {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async updateFinanceItem(id: string, payload: Record<string, unknown>) {
      const response = await httpRequest<any>(`/finance/items/${id}`, {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async listFinanceExpenses(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/expenses?${qs}` : "/finance/expenses");
      const _expenses = response?.data ?? response;
      if (!_expenses || typeof _expenses !== "object" || Array.isArray(_expenses) || !Array.isArray(_expenses.result)) {
        throw new Error("/finance/expenses must return paginated result.");
      }
      return {
        result: _expenses.result,
        total: Number(_expenses.total ?? 0),
        total_result: Number(_expenses.total_result ?? 0),
        per_page: Number(_expenses.per_page ?? 50),
        page: Number(_expenses.page ?? 1),
        pages: Number(_expenses.pages ?? 1),
      };
    },

    async createFinanceExpense(payload: Record<string, unknown>) {
      const response = await httpRequest<any>("/finance/expenses", {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    async updateFinanceExpense(id: string, payload: Record<string, unknown>) {
      const response = await httpRequest<any>(`/finance/expenses/${id}`, {
        method: "POST",
        body: payload,
      });
      return response?.data;
    },

    // ── Donors ────────────────────────────────────────────────────────────────

    async listFinanceDonors(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/donors?${qs}` : "/finance/donors");
      const _d = response?.data ?? response;
      return { result: _d.result ?? [], total: Number(_d.total ?? 0), total_result: Number(_d.total_result ?? 0), per_page: Number(_d.per_page ?? 20), page: Number(_d.page ?? 1), pages: Number(_d.pages ?? 1) };
    },

    async createFinanceDonor(payload: { name: string; donor_type?: string; email?: string; phone?: string; address?: string }) {
      const response = await httpRequest<any>("/finance/donors", { method: "POST", body: payload });
      return response?.data;
    },

    async updateFinanceDonor(id: string, payload: Record<string, unknown>) {
      const response = await httpRequest<any>(`/finance/donors/${id}`, { method: "PUT", body: payload });
      return response?.data;
    },

    async deleteFinanceDonor(id: string) {
      const response = await httpRequest<any>(`/finance/donors/${id}`, { method: "DELETE" });
      return response?.data;
    },

    // ── Grants ────────────────────────────────────────────────────────────────

    async listFinanceGrants(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/grants?${qs}` : "/finance/grants");
      const _g = response?.data ?? response;
      return { result: _g.result ?? [], total: Number(_g.total ?? 0), total_result: Number(_g.total_result ?? 0), per_page: Number(_g.per_page ?? 20), page: Number(_g.page ?? 1), pages: Number(_g.pages ?? 1) };
    },

    async createFinanceGrant(payload: Record<string, unknown>) {
      const response = await httpRequest<any>("/finance/grants", { method: "POST", body: payload });
      return response?.data;
    },

    async updateFinanceGrant(id: string, payload: Record<string, unknown>) {
      const response = await httpRequest<any>(`/finance/grants/${id}`, { method: "PUT", body: payload });
      return response?.data;
    },

    // ── Funds ─────────────────────────────────────────────────────────────────

    async listFinanceFunds(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/funds?${qs}` : "/finance/funds");
      const _f = response?.data ?? response;
      return { result: _f.result ?? [], total: Number(_f.total ?? 0), total_result: Number(_f.total_result ?? 0), per_page: Number(_f.per_page ?? 20), page: Number(_f.page ?? 1), pages: Number(_f.pages ?? 1) };
    },

    // ── Pledges ───────────────────────────────────────────────────────────────

    async listFinancePledges(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") query.set(k, String(v)); });
      const qs = query.toString();
      const response = await httpRequest<any>(qs ? `/finance/pledges?${qs}` : "/finance/pledges");
      const _p = response?.data ?? response;
      return { result: _p.result ?? [], total: Number(_p.total ?? 0), total_result: Number(_p.total_result ?? 0), per_page: Number(_p.per_page ?? 20), page: Number(_p.page ?? 1), pages: Number(_p.pages ?? 1) };
    },

    async createFinancePledge(payload: {
      donor_id: string;
      amount: number;
      pledged_at: string;
      grant_id?: string;
      fund_id?: string;
      currency?: string;
      expected_at?: string;
      purpose?: string;
      notes?: string;
    }) {
      const response = await httpRequest<any>("/finance/pledges", { method: "POST", body: payload });
      return response?.data;
    },

    async updateFinancePledge(id: string, payload: Record<string, unknown>) {
      const response = await httpRequest<any>(`/finance/pledges/${id}`, { method: "PUT", body: payload });
      return response?.data;
    },

    async deleteFinancePledge(id: string) {
      const response = await httpRequest<any>(`/finance/pledges/${id}`, { method: "DELETE" });
      return response?.data;
    },

    async downloadPledgeAcknowledgment(id: string) {
      const response = await httpRequest<any>(`/finance/pledges/${id}/acknowledgment`);
      return response?.data as { job_id: string };
    },

    async downloadFunderReceipt(id: string) {
      const response = await httpRequest<any>(`/finance/income/${id}/receipt`);
      return response?.data as { job_id: string };
    },
  };
}
