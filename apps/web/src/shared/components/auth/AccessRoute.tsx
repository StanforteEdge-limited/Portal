import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  hasAnyPermission,
  hasApprovalAccess,
  hasPermission,
} from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";

const MODULE_GATE: Record<string, string> = {
  finance: "finance.view",
  hr: "hr.view",
  admin: "admin.view",
  payroll: "payroll.manage",
};

type ModuleRouteProps = {
  moduleKey: string;
};

type PermissionRouteProps = {
  requiredPermissions: string[];
  any?: boolean;
};

export function ModuleRoute({ moduleKey }: ModuleRouteProps) {
  const { status, initialized, user } = useAuth();
  const location = useLocation();

  if (!initialized || status === "checking") return null;
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const gate = MODULE_GATE[moduleKey];
  if (!gate || hasPermission(user, gate)) {
    return <Outlet />;
  }

  return <Navigate to="/" replace state={{ from: location.pathname }} />;
}

export function PermissionRoute({
  requiredPermissions,
  any = false,
}: PermissionRouteProps) {
  const { status, initialized, user } = useAuth();
  const location = useLocation();

  if (!initialized || status === "checking") return null;
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowed = any
    ? hasAnyPermission(user, requiredPermissions)
    : requiredPermissions.every((permission) =>
        hasAnyPermission(user, [permission]),
      );

  if (allowed) {
    return <Outlet />;
  }

  return <Navigate to="/" replace state={{ from: location.pathname }} />;
}

export function ApprovalRoute() {
  const { status, initialized, user } = useAuth();
  const location = useLocation();

  if (!initialized || status === "checking") return null;
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (hasApprovalAccess(user)) {
    return <Outlet />;
  }

  return (
    <Navigate to="/requests" replace state={{ from: location.pathname }} />
  );
}
