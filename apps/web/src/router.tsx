import React from "react";
import {
  createRouter as createTanStackRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from "@tanstack/react-router";
import { Lock, Compass } from "lucide-react";
import { BrandingProvider } from "@/shared/branding/BrandingProvider";
import { AuthProvider, useAuth } from "@/shared/context/AuthProvider";
import { UpdateBanner } from "@/shared/components/ui/UpdateBanner";
import { PageSpinner } from "@/shared/components/ui/PageSpinner";
import { ProtectedRoute, PublicOnlyRoute } from "@/shared/components/auth/RouteGuards";
import { Navigate, useNavigate } from "@/shared/router-adapter";

type RouteDef = readonly [path: string, component: any];

/** Lazy-load a page component usable both as a TanStack route component and in JSX. */
const lazy = (importer: () => Promise<{ default: React.ComponentType<any> }>) =>
  React.lazy(importer);

/** Build a batch of TanStack routes sharing the same parent without repeating boilerplate. */
function buildRoutes(parentRoute: any, definitions: readonly RouteDef[]) {
  return definitions.map(([path, component]) =>
    createRoute({
      getParentRoute: () => parentRoute,
      path,
      component,
    }),
  );
}

function NotFoundScreen() {
  const navigate = useNavigate();
  const { status } = useAuth();
  return (
    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <section className="bg-white rounded-2xl p-8 max-w-md w-full border border-neutral-200/80 shadow-xs text-center space-y-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center mx-auto">
          <Compass className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-neutral-500 tabular-nums">404</p>
          <h1 className="text-lg font-medium text-neutral-900">Page not found</h1>
          <p className="text-sm text-neutral-500">
            The requested route does not exist or has moved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(status === "authenticated" ? "/dashboard" : "/")}
          className="w-full h-10 px-4 bg-[#ff6900] hover:bg-[#ea580c] text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          {status === "authenticated" ? "Return to dashboard" : "Return to home"}
        </button>
      </section>
    </main>
  );
}

// 1. Root & Layout Guard Routes
const rootRoute = createRootRoute({
  notFoundComponent: NotFoundScreen,
  component: () => (
    <BrandingProvider>
      <AuthProvider>
        <UpdateBanner />
        <React.Suspense fallback={<PageSpinner size="sm" />}>
          <Outlet />
        </React.Suspense>
      </AuthProvider>
    </BrandingProvider>
  ),
});

const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_protected",
  component: ProtectedRoute,
});

const publicOnlyLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_public_only",
  component: PublicOnlyRoute,
});

