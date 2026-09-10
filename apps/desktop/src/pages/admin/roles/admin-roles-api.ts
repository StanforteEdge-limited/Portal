import { httpRequest } from "@/shared/lib/core";

export type Role = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  permissions?: RolePermission[];
  users?: Array<{ profile_id: string; email: string; username: string }>;
  created_at?: string;
};

export type RolePermission = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  module?: string;
};

export type RoleResponse = {
  data: Role[];
  meta?: {
    page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
};

export async function listRoles(params?: {
  page?: number;
  per_page?: number;
  search?: string;
}): Promise<Role[]> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.per_page) query.set("per_page", String(params.per_page));
  if (params?.search) query.set("search", params.search);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const data = await httpRequest<any>(`/admin/rbac/roles${suffix}`);
  return (data as any)?.data?.items ?? [];
}

export async function createRole(payload: {
  name: string;
  slug: string;
  description?: string;
  permission_ids?: string[];
}): Promise<Role> {
  const res = await httpRequest<any>("/admin/rbac/roles", {
    method: "POST",
    body: payload,
  });
  return (res?.data ?? res) as Role;
}

export async function updateRole(
  id: string,
  payload: {
    name?: string;
    description?: string;
    is_active?: boolean;
    permission_ids?: string[];
  },
): Promise<Role> {
  const res = await httpRequest<any>(`/admin/rbac/roles/${id}`, {
    method: "POST",
    body: payload,
  });
  return (res?.data ?? res) as Role;
}

export async function deleteRole(id: string): Promise<void> {
  return httpRequest<void>(`/admin/rbac/roles/${id}`, {
    method: "DELETE",
  });
}

export async function getRoleDeleteImpact(id: string): Promise<{
  affected_users: number;
  users: Array<{ profile_id: string; email: string; username: string }>;
}> {
  const res = await httpRequest<any>(`/admin/rbac/roles/${id}/delete-impact`);
  return (res?.data ?? res) as {
    affected_users: number;
    users: Array<{ profile_id: string; email: string; username: string }>;
  };
}

export async function listPermissions(): Promise<RolePermission[]> {
  const data = await httpRequest<any>("/admin/rbac/permissions");
  return data ?? [];
}

export async function createPermission(payload: {
  name: string;
  slug: string;
  description?: string;
  module?: string;
}): Promise<RolePermission> {
  return httpRequest<RolePermission>("/admin/rbac/permissions", {
    method: "POST",
    body: payload,
  });
}

export async function updatePermission(
  id: string,
  payload: {
    name?: string;
    description?: string;
    module?: string;
  },
): Promise<RolePermission> {
  return httpRequest<RolePermission>(`/admin/rbac/permissions/${id}`, {
    method: "POST",
    body: payload,
  });
}

export async function deletePermission(id: string): Promise<{ success: boolean; affected_roles: number }> {
  return httpRequest<{ success: boolean; affected_roles: number }>(`/admin/rbac/permissions/${id}`, {
    method: "DELETE",
  });
}

export async function getPermissionDeleteImpact(id: string): Promise<{
  affected_roles: number;
  roles: Array<{ id: string; name: string }>;
}> {
  const res = await httpRequest<any>(`/admin/rbac/permissions/${id}/delete-impact`);
  return (res?.data ?? res) as {
    affected_roles: number;
    roles: Array<{ id: string; name: string }>;
  };
}
