// apps/shared/src/api/hr-api.ts
import type { HttpRequest } from "../auth/http-client";

export type EmploymentType = 'full_time' | 'contract' | 'intern' | 'consultant';
export type EmploymentStatus = 'draft' | 'active' | 'suspended' | 'exited';
export type WorkMode = 'onsite' | 'hybrid' | 'remote';
export type EmployeeAction = 'activate' | 'suspend' | 'exit';

export type EmployeeSummary = {
  id: string;
  user_id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
  status: string;
  type: string;
  employee_code?: string | null;
  job_title?: string | null;
  employment_type?: EmploymentType | null;
  employment_status?: EmploymentStatus | null;
  work_mode?: WorkMode | null;
  hire_date?: string | null;
  primary_organization?: { id: string; name: string } | null;
  primary_team?: { id: string; name: string } | null;
  organizations?: any[];
  teams?: any[];
  roles?: any[];
};

export type EmployeeDetail = EmployeeSummary & {
  job_description?: string | null;
  designation_id?: string | null;
  manager?: { id: string; first_name?: string; last_name?: string; email: string | null } | null;
  confirmation_date?: string | null;
  exit_date?: string | null;
  metadata?: Record<string, unknown>;
};

export type HrSummary = {
  total: number;
  active: number;
  draft: number;
  suspended: number;
  exited: number;
  by_employment_type: Record<string, number>;
  recent_hires: EmployeeSummary[];
};

/**
 * Standard normalizer for employee objects
 */
export function normalizeEmployee(raw: any): EmployeeSummary {
  const p = raw?.employee_profile || raw;
  const firstName = raw?.first_name ?? p?.firstName ?? p?.first_name ?? "";
  const lastName = raw?.last_name ?? p?.lastName ?? p?.last_name ?? "";

  return {
    id: String(raw?.id || ""),
    user_id: String(raw?.id || ""),
    username: String(raw?.username || ""),
    email: String(raw?.email || ""),
    first_name: firstName || null,
    last_name: lastName || null,
    phone: String(raw?.phone || p?.phone || ""),
    status: String(raw?.status || p?.status || "draft"),
    type: String(raw?.type || p?.type || "staff"),
    employee_code: p?.employeeCode ?? p?.employee_code ?? null,
    job_title: p?.jobTitle ?? p?.job_title ?? null,
    employment_type: p?.employmentType ?? p?.employment_type ?? null,
    employment_status: p?.employmentStatus ?? p?.employment_status ?? null,
    work_mode: p?.workMode ?? p?.work_mode ?? null,
    hire_date: p?.hireDate ?? p?.hire_date ?? null,
    primary_organization: p?.primaryOrganization ?? p?.primary_organization ?? null,
    primary_team: p?.primaryTeam ?? p?.primary_team ?? null,
    organizations: raw?.organizations,
    teams: raw?.teams,
    roles: (raw?.roles || []).map((r: any) => typeof r === 'string' ? r : (r.slug || r.name)),
  };
}

export function normalizeEmployeeDetail(raw: any): EmployeeDetail {
  const base = normalizeEmployee(raw);
  const p = raw?.employee_profile || raw;
  const manager = p?.manager;

  return {
    ...base,
    job_description: p?.jobDescription ?? p?.job_description ?? null,
    designation_id: p?.designationId ?? p?.designation_id ?? null,
    manager: manager ? {
      id: manager.id,
      first_name: manager.firstName ?? manager.first_name,
      last_name: manager.lastName ?? manager.last_name,
      email: manager.email,
    } : null,
    confirmation_date: p?.confirmationDate ?? p?.confirmation_date ?? null,
    exit_date: p?.exitDate ?? p?.exit_date ?? null,
    metadata: p?.meta || p?.metadata,
  };
}

