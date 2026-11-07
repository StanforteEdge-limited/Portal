import {
  createRouter as createTanStackRouter,
  createRootRoute,
  createRoute,
  Outlet,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { BrandingProvider } from "@/shared/branding/BrandingProvider";
import { AuthProvider, useAuth } from "@/shared/context/AuthProvider";
import { UpdateBanner } from "@/shared/components/ui/UpdateBanner";
import HomePage from "@/pages/home/HomePage";
import PricingPage from "@/pages/public/PricingPage";
import FeaturesPage from "@/pages/public/FeaturesPage";
import SecurityPage from "@/pages/public/SecurityPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import AcceptInvitePage from "@/pages/auth/AcceptInvitePage";
import EmployeeOnboardingPage from "@/pages/auth/EmployeeOnboardingPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import AttendancePage from "@/pages/hr/attendance/AttendancePage";
import LeavePage from "@/pages/hr/leave/LeavePage";
import RequestsListPage from "@/pages/requests/RequestsListPage";
import ApprovalsPage from "@/pages/requests/ApprovalsPage";
import TasksPage from "@/pages/tasks/TasksPage";
import FilesPage from "@/pages/files/FilesPage";
import MailPage from "@/pages/mail";
import FinanceDashboardPage from "@/pages/finance/dashboard/FinanceDashboardPage";
import ProcurementIndex from "@/pages/procurement/index";
import AdminUsersPage from "@/pages/admin/users/AdminUsersPage";
import AdminRolesPage from "@/pages/admin/roles/AdminRolesPage";
import AdminOrganizationsPage from "@/pages/admin/organizations/AdminOrganizationsPage";
import AdminSettingsPage from "@/pages/admin/settings/AdminSettingsPage";
import {
  fetchHealthServerFn,
  fetchSessionServerFn,
  fetchDashboardMetricsServerFn,
  fetchPublicStatsServerFn,
} from "./server/functions";

// 1. Root Route: App Shell & Global Providers
const rootRoute = createRootRoute({
  component: () => (
    <BrandingProvider>
      <AuthProvider>
        <UpdateBanner />
        <Outlet />
      </AuthProvider>
    </BrandingProvider>
  ),
});

// 2. Index Route (`/`): Preloaded with SSR Server Functions
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: async () => {
    const [publicStats, session] = await Promise.all([
      fetchPublicStatsServerFn(),
      fetchSessionServerFn(),
    ]);
    return { publicStats, session };
  },
  component: () => {
    const { status, initialized } = useAuth();
    if (!initialized || status === "checking") {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#ff6900] border-t-transparent animate-spin" />
        </div>
      );
    }
    if (status === "authenticated") return <DashboardPage />;
    return <HomePage />;
  },
});

// 3. Dedicated SaaS Home Route (`/home`)
const pricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pricing",
  component: PricingPage,
});

const featuresRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/features",
  component: FeaturesPage,
});

const securityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/security",
  component: SecurityPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
  loader: async () => fetchPublicStatsServerFn(),
  component: HomePage,
});

// 4. Public Auth Routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  component: VerifyEmailPage,
});

const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accept-invite",
  component: AcceptInvitePage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: EmployeeOnboardingPage,
});

// 5. Protected Dashboard Route: Preloads data via Server Function
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  loader: async () => {
    const [metrics, health] = await Promise.all([
      fetchDashboardMetricsServerFn(),
      fetchHealthServerFn(),
    ]);
    return { metrics, health };
  },
  component: DashboardPage,
});

// 6. Core Enterprise Modules
const attendanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/attendance",
  component: AttendancePage,
});

const leaveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/leave",
  component: LeavePage,
});

const requestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests",
  component: RequestsListPage,
});

const approvalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests/approvals",
  component: ApprovalsPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksPage,
});

const filesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/files",
  component: FilesPage,
});

const mailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mail",
  component: MailPage,
});

const financeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance",
  component: FinanceDashboardPage,
});

const procurementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement",
  component: ProcurementIndex,
});

// 7. Administration Routes
const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});

const adminRolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/roles",
  component: AdminRolesPage,
});

const adminOrgsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/organizations",
  component: AdminOrganizationsPage,
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/settings",
  component: AdminSettingsPage,
});

// Construct TanStack Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  homeRoute,
  pricingRoute,
  featuresRoute,
  securityRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  acceptInviteRoute,
  onboardingRoute,
  dashboardRoute,
  attendanceRoute,
  leaveRoute,
  requestsRoute,
  approvalsRoute,
  tasksRoute,
  filesRoute,
  mailRoute,
  financeRoute,
  procurementRoute,
  adminUsersRoute,
  adminRolesRoute,
  adminOrgsRoute,
  adminSettingsRoute,
]);

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
  });
}

export type AppRouter = ReturnType<typeof createRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}

