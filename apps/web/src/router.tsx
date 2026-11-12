import React from "react";
import {
  createRouter as createTanStackRouter,
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  Outlet,
} from "@tanstack/react-router";
import { BrandingProvider } from "@/shared/branding/BrandingProvider";
import { AuthProvider, useAuth } from "@/shared/context/AuthProvider";
import { UpdateBanner } from "@/shared/components/ui/UpdateBanner";
import { useNavigate } from "@/shared/router-adapter";

// Lazy-load page component helper for clean route code-splitting
const lazy = (importer: () => Promise<{ default: React.ComponentType<any> }>) =>
  lazyRouteComponent(importer);

// 1. Root Route: App Shell, Global Providers, and Suspense Boundary
const rootRoute = createRootRoute({
  component: () => (
    <BrandingProvider>
      <AuthProvider>
        <UpdateBanner />
        <React.Suspense
          fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#ff6900] border-t-transparent animate-spin" />
            </div>
          }
        >
          <Outlet />
        </React.Suspense>
      </AuthProvider>
    </BrandingProvider>
  ),
});

import HomePage from "@/pages/home/HomePage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import WorkspaceAnalyticsPage from "@/pages/analytics/WorkspaceAnalyticsPage";

// Lazy Page Definitions
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

// Account Self-Service
const TimesheetsPage = lazy(() => import("@/pages/account/TimesheetsPage"));
const PayslipsPage = lazy(() => import("@/pages/account/PayslipsPage"));
const ProfilePage = lazy(() => import("@/pages/account/ProfilePage"));
const AccountSettingsPage = lazy(() => import("@/pages/account/SettingsPage"));
const NotificationsPage = lazy(() => import("@/pages/account/NotificationsPage"));
const HelpPage = lazy(() => import("@/pages/account/HelpPage"));
const DownloadPage = lazy(() => import("@/pages/account/DownloadPage"));

// Payroll
const AdminPayrollAuthorizationPage = lazy(() => import("@/pages/admin/payroll/AdminPayrollAuthorizationPage"));
const AdminPayrollRunAuthorizePage = lazy(() => import("@/pages/admin/payroll/AdminPayrollRunAuthorizePage"));
const FinancePayrollPage = lazy(() => import("@/pages/finance/payroll/FinancePayrollPage"));
const FinancePayrollComponentsPage = lazy(() => import("@/pages/finance/payroll/FinancePayrollComponentsPage"));
const FinancePayrollTaxTablesPage = lazy(() => import("@/pages/finance/payroll/FinancePayrollTaxTablesPage"));
const FinancePayrollRunDetailPage = lazy(() => import("@/pages/finance/payroll/FinancePayrollRunDetailPage"));
const HrPayrollLoansPage = lazy(() => import("@/pages/hr/payroll/HrPayrollLoansPage"));

// Finance & Accounting
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
const FinanceAssetsPage = lazy(() => import("@/pages/finance/assets/FinanceAssetsPage"));
const FinanceAssetEditorPage = lazy(() => import("@/pages/finance/assets/FinanceAssetEditorPage"));
const FinanceAssetDisposalsPage = lazy(() => import("@/pages/finance/assets/FinanceAssetDisposalsPage"));
const FinanceLedgerPage = lazy(() => import("@/pages/finance/ledger/FinanceLedgerPage"));
const FinanceManualEntryPage = lazy(() => import("@/pages/finance/ledger/FinanceManualEntryPage"));
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

// Workflows, Operations & Requests
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

// Documents & Media
const DocumentsListPage = lazy(() => import("@/pages/documents/DocumentsListPage"));
const DocumentDetailPage = lazy(() => import("@/pages/documents/DocumentDetailPage"));
const PoliciesListPage = lazy(() => import("@/pages/documents/PoliciesListPage"));
const FilesPage = lazy(() => import("@/pages/files/FilesPage"));
const MailPage = lazy(() => import("@/pages/mail"));
const ChatPage = lazy(() => import("@/pages/chat/ChatPage"));

// Administration
const AdminRolesPage = lazy(() => import("@/pages/admin/roles/AdminRolesPage"));
const AdminOrganizationsPage = lazy(() => import("@/pages/admin/organizations/AdminOrganizationsPage"));
const AdminSettingsPage = lazy(() => import("@/pages/admin/settings/AdminSettingsPage"));

// Vendor Portal
const VendorDashboardPage = lazy(() => import("@/pages/vendor-portal/dashboard"));
const VendorLoginPage = lazy(() => import("@/pages/vendor-portal/login"));
const VendorDetailPage = lazy(() => import("@/pages/vendor-portal/detail"));

