import type { HttpRequest } from "../auth/http-client";
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserRole,
  AdminUsersResponse,
  AssignUserRoles,
  BulkCreateUsers,
  CreateAdminUser,
  PaginationMeta,
  RoleOption,
  UpdateAdminUser,
  UpdateUserStatus,
  UserRolesResponse,
} from "@stanforte/contract";

export type {
  AdminUser,
  AdminUserDetail,
  AdminUserRole,
  AdminUsersResponse,
  PaginationMeta,
  RoleOption,
  UserRolesResponse,
};

export type AdminUsersPage = {
  data: AdminUser[];
  /** Normalized for the UI: the wire's `pages` count is exposed as `last_page`. */
  meta: Omit<PaginationMeta, "pages"> & { last_page: number };
};

export type BulkCreateUsersResult = {
  successCount: number;
  failedCount: number;
  results: { identifier: string; status: "success" | "failed"; error?: string }[];
};

export function createAdminUsersApi(httpRequest: HttpRequest) {
  return {
    async listUsers(params?: {
      page?: number;
      per_page?: number;
      search?: string;
      status?: string;
      type?: string;
      organization_id?: string;
    }): Promise<AdminUsersPage> {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", String(params.page));
      if (params?.per_page) query.set("per_page", String(params.per_page));
      if (params?.search) query.set("search", params.search);
      if (params?.status) query.set("status", params.status);
      if (params?.type) query.set("type", params.type);
      if (params?.organization_id) query.set("organization_id", params.organization_id);
      const suffix = query.toString() ? `?${query.toString()}` : "";
      // Paginated responses keep their envelope, so `data.items` / `data.meta` are reachable.
      const res = await httpRequest<AdminUsersResponse>(`/admin/users${suffix}`);
      const m = res?.data?.meta;
      return {
        data: res?.data?.items ?? [],
        meta: {
          page: m?.page ?? 1,
          per_page: m?.per_page ?? 20,
          total: m?.total ?? 0,
          last_page: m?.pages ?? 1,
        },
      };
    },

    // Every method below hits a non-paginated endpoint, so `httpRequest` has
    // already unwrapped the `{ success, data }` envelope for us.
    getUser(id: string): Promise<AdminUserDetail> {
      return httpRequest<AdminUserDetail>(`/admin/users/${id}`);
    },

    createUser(payload: CreateAdminUser): Promise<AdminUser> {
      return httpRequest<AdminUser>("/admin/users", {
        method: "POST",
        body: payload,
      });
    },

    createBulkUsers(payload: BulkCreateUsers): Promise<BulkCreateUsersResult> {
      return httpRequest<BulkCreateUsersResult>("/admin/users/bulk", {
        method: "POST",
        body: payload,
      });
    },

    updateUser(id: string, payload: UpdateAdminUser): Promise<AdminUser> {
      return httpRequest<AdminUser>(`/admin/users/${id}`, {
        method: "POST",
        body: payload,
      });
    },

    updateUserStatus(id: string, payload: UpdateUserStatus): Promise<AdminUser> {
      return httpRequest<AdminUser>(`/admin/users/${id}/status`, {
        method: "POST",
        body: payload,
      });
    },

    getUserRoles(id: string): Promise<UserRolesResponse> {
      return httpRequest<UserRolesResponse>(`/users/${id}/roles`);
    },

    setUserRoles(id: string, roles: AssignUserRoles["roles"]): Promise<void> {
      const payload: AssignUserRoles = { roles };
      return httpRequest<void>(`/users/${id}/roles`, {
        method: "POST",
        body: payload,
      });
    },

    sendUserInvite(id: string, message?: string): Promise<{ success: boolean; expires_at: string }> {
      return httpRequest(`/users/${id}/invite`, { method: "POST", body: message ? { message } : {} });
    },

    async searchUsers(query: string): Promise<AdminUser[]> {
      const q = new URLSearchParams({ search: query, per_page: "20" }).toString();
      const res = await httpRequest<AdminUsersResponse>(`/admin/users?${q}`);
      return res?.data?.items ?? [];
    },

    async listRoleOptions(): Promise<RoleOption[]> {
      try {
        const data = await httpRequest<{ data: { items: RoleOption[] } }>("/admin/rbac/roles");
        return data?.data?.items ?? [];
      } catch {
        return [
          { id: "staff", slug: "staff", name: "Staff" },
          { id: "hr_manager", slug: "hr_manager", name: "HR Manager" },
          { id: "accountant", slug: "accountant", name: "Accountant" },
          { id: "finance_manager", slug: "finance_manager", name: "Finance Manager" },
          { id: "admin", slug: "admin", name: "Admin" },
        ];
      }
    },
  };
}

export type AdminUsersApi = ReturnType<typeof createAdminUsersApi>;
