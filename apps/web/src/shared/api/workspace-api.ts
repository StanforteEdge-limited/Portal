import { httpRequest } from "@/shared/lib/core";

export type WorkspaceProfile = {
  id: string;
  username: string;
  email: string;
  type: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  nationality?: string | null;
  state?: string | null;
  lga?: string | null;
  marital_status?: string | null;
  bio?: string | null;
  occupation?: string | null;
  organizations?: Array<{ id: string; name: string; code: string; is_primary?: boolean }>;
  groups?: Array<{ id: string; name: string; type: string; role: string; is_primary?: boolean }>;
  employee_profile?: {
    employee_code?: string | null;
    job_title?: string | null;
    employment_status?: string | null;
    manager?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    } | null;
  } | null;
  teams?: Array<{ id: string; name: string; type: string; role: string }>;
  projects?: Array<{ id: string; name: string; type: string; role: string }>;
  onboarding_progress?: {
    status?: string;
  } | null;
  signature_url?: string | null;
};

export type WorkspaceNotification = {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  status: "read" | "unread";
  createdAt: string;
  updatedAt?: string;
  readAt?: string | null;
  archivedAt?: string | null;
  sentVia?: string[];
  notifiableType?: string | null;
  notifiableId?: string | null;
  data?: Record<string, unknown> | null;
};

export async function getWorkspaceProfile() {
  const res = await httpRequest<any>("/profile");
  return (res?.data ?? res) as WorkspaceProfile;
}

export async function updateWorkspaceProfile(payload: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  occupation?: string;
  bio?: string;
  address?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  state?: string;
  lga?: string;
  marital_status?: string;
  signature_file_id?: string;
}) {
  const res = await httpRequest<any>("/profile", {
    method: "PATCH",
    body: payload,
  });
  return (res?.data ?? res) as WorkspaceProfile;
}

export async function changeWorkspacePassword(payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}) {
  return httpRequest("/auth/change-password", {
    method: "POST",
    body: payload,
  });
}

export async function listWorkspaceNotifications(status?: "read" | "unread") {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await httpRequest<any>(`/notifications${suffix}`);
  return (res as any)?.data?.items ?? [];
}

export async function getWorkspaceUnreadNotificationCount() {
  const res = await httpRequest<any>("/notifications/unread-count");
  const val = res?.data ?? res;
  return (typeof val === "number" ? val : 0) as number;
}

export async function markWorkspaceNotificationRead(id: string) {
  return httpRequest(`/notifications/${id}/read`, {
    method: "PUT",
  });
}

export async function markAllWorkspaceNotificationsRead() {
  return httpRequest("/notifications/mark-all-read", {
    method: "PUT",
  });
}