// 2. Index Route (`/`): Dynamic Auth Routing
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
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

// 3. Dedicated SaaS Public Marketing Routes
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/home",
  component: HomePage,
});

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

// 5. Dashboard Route
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

// 6. HR & Workforce Routes
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

const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});

const adminUserBulkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users/bulk",
  component: AdminUserBulkPage,
});

const adminUserDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users/$id",
  component: AdminUserDetailPage,
});

const adminGroupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/groups",
  component: AdminGroupsPage,
});

const teamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teams",
  component: TeamsPage,
});

const teamDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teams/$id",
  component: TeamDetailPage,
});

const hrEmployeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/employees",
  component: HrEmployeesPage,
});

const hrEmployeeCreateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/employees/create",
  component: HrEmployeeCreatePage,
});

const hrEmployeeDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/employees/$id",
  component: HrEmployeeDetailPage,
});

const hrEmployeeEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/employees/$id/edit",
  component: HrEmployeeEditPage,
});

// 7. Account & Self-Service Routes
const accountTimesheetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/timesheets",
  component: TimesheetsPage,
});

const accountPayslipsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/payslips",
  component: PayslipsPage,
});

const accountProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/profile",
  component: ProfilePage,
});

const accountSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/settings",
  component: AccountSettingsPage,
});

const accountNotificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/notifications",
  component: NotificationsPage,
});

const accountHelpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/help",
  component: HelpPage,
});

const accountDownloadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/downloads",
  component: DownloadPage,
});

// 8. Payroll Routes
const adminPayrollAuthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/payroll/authorization",
  component: AdminPayrollAuthorizationPage,
});

const adminPayrollRunAuthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/payroll/authorization/$id",
  component: AdminPayrollRunAuthorizePage,
});

const financePayrollRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/payroll",
  component: FinancePayrollPage,
});

const financePayrollComponentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/payroll/components",
  component: FinancePayrollComponentsPage,
});

const financePayrollTaxTablesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/payroll/tax-tables",
  component: FinancePayrollTaxTablesPage,
});

const financePayrollRunDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/payroll/runs/$id",
  component: FinancePayrollRunDetailPage,
});

const hrPayrollLoansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hr/payroll/loans",
  component: HrPayrollLoansPage,
});

// 9. Finance & Accounting Routes
const financeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance",
  component: FinanceDashboardPage,
});

const financeAccountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/accounts",
  component: FinanceAccountsPage,
});

const financeAccountDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/accounts/$id",
  component: FinanceAccountDetailPage,
});

const financeChartAccountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/chart-of-accounts",
  component: FinanceChartAccountsPage,
});

const financeBudgetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/budgets",
  component: FinanceBudgetsPage,
});

const financeBudgetNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/budgets/new",
  component: FinanceBudgetEditorPage,
});

const financeBudgetDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/budgets/$id",
  component: FinanceBudgetDetailPage,
});

const financeExpensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/expenses",
  component: FinanceExpensesPage,
});

const financeBillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/bills",
  component: FinanceBillsPage,
});

const financeInvoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/invoices",
  component: FinanceSalesInvoicesPage,
});

const financeAssetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/assets",
  component: FinanceAssetsPage,
});

const financeAssetNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/assets/new",
  component: FinanceAssetEditorPage,
});

const financeAssetDisposalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/assets/disposals",
  component: FinanceAssetDisposalsPage,
});

const financeLedgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/ledger",
  component: FinanceLedgerPage,
});

const financeLedgerManualRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/ledger/manual",
  component: FinanceManualEntryPage,
});

const financePaymentVouchersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/payment-vouchers",
  component: FinancePaymentVouchersPage,
});

const financePayablesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/payables",
  component: FinancePayablesPage,
});

const financeReceivablesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/receivables",
  component: FinanceReceivablesPage,
});

const financeDeductionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/deductions",
  component: StatutoryDeductionsPage,
});

const financeDeductionTypesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/deductions/types",
  component: FinanceDeductionTypesPage,
});

const financeReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/reports",
  component: FinanceReportsPage,
});

const financeReportDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/reports/$id",
  component: FinanceReportDetailPage,
});

const financeContactsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/contacts",
  component: FinanceContactsPage,
});

const financeSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/settings",
  component: FinanceSettingsPage,
});

const financeRequestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/requests",
  component: FinanceRequestsPage,
});

const financeRequestDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/finance/requests/$id",
  component: FinanceRequestDetailsPage,
});

// 10. Workflows, Approvals & Operations Routes
const requestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests",
  component: RequestsListPage,
});

const requestNewTypeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests/new",
  component: RequestTypePage,
});

const requestNewFormRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests/new/form",
  component: RequestFormPage,
});

const requestDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests/$id",
  component: RequestDetailsPage,
});

const approvalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests/approvals",
  component: ApprovalsPage,
});

const approvalDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/requests/approvals/$id",
  component: ApprovalRequestDetailsPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$id",
  component: ProjectDetailPage,
});

const adminProjectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/projects",
  component: AdminProjectsPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksPage,
});

const procurementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/procurement",
  component: ProcurementIndex,
});

// 11. Documents & Media Routes
const documentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/documents",
  component: DocumentsListPage,
});

const documentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/documents/$id",
  component: DocumentDetailPage,
});

const policiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/policies",
  component: PoliciesListPage,
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

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: ChatPage,
});

// 12. Administration Routes
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

const AnalyticsAdminGatedPage = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#ff6900] border-t-transparent animate-spin" />
      </div>
    );
  }

  const userRoles = (user?.roles || []).map((r: any) =>
    typeof r === "string" ? r.toLowerCase() : (r?.name || "").toLowerCase()
  );
  const adminRoles = ["admin", "superadmin", "super_admin", "director", "hr_manager", "finance_manager"];
  const isAdmin = userRoles.some((r) => adminRoles.some((ar) => r.includes(ar))) ||
    (user?.permissions || []).some((p: string) => p.startsWith("admin.") || p.startsWith("finance.") || p.startsWith("hr."));

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-black">
            🔒
          </div>
          <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Workspace Analytics &amp; Reporting is strictly reserved for administrators and management personnel.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="w-full py-2.5 px-4 bg-[#ff6900] hover:bg-[#ea580c] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Return to Staff Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <WorkspaceAnalyticsPage />;
};

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: AnalyticsAdminGatedPage,
});

// 13. Vendor Portal Routes
const vendorDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendor-portal",
  component: VendorDashboardPage,
});

const vendorLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendor-portal/login",
  component: VendorLoginPage,
});

const vendorDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendor-portal/$id",
  component: VendorDetailPage,
});

// Construct Unified TanStack Route Tree
const routeTree = rootRoute.addChildren([
  // Core Public & Auth
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

  // Main Dashboard
  dashboardRoute,

  // HR & Workforce
  attendanceRoute,
  leaveRoute,
  adminUsersRoute,
  adminUserBulkRoute,
  adminUserDetailRoute,
  adminGroupsRoute,
  teamsRoute,
  teamDetailRoute,
  hrEmployeesRoute,
  hrEmployeeCreateRoute,
  hrEmployeeDetailRoute,
  hrEmployeeEditRoute,

  // Account & Self-Service
  accountTimesheetsRoute,
  accountPayslipsRoute,
  accountProfileRoute,
  accountSettingsRoute,
  accountNotificationsRoute,
  accountHelpRoute,
  accountDownloadRoute,

  // Payroll
  adminPayrollAuthRoute,
  adminPayrollRunAuthRoute,
  financePayrollRoute,
  financePayrollComponentsRoute,
  financePayrollTaxTablesRoute,
  financePayrollRunDetailRoute,
  hrPayrollLoansRoute,

  // Finance & Accounting
  financeRoute,
  financeAccountsRoute,
  financeAccountDetailRoute,
  financeChartAccountsRoute,
  financeBudgetsRoute,
  financeBudgetNewRoute,
  financeBudgetDetailRoute,
  financeExpensesRoute,
  financeBillsRoute,
  financeInvoicesRoute,
  financeAssetsRoute,
  financeAssetNewRoute,
  financeAssetDisposalsRoute,
  financeLedgerRoute,
  financeLedgerManualRoute,
  financePaymentVouchersRoute,
  financePayablesRoute,
  financeReceivablesRoute,
  financeDeductionsRoute,
  financeDeductionTypesRoute,
  financeReportsRoute,
  financeReportDetailRoute,
  financeContactsRoute,
  financeSettingsRoute,
  financeRequestsRoute,
  financeRequestDetailRoute,

  // Workflows, Operations & Requests
  requestsRoute,
  requestNewTypeRoute,
  requestNewFormRoute,
  requestDetailRoute,
  approvalsRoute,
  approvalDetailRoute,
  projectsRoute,
  projectDetailRoute,
  adminProjectsRoute,
  tasksRoute,
  procurementRoute,

  // Documents & Media
  documentsRoute,
  documentDetailRoute,
  policiesRoute,
  filesRoute,
  mailRoute,
  chatRoute,

  // Administration
  adminRolesRoute,
  adminOrgsRoute,
  adminSettingsRoute,
  analyticsRoute,

  // Vendor Portal
  vendorDashboardRoute,
  vendorLoginRoute,
  vendorDetailRoute,
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
