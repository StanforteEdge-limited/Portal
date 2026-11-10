import {
  createRouter as createTanStackRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from "@tanstack/react-router";
import { BrandingProvider } from "@/shared/branding/BrandingProvider";
import { AuthProvider, useAuth } from "@/shared/context/AuthProvider";
import { UpdateBanner } from "@/shared/components/ui/UpdateBanner";

// Public Marketing & Auth Pages
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

// Dashboard
import DashboardPage from "@/pages/dashboard/DashboardPage";

// HR & Workforce Pages
import AttendancePage from "@/pages/hr/attendance/AttendancePage";
import LeavePage from "@/pages/hr/leave/LeavePage";
import AdminUsersPage from "@/pages/admin/users/AdminUsersPage";
import AdminUserBulkPage from "@/pages/admin/users/AdminUserBulkPage";
import AdminUserDetailPage from "@/pages/admin/users/AdminUserDetailPage";
import AdminGroupsPage from "@/pages/admin/groups/AdminGroupsPage";
import TeamsPage from "@/pages/teams/TeamsPage";
import TeamDetailPage from "@/pages/teams/TeamDetailPage";
import HrEmployeesPage from "@/pages/hr/employees/HrEmployeesPage";
import HrEmployeeCreatePage from "@/pages/hr/employees/HrEmployeeCreatePage";
import HrEmployeeDetailPage from "@/pages/hr/employees/HrEmployeeDetailPage";
import HrEmployeeEditPage from "@/pages/hr/employees/HrEmployeeEditPage";

// Account & Self-Service
import TimesheetsPage from "@/pages/account/TimesheetsPage";
import PayslipsPage from "@/pages/account/PayslipsPage";
import ProfilePage from "@/pages/account/ProfilePage";
import AccountSettingsPage from "@/pages/account/SettingsPage";
import NotificationsPage from "@/pages/account/NotificationsPage";
import HelpPage from "@/pages/account/HelpPage";
import DownloadPage from "@/pages/account/DownloadPage";

// Payroll Pages
import AdminPayrollAuthorizationPage from "@/pages/admin/payroll/AdminPayrollAuthorizationPage";
import AdminPayrollRunAuthorizePage from "@/pages/admin/payroll/AdminPayrollRunAuthorizePage";
import FinancePayrollPage from "@/pages/finance/payroll/FinancePayrollPage";
import FinancePayrollComponentsPage from "@/pages/finance/payroll/FinancePayrollComponentsPage";
import FinancePayrollTaxTablesPage from "@/pages/finance/payroll/FinancePayrollTaxTablesPage";
import FinancePayrollRunDetailPage from "@/pages/finance/payroll/FinancePayrollRunDetailPage";
import HrPayrollLoansPage from "@/pages/hr/payroll/HrPayrollLoansPage";

// Finance & Accounting Pages
import FinanceDashboardPage from "@/pages/finance/dashboard/FinanceDashboardPage";
import FinanceAccountsPage from "@/pages/finance/accounts/FinanceAccountsPage";
import FinanceAccountDetailPage from "@/pages/finance/accounts/FinanceAccountDetailPage";
import FinanceChartAccountsPage from "@/pages/finance/accounts/FinanceChartAccountsPage";
import FinanceBudgetsPage from "@/pages/finance/budgets/FinanceBudgetsPage";
import FinanceBudgetEditorPage from "@/pages/finance/budgets/FinanceBudgetEditorPage";
import FinanceBudgetDetailPage from "@/pages/finance/budgets/FinanceBudgetDetailPage";
import FinanceExpensesPage from "@/pages/finance/expenses/FinanceExpensesPage";
import FinanceBillsPage from "@/pages/finance/bills/FinanceBillsPage";
import FinanceSalesInvoicesPage from "@/pages/finance/invoices/FinanceSalesInvoicesPage";
import FinanceAssetsPage from "@/pages/finance/assets/FinanceAssetsPage";
import FinanceAssetEditorPage from "@/pages/finance/assets/FinanceAssetEditorPage";
import FinanceAssetDisposalsPage from "@/pages/finance/assets/FinanceAssetDisposalsPage";
import FinanceLedgerPage from "@/pages/finance/ledger/FinanceLedgerPage";
import FinanceManualEntryPage from "@/pages/finance/ledger/FinanceManualEntryPage";
import FinancePaymentVouchersPage from "@/pages/finance/payment-vouchers/FinancePaymentVouchersPage";
import FinancePayablesPage from "@/pages/finance/payables/FinancePayablesPage";
import FinanceReceivablesPage from "@/pages/finance/receivables/FinanceReceivablesPage";
import StatutoryDeductionsPage from "@/pages/finance/deductions/StatutoryDeductionsPage";
import FinanceDeductionTypesPage from "@/pages/finance/deductions/FinanceDeductionTypesPage";
import FinanceReportsPage from "@/pages/finance/reports/FinanceReportsPage";
import FinanceReportDetailPage from "@/pages/finance/reports/FinanceReportDetailPage";
import FinanceContactsPage from "@/pages/finance/contacts";
import FinanceSettingsPage from "@/pages/finance/settings/FinanceSettingsPage";
import FinanceRequestsPage from "@/pages/finance/requests/FinanceRequestsPage";
import FinanceRequestDetailsPage from "@/pages/finance/requests/FinanceRequestDetailsPage";

// Workflows, Operations & Requests
import RequestsListPage from "@/pages/requests/RequestsListPage";
import RequestTypePage from "@/pages/requests/new/RequestTypePage";
import RequestFormPage from "@/pages/requests/new/RequestFormPage";
import RequestDetailsPage from "@/pages/requests/RequestDetailsPage";
import ApprovalsPage from "@/pages/requests/ApprovalsPage";
import ApprovalRequestDetailsPage from "@/pages/requests/ApprovalRequestDetailsPage";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import ProjectDetailPage from "@/pages/projects/ProjectDetailPage";
import AdminProjectsPage from "@/pages/admin/projects/AdminProjectsPage";
import TasksPage from "@/pages/tasks/TasksPage";
import ProcurementIndex from "@/pages/procurement/index";

// Documents & Media
import DocumentsListPage from "@/pages/documents/DocumentsListPage";
import DocumentDetailPage from "@/pages/documents/DocumentDetailPage";
import PoliciesListPage from "@/pages/documents/PoliciesListPage";
import FilesPage from "@/pages/files/FilesPage";
import MailPage from "@/pages/mail";

// Administration & Governance
import AdminRolesPage from "@/pages/admin/roles/AdminRolesPage";
import AdminOrganizationsPage from "@/pages/admin/organizations/AdminOrganizationsPage";
import AdminSettingsPage from "@/pages/admin/settings/AdminSettingsPage";

// Vendor Portal
import VendorDashboardPage from "@/pages/vendor-portal/dashboard";
import VendorLoginPage from "@/pages/vendor-portal/login";
import VendorDetailPage from "@/pages/vendor-portal/detail";

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
  loader: async () => fetchPublicStatsServerFn(),
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

// 5. Protected Dashboard Route
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

  // Administration
  adminRolesRoute,
  adminOrgsRoute,
  adminSettingsRoute,

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