export function createHrApi(httpRequest: HttpRequest) {
  return {
    async getSummary() {
      return httpRequest<HrSummary>('/hr/summary');
    },

    async listEmployees(params?: Record<string, unknown>) {
      const query = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value != null && value !== '') query.set(key, String(value));
        });
      }
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const response = await httpRequest<any>(`/hr/employees${suffix}`);
      const inner = response?.data ?? response;
      const rawList = Array.isArray(inner?.result) ? inner.result
        : Array.isArray(inner?.items) ? inner.items
        : Array.isArray(inner) ? inner
        : [];
      return {
        result: rawList.map(normalizeEmployee),
        total: Number(inner?.total ?? inner?.meta?.total ?? rawList.length),
        total_result: Number(inner?.total_result ?? inner?.total ?? inner?.meta?.total ?? rawList.length),
        per_page: Number(inner?.per_page ?? inner?.meta?.per_page ?? 20),
        page: Number(inner?.page ?? inner?.meta?.page ?? 1),
        pages: Number(inner?.pages ?? inner?.meta?.pages ?? 1)
      };
    },

    async getEmployee(id: string) {
      const raw = await httpRequest<any>(`/hr/employees/${id}`);
      return normalizeEmployeeDetail(raw?.data ?? raw);
    },

    async createEmployee(dto: any) {
      const raw = await httpRequest<any>('/hr/employees', {
        method: 'POST',
        body: dto,
      });
      return normalizeEmployeeDetail(raw?.data ?? raw);
    },

    async updateEmployee(id: string, dto: any) {
      const raw = await httpRequest<any>(`/hr/employees/${id}`, {
        method: 'PATCH',
        body: dto,
      });
      return normalizeEmployeeDetail(raw?.data ?? raw);
    },

    async runAction(id: string, dto: { action: EmployeeAction; effective_date?: string; notes?: string }) {
      const raw = await httpRequest<any>(`/hr/employees/${id}/action`, {
        method: 'PATCH',
        body: dto,
      });
      return normalizeEmployeeDetail(raw?.data ?? raw);
    },

    async getMyOnboarding() {
      const raw = await httpRequest<any>('/onboarding');
      return raw?.data ?? raw;
    },

    async updateMyOnboarding(dto: { action: 'save_profile' | 'save_contacts' | 'complete_step'; step_key?: string; payload?: Record<string, unknown> }) {
      const raw = await httpRequest<any>('/onboarding', { method: 'POST', body: dto });
      return raw?.data ?? raw;
    },

    async submitOnboardingForm(formId: string, payload?: Record<string, unknown>) {
      const raw = await httpRequest<any>('/onboarding/forms', {
        method: 'POST',
        body: { form_id: formId, payload },
      });
      return raw?.data ?? raw;
    },

    async addOrganization(id: string, dto: { organization_id: string; is_primary?: boolean }) {
      return httpRequest<void>(`/hr/employees/${id}/organizations`, {
        method: 'POST',
        body: dto,
      });
    },

    async removeOrganization(id: string, orgId: string) {
      return httpRequest<void>(`/hr/employees/${id}/organizations/${orgId}`, {
        method: 'DELETE',
      });
    },

    async addTeam(id: string, dto: { team_id: string; role?: 'member' | 'lead' | 'manager' }) {
      return httpRequest<void>(`/hr/employees/${id}/teams`, {
        method: 'POST',
        body: dto,
      });
    },

    async removeTeam(id: string, teamId: string) {
      return httpRequest<void>(`/hr/employees/${id}/teams/${teamId}`, {
        method: 'DELETE',
      });
    },

    async requestUserCreation(dto: {
      email: string;
      first_name?: string;
      last_name?: string;
      job_title?: string;
      organization_id?: string;
      employment_type?: EmploymentType;
      hire_date?: string;
    }) {
      return httpRequest<{ id: string; status: string }>('/hr/user-requests', {
        method: 'POST',
        body: dto,
      });
    },

    async listDesignations() {
      const response = await httpRequest<any>('/hr/designations');
      return response?.data ?? response ?? [];
    },

    async getDesignation(id: string) {
      const response = await httpRequest<any>(`/hr/designations/${id}`);
      return response?.data ?? response;
    },

    async createDesignation(dto: { name: string; code?: string; description?: string; job_description?: string }) {
      const response = await httpRequest<any>('/hr/designations', {
        method: 'POST',
        body: dto,
      });
      return response?.data ?? response;
    },

    async updateDesignation(id: string, dto: { name?: string; code?: string; description?: string; job_description?: string }) {
      const response = await httpRequest<any>(`/hr/designations/${id}`, {
        method: 'PUT',
        body: dto,
      });
      return response?.data ?? response;
    },

    async deleteDesignation(id: string) {
      return httpRequest<any>(`/hr/designations/${id}`, {
        method: 'DELETE',
      });
    }
  };
}