// 2. Lazy Page Registry (single definition per page — zero duplicate imports)
const HomePage = lazy(() => import("@/pages/home/HomePage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const WorkspaceAnalyticsPage = lazy(() => import("@/pages/analytics/WorkspaceAnalyticsPage"));
const SessionReauthPage = lazy(() => import("@/pages/auth/SessionReauthPage"));
const PricingPage = lazy(() => import("@/pages/public/PricingPage"));
const FeaturesPage = lazy(() => import("@/pages/public/FeaturesPage"));
const SecurityPage = lazy(() => import("@/pages/public/SecurityPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmailPage"));
const AcceptInvitePage = lazy(() => import("@/pages/auth/AcceptInvitePage"));
const EmployeeOnboardingPage = lazy(() => import("@/pages/auth/EmployeeOnboardingPage"));

// HR & Workforce
const AttendancePage = lazy(() => import("@/pages/hr/attendance/AttendancePage"));
const LeavePage = lazy(() => import("@/pages/hr/leave/LeavePage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/users/AdminUsersPage"));
const AdminUserBulkPage = lazy(() => import("@/pages/admin/users/AdminUserBulkPage"));
const AdminUserDetailPage = lazy(() => import("@/pages/admin/users/AdminUserDetailPage"));
const AdminGroupsPage = lazy(() => import("@/pages/admin/groups/AdminGroupsPage"));
const TeamsPage = lazy(() => import("@/pages/teams/TeamsPage"));
const TeamDetailPage = lazy(() => import("@/pages/teams/TeamDetailPage"));
const HrEmployeesPage = lazy(() => import("@/pages/hr/employees/HrEmployeesPage"));
const HrEmployeeCreatePage = lazy(() => import("@/pages/hr/employees/HrEmployeeCreatePage"));
const HrEmployeeDetailPage = lazy(() => import("@/pages/hr/employees/HrEmployeeDetailPage"));
const HrEmployeeEditPage = lazy(() => import("@/pages/hr/employees/HrEmployeeEditPage"));
const HrPayrollLoansPage = lazy(() => import("@/pages/hr/payroll/HrPayrollLoansPage"));
const HrPayrollWorkersPage = lazy(() => import("@/pages/hr/payroll/HrPayrollWorkersPage"));
const HrSettingsPage = lazy(() => import("@/pages/hr/settings/HrSettingsPage"));

// Account Self-Service
const TimesheetsPage = lazy(() => import("@/pages/account/TimesheetsPage"));
const PayslipsPage = lazy(() => import("@/pages/account/PayslipsPage"));
const ProfilePage = lazy(() => import("@/pages/account/ProfilePage"));
const AccountSettingsPage = lazy(() => import("@/pages/account/SettingsPage"));
const NotificationsPage = lazy(() => import("@/pages/account/NotificationsPage"));
const HelpPage = lazy(() => import("@/pages/account/HelpPage"));
const DownloadPage = lazy(() => import("@/pages/account/DownloadPage"));

// Payroll & Finance
const AdminPayrollAuthorizationPage = lazy(() => import("@/pages/admin/payroll/AdminPayrollAuthorizationPage"));
const AdminPayrollRunAuthorizePage = lazy(() => import("@/pages/admin/payroll/AdminPayrollRunAuthorizePage"));
const FinancePayrollPage = lazy(() => import("@/pages/finance/payroll/FinancePayrollPage"));
const FinancePayrollComponentsPage = lazy(() => import("@/pages/finance/payroll/FinancePayrollComponentsPage"));
const FinancePayrollTaxTablesPage = lazy(() => import("@/pages/finance/payroll/FinancePayrollTaxTablesPage"));
const FinancePayrollRunDetailPage = lazy(() => import("@/pages/finance/payroll/FinancePayrollRunDetailPage"));
const FinanceDashboardPage = lazy(() => import("@/pages/finance/dashboard/FinanceDashboardPage"));
const FinanceAccountsPage = lazy(() => import("@/pages/finance/accounts/FinanceAccountsPage"));
const FinanceAccountDetailPage = lazy(() => import("@/pages/finance/accounts/FinanceAccountDetailPage"));
const FinanceChartAccountsPage = lazy(() => import("@/pages/finance/accounts/FinanceChartAccountsPage"));
const FinanceBudgetsPage = lazy(() => import("@/pages/finance/budgets/FinanceBudgetsPage"));
const FinanceBudgetEditorPage = lazy(() => import("@/pages/finance/budgets/FinanceBudgetEditorPage"));
const FinanceBudgetDetailPage = lazy(() => import("@/pages/finance/budgets/FinanceBudgetDetailPage"));
const FinanceExpensesPage = lazy(() => import("@/pages/finance/expenses/FinanceExpensesPage"));
const FinanceBillsPage = lazy(() => import("@/pages/finance/bills/FinanceBillsPage"));
const FinanceSalesInvoicesPage = lazy(() => import("@/pages/finance/invoices/FinanceSalesInvoicesPage"));
const FinanceIncomePage = lazy(() => import("@/pages/finance/income/FinanceIncomePage"));
const FinanceItemsPage = lazy(() => import("@/pages/finance/items/FinanceItemsPage"));
const FinanceAssetsPage = lazy(() => import("@/pages/finance/assets/FinanceAssetsPage"));
const FinanceAssetEditorPage = lazy(() => import("@/pages/finance/assets/FinanceAssetEditorPage"));
const FinanceAssetDisposalsPage = lazy(() => import("@/pages/finance/assets/FinanceAssetDisposalsPage"));
const FinanceLedgerPage = lazy(() => import("@/pages/finance/ledger/FinanceLedgerPage"));
const FinanceManualEntryPage = lazy(() => import("@/pages/finance/ledger/FinanceManualEntryPage"));
const StatutoryDeductionManualEntryPage = lazy(() => import("@/pages/finance/deductions/StatutoryDeductionManualEntryPage"));
const FinanceLegacyManualEntryPage = lazy(() => import("@/pages/finance/requests/FinanceLegacyManualEntryPage"));
const FinancePaymentVouchersPage = lazy(() => import("@/pages/finance/payment-vouchers/FinancePaymentVouchersPage"));
const FinancePayablesPage = lazy(() => import("@/pages/finance/payables/FinancePayablesPage"));
const FinanceReceivablesPage = lazy(() => import("@/pages/finance/receivables/FinanceReceivablesPage"));
const StatutoryDeductionsPage = lazy(() => import("@/pages/finance/deductions/StatutoryDeductionsPage"));
const FinanceDeductionTypesPage = lazy(() => import("@/pages/finance/deductions/FinanceDeductionTypesPage"));
const FinanceReportsPage = lazy(() => import("@/pages/finance/reports/FinanceReportsPage"));
const FinanceReportDetailPage = lazy(() => import("@/pages/finance/reports/FinanceReportDetailPage"));
const FinanceContactsPage = lazy(() => import("@/pages/finance/contacts"));
const FinanceSettingsPage = lazy(() => import("@/pages/finance/settings/FinanceSettingsPage"));
const FinanceRequestsPage = lazy(() => import("@/pages/finance/requests/FinanceRequestsPage"));
const FinanceRequestDetailsPage = lazy(() => import("@/pages/finance/requests/FinanceRequestDetailsPage"));

// Workflows, Operations, Documents & Admin
const RequestsListPage = lazy(() => import("@/pages/requests/RequestsListPage"));
const RequestTypePage = lazy(() => import("@/pages/requests/new/RequestTypePage"));
const RequestFormPage = lazy(() => import("@/pages/requests/new/RequestFormPage"));
const RequestDetailsPage = lazy(() => import("@/pages/requests/RequestDetailsPage"));
const ApprovalsPage = lazy(() => import("@/pages/requests/ApprovalsPage"));
const ApprovalRequestDetailsPage = lazy(() => import("@/pages/requests/ApprovalRequestDetailsPage"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("@/pages/projects/ProjectDetailPage"));
const AdminProjectsPage = lazy(() => import("@/pages/admin/projects/AdminProjectsPage"));
const TasksPage = lazy(() => import("@/pages/tasks/TasksPage"));
const ProcurementIndex = lazy(() => import("@/pages/procurement/index"));
const DocumentsListPage = lazy(() => import("@/pages/documents/DocumentsListPage"));
const DocumentDetailPage = lazy(() => import("@/pages/documents/DocumentDetailPage"));
const DocumentEditorPage = lazy(() => import("@/pages/documents/DocumentEditorPage"));
const PoliciesListPage = lazy(() => import("@/pages/documents/PoliciesListPage"));
const FilesPage = lazy(() => import("@/pages/files/FilesPage"));
const MailPage = lazy(() => import("@/pages/mail"));
const ChatPage = lazy(() => import("@/pages/chat/ChatPage"));
const AdminRolesPage = lazy(() => import("@/pages/admin/roles/AdminRolesPage"));
const AdminOrganizationsPage = lazy(() => import("@/pages/admin/organizations/AdminOrganizationsPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/settings/AdminSettingsPage"));

// Vendor Portal
const VendorDashboardPage = lazy(() => import("@/pages/vendor-portal/dashboard"));
const VendorLoginPage = lazy(() => import("@/pages/vendor-portal/login"));
const VendorDetailPage = lazy(() => import("@/pages/vendor-portal/detail"));

// 3. Dynamic Index & Gated Views
function IndexRouteView() {
  const { status, initialized } = useAuth();
  if (!initialized || status === "checking") return <PageSpinner />;
  return status === "authenticated" ? <DashboardPage /> : <HomePage />;
}

function AnalyticsAdminGatedPage() {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  if (status === "checking") return <PageSpinner />;

  const userRoles = (user?.roles || []).map((r: any) =>
    typeof r === "string" ? r.toLowerCase() : (r?.name || "").toLowerCase(),
  );
  const adminRoles = ["admin", "superadmin", "super_admin", "director", "hr_manager", "finance_manager"];
  const isAdmin =
    userRoles.some((r) => adminRoles.some((ar) => r.includes(ar))) ||
    (user?.permissions || []).some(
      (p: string) => p.startsWith("admin.") || p.startsWith("finance.") || p.startsWith("hr."),
    );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-neutral-200/80 shadow-xs text-center space-y-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-medium text-neutral-900">Administrator access required</h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Workspace analytics is restricted to administrators and management roles.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full h-10 px-4 bg-[#ff6900] hover:bg-[#ea580c] text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  return <WorkspaceAnalyticsPage />;
}

const FinanceCustomersPage = () => <FinanceContactsPage defaultType="customer" />;
const FinanceVendorsPage = () => <FinanceContactsPage defaultType="vendor" />;
const RedirectToHrEmployees = () => <Navigate to="/hr/employees" replace />;
const RedirectToFinancePayroll = () => <Navigate to="/finance/payroll" replace />;

// 4. Declarative Route Tables (Single Source of Truth)
const PUBLIC_ROUTES: readonly RouteDef[] = [
  ["/", IndexRouteView],
  ["/home", HomePage],
  ["/pricing", PricingPage],
  ["/features", FeaturesPage],
  ["/security", SecurityPage],
  ["/reauth", SessionReauthPage],
  ["/verify-email", VerifyEmailPage],
  ["/accept-invite", AcceptInvitePage],
  ["/onboarding", EmployeeOnboardingPage],
  // Vendor Portal
  ["/vendor-portal", VendorDashboardPage],
  ["/vendor-portal/dashboard", VendorDashboardPage],
  ["/vendor-portal/login", VendorLoginPage],
  ["/vendor-portal/$id", VendorDetailPage],
  ["/vendor-portal/orders/$id", VendorDetailPage],
];

const PUBLIC_ONLY_ROUTES: readonly RouteDef[] = [
  ["/login", LoginPage],
  ["/register", RegisterPage],
  ["/forgot-password", ForgotPasswordPage],
  ["/reset-password", ResetPasswordPage],
];

const PROTECTED_ROUTES: readonly RouteDef[] = [
  ["/dashboard", DashboardPage],

  // HR & Workforce
  ["/attendance", AttendancePage],
  ["/hr/attendance", AttendancePage],
  ["/leave", LeavePage],
  ["/hr/leave", LeavePage],
  ["/hr", RedirectToHrEmployees],
  ["/hr/employees", HrEmployeesPage],
  ["/hr/employees/create", HrEmployeeCreatePage],
  ["/hr/employees/$id", HrEmployeeDetailPage],
  ["/hr/employees/$id/edit", HrEmployeeEditPage],
  ["/hr/payroll", RedirectToFinancePayroll],
  ["/hr/payroll/loans", HrPayrollLoansPage],
  ["/hr/payroll/workers", HrPayrollWorkersPage],
  ["/hr/settings", HrSettingsPage],
  ["/teams", TeamsPage],
  ["/teams/$id", TeamDetailPage],

  // Account Self-Service (+ compatibility aliases)
  ["/account/timesheets", TimesheetsPage],
  ["/profile/timesheets", TimesheetsPage],
  ["/account/payslips", PayslipsPage],
  ["/profile/payslips", PayslipsPage],
  ["/account/profile", ProfilePage],
  ["/profile", ProfilePage],
  ["/account/settings", AccountSettingsPage],
  ["/settings", AccountSettingsPage],
  ["/account/notifications", NotificationsPage],
  ["/account/help", HelpPage],
  ["/account/downloads", DownloadPage],

  // Payroll
  ["/admin/payroll/authorization", AdminPayrollAuthorizationPage],
  ["/admin/payroll/authorization/$id", AdminPayrollRunAuthorizePage],
  ["/finance/payroll", FinancePayrollPage],
  ["/finance/payroll/components", FinancePayrollComponentsPage],
  ["/finance/payroll/tax-tables", FinancePayrollTaxTablesPage],
  ["/finance/payroll/runs/$id", FinancePayrollRunDetailPage],

  // Finance & Accounting (+ compatibility aliases)
  ["/finance", FinanceDashboardPage],
  ["/finance/accounts", FinanceAccountsPage],
  ["/finance/accounts/$id", FinanceAccountDetailPage],
  ["/finance/chart-of-accounts", FinanceChartAccountsPage],
  ["/finance/chart-accounts", FinanceChartAccountsPage],
  ["/finance/budgets", FinanceBudgetsPage],
  ["/finance/budgets/new", FinanceBudgetEditorPage],
  ["/finance/budgets/$id", FinanceBudgetDetailPage],
  ["/finance/expenses", FinanceExpensesPage],
  ["/finance/bills", FinanceBillsPage],
  ["/finance/invoices", FinanceSalesInvoicesPage],
  ["/finance/sales-invoices", FinanceSalesInvoicesPage],
  ["/finance/income", FinanceIncomePage],
  ["/finance/items", FinanceItemsPage],
  ["/finance/assets", FinanceAssetsPage],
  ["/finance/assets/new", FinanceAssetEditorPage],
  ["/finance/assets/disposals", FinanceAssetDisposalsPage],
  ["/finance/ledger", FinanceLedgerPage],
  ["/finance/ledger/manual", FinanceManualEntryPage],
  ["/finance/manual-entry", FinanceManualEntryPage],
  ["/finance/manual-entry/statutory-deductions", StatutoryDeductionManualEntryPage],
  ["/finance/legacy-manual-entry", FinanceLegacyManualEntryPage],
  ["/finance/payment-vouchers", FinancePaymentVouchersPage],
  ["/finance/payables", FinancePayablesPage],
  ["/finance/receivables", FinanceReceivablesPage],
  ["/finance/deductions", StatutoryDeductionsPage],
  ["/finance/statutory-deductions", StatutoryDeductionsPage],
  ["/finance/deductions/types", FinanceDeductionTypesPage],
  ["/finance/deduction-types", FinanceDeductionTypesPage],
  ["/finance/reports", FinanceReportsPage],
  ["/finance/reports/$id", FinanceReportDetailPage],
  ["/finance/contacts", FinanceContactsPage],
  ["/finance/customers", FinanceCustomersPage],
  ["/finance/vendors", FinanceVendorsPage],
  ["/finance/settings", FinanceSettingsPage],
  ["/finance/requests", FinanceRequestsPage],
  ["/finance/requests/$id", FinanceRequestDetailsPage],

  // Workflows, Operations & Requests
  ["/requests", RequestsListPage],
  ["/requests/new", RequestTypePage],
  ["/requests/new/form", RequestFormPage],
  ["/requests/$id", RequestDetailsPage],
  ["/requests/approvals", ApprovalsPage],
  ["/requests/approvals/$id", ApprovalRequestDetailsPage],
  ["/projects", ProjectsPage],
  ["/projects/$id", ProjectDetailPage],
  ["/tasks", TasksPage],
  ["/procurement", ProcurementIndex],

  // Documents & Communication
  ["/documents", DocumentsListPage],
  ["/documents/new", DocumentEditorPage],
  ["/documents/$id/edit", DocumentEditorPage],
  ["/documents/$id", DocumentDetailPage],
  ["/policies", PoliciesListPage],
  ["/files", FilesPage],
  ["/admin/files", FilesPage],
  ["/mail", MailPage],
  ["/chat", ChatPage],

  // Administration
  ["/admin/users", AdminUsersPage],
  ["/admin/users/bulk", AdminUserBulkPage],
  ["/admin/users/$id", AdminUserDetailPage],
  ["/admin/groups", AdminGroupsPage],
  ["/admin/projects", AdminProjectsPage],
  ["/admin/roles", AdminRolesPage],
  ["/admin/organizations", AdminOrganizationsPage],
  ["/admin/settings", AdminSettingsPage],
  ["/analytics", AnalyticsAdminGatedPage],
];

// 5. Unified TanStack Route Tree
const routeTree = rootRoute.addChildren([
  ...buildRoutes(rootRoute, PUBLIC_ROUTES),
  publicOnlyLayoutRoute.addChildren(buildRoutes(publicOnlyLayoutRoute, PUBLIC_ONLY_ROUTES)),
  protectedLayoutRoute.addChildren(buildRoutes(protectedLayoutRoute, PROTECTED_ROUTES)),
]);

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: false,
  });
}

export type AppRouter = ReturnType<typeof createRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
