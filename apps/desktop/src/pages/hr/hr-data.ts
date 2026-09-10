import type { SidebarItem } from "@/shared";

export const hrNavigation: SidebarItem[] = [
  { label: "Overview", icon: "dashboard", path: "/hr" },
  { label: "Employees", icon: "group", path: "/hr/employees" },
  { label: "Attendance", icon: "pending_actions", path: "/hr/attendance" },
  { label: "Leave", icon: "event_available", path: "/hr/leave" },
];

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  contract: "Contract",
  intern: "Intern",
  consultant: "Consultant",
};

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  suspended: "Suspended",
  exited: "Exited",
};

export const WORK_MODE_LABELS: Record<string, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export function statusTone(status?: string | null): StatusTone {
  switch (status) {
    case "active": return "success";
    case "draft": return "warning";
    case "suspended": return "danger";
    case "exited": return "neutral";
    default: return "neutral";
  }
}

export function formatEmployeeName(e: { first_name?: string | null; last_name?: string | null }) {
  return [e.first_name, e.last_name].filter(Boolean).join(" ") || "—";
}
