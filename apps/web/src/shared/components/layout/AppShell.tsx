import type { ReactNode } from "react";
import { PortalLayout, type NavItemKey } from "@/components/layout/PortalLayout";
import type { SidebarItem } from "./Sidebar";

type UserInfo = {
  name: string;
  role: string;
};

type MobileNavItem = {
  label: string;
  icon: string;
  path?: string;
  active?: boolean;
  onClick?: () => void;
};

export type AppShellProps = {
  children: ReactNode;
  navigation?: SidebarItem[];
  activeLabel?: string;
  user?: UserInfo;
  mobileNav?: MobileNavItem[];
};

function mapActiveLabelToNav(label?: string): NavItemKey {
  const clean = String(label || "").toLowerCase();
  if (clean.includes("dash")) return "Dashboard";
  if (clean.includes("user") || clean.includes("workforce") || clean.includes("hr")) return "HR & Workforce";
  if (clean.includes("attend") || clean.includes("leave") || clean.includes("roster")) return "Attendance";
  if (clean.includes("pay")) return "Payroll";
  if (clean.includes("finan") || clean.includes("procur")) return "Finance & Procurement";
  if (clean.includes("approv") || clean.includes("request")) return "Approvals";
  if (clean.includes("task") || clean.includes("file") || clean.includes("mail") || clean.includes("report")) return "Reports";
  if (clean.includes("role") || clean.includes("org") || clean.includes("setting") || clean.includes("admin")) return "Settings";
  return "Dashboard";
}

export function AppShell({
  children,
  activeLabel,
}: AppShellProps) {
  const navKey = mapActiveLabelToNav(activeLabel);

  return (
    <PortalLayout activeNav={navKey}>
      {children}
    </PortalLayout>
  );
}
