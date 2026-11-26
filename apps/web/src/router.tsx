import React from "react";
import {
  createRouter as createTanStackRouter,
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  Outlet,
} from "@tanstack/react-router";
import { Lock, Compass } from "lucide-react";
import { BrandingProvider } from "@/shared/branding/BrandingProvider";
import { AuthProvider, useAuth } from "@/shared/context/AuthProvider";
import { UpdateBanner } from "@/shared/components/ui/UpdateBanner";
import { ProtectedRoute, PublicOnlyRoute } from "@/shared/components/auth/RouteGuards";
import { Navigate, useNavigate } from "@/shared/router-adapter";

// Lazy-load page component helper for clean route code-splitting
const lazy = (importer: () => Promise<{ default: React.ComponentType<any> }>) =>
  lazyRouteComponent(importer);

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

// 1. Root Route: App Shell, Global Providers, and Suspense Boundary
const rootRoute = createRootRoute({
  notFoundComponent: NotFoundScreen,
  component: () => (
    <BrandingProvider>
      <AuthProvider>
        <UpdateBanner />
        <React.Suspense
          fallback={
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-[#ff6900] border-t-transparent animate-spin" />
            </div>
          }
        >
          <Outlet />
        </React.Suspense>
      </AuthProvider>
    </BrandingProvider>
  ),
});

// Layout guards
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

// Lazy Page Definitions
const HomePageLazy = React.lazy(() => import("@/pages/home/HomePage"));
const DashboardPageLazy = React.lazy(() => import("@/pages/dashboard/DashboardPage"));
const WorkspaceAnalyticsPageLazy = React.lazy(() => import("@/pages/analytics/WorkspaceAnalyticsPage"));
const HomePage = lazy(() => import("@/pages/home/HomePage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
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
const HrPayrollWorkersPage = lazy(() => import("@/pages/hr/payroll/HrPayrollWorkersPage"));
const HrSettingsPage = lazy(() => import("@/pages/hr/settings/HrSettingsPage"));
const FinanceIncomePage = lazy(() => import("@/pages/finance/income/FinanceIncomePage"));
const FinanceItemsPage = lazy(() => import("@/pages/finance/items/FinanceItemsPage"));
const StatutoryDeductionManualEntryPage = lazy(() => import("@/pages/finance/deductions/StatutoryDeductionManualEntryPage"));
const FinanceLegacyManualEntryPage = lazy(() => import("@/pages/finance/requests/FinanceLegacyManualEntryPage"));

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
const DocumentEditorPage = lazy(() => import("@/pages/documents/DocumentEditorPage"));
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
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#ff6900] border-t-transparent animate-spin" />
        </div>
      );
    }
    if (status === "authenticated") return <DashboardPageLazy />;
    return <HomePageLazy />;
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
  getParentRoute: () => publicOnlyLayoutRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => publicOnlyLayoutRoute,
  path: "/register",
  component: RegisterPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => publicOnlyLayoutRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => publicOnlyLayoutRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

const reauthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reauth",
  component: SessionReauthPage,
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
  getParentRoute: () => protectedLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
});

// 6. HR & Workforce Routes
const attendanceRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/attendance",
  component: AttendancePage,
});

const leaveRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/leave",
  component: LeavePage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});

const adminUserBulkRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/users/bulk",
  component: AdminUserBulkPage,
});

const adminUserDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/users/$id",
  component: AdminUserDetailPage,
});

const adminGroupsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/groups",
  component: AdminGroupsPage,
});

const teamsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/teams",
  component: TeamsPage,
});

const teamDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/teams/$id",
  component: TeamDetailPage,
});

const hrEmployeesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/employees",
  component: HrEmployeesPage,
});

const hrEmployeeCreateRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/employees/create",
  component: HrEmployeeCreatePage,
});

const hrEmployeeDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/employees/$id",
  component: HrEmployeeDetailPage,
});

const hrEmployeeEditRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/employees/$id/edit",
  component: HrEmployeeEditPage,
});

// 7. Account & Self-Service Routes
const accountTimesheetsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/account/timesheets",
  component: TimesheetsPage,
});

const accountPayslipsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/account/payslips",
  component: PayslipsPage,
});

const accountProfileRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/account/profile",
  component: ProfilePage,
});

const accountSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/account/settings",
  component: AccountSettingsPage,
});

const accountNotificationsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/account/notifications",
  component: NotificationsPage,
});

const accountHelpRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/account/help",
  component: HelpPage,
});

const accountDownloadRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/account/downloads",
  component: DownloadPage,
});

// 8. Payroll Routes
const adminPayrollAuthRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/payroll/authorization",
  component: AdminPayrollAuthorizationPage,
});

const adminPayrollRunAuthRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/payroll/authorization/$id",
  component: AdminPayrollRunAuthorizePage,
});

const financePayrollRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/payroll",
  component: FinancePayrollPage,
});

const financePayrollComponentsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/payroll/components",
  component: FinancePayrollComponentsPage,
});

const financePayrollTaxTablesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/payroll/tax-tables",
  component: FinancePayrollTaxTablesPage,
});

const financePayrollRunDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/payroll/runs/$id",
  component: FinancePayrollRunDetailPage,
});

const hrPayrollLoansRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/payroll/loans",
  component: HrPayrollLoansPage,
});

const hrPayrollWorkersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/payroll/workers",
  component: HrPayrollWorkersPage,
});

const hrSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/settings",
  component: HrSettingsPage,
});

// 9. Finance & Accounting Routes
const financeRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance",
  component: FinanceDashboardPage,
});

const financeAccountsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/accounts",
  component: FinanceAccountsPage,
});

const financeAccountDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/accounts/$id",
  component: FinanceAccountDetailPage,
});

const financeChartAccountsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/chart-of-accounts",
  component: FinanceChartAccountsPage,
});

const financeBudgetsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/budgets",
  component: FinanceBudgetsPage,
});

const financeBudgetNewRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/budgets/new",
  component: FinanceBudgetEditorPage,
});

const financeBudgetDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/budgets/$id",
  component: FinanceBudgetDetailPage,
});

const financeExpensesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/expenses",
  component: FinanceExpensesPage,
});

const financeBillsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/bills",
  component: FinanceBillsPage,
});

const financeInvoicesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/invoices",
  component: FinanceSalesInvoicesPage,
});

const financeAssetsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/assets",
  component: FinanceAssetsPage,
});

const financeAssetNewRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/assets/new",
  component: FinanceAssetEditorPage,
});

const financeAssetDisposalsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/assets/disposals",
  component: FinanceAssetDisposalsPage,
});

const financeLedgerRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/ledger",
  component: FinanceLedgerPage,
});

const financeLedgerManualRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/ledger/manual",
  component: FinanceManualEntryPage,
});

const financePaymentVouchersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/payment-vouchers",
  component: FinancePaymentVouchersPage,
});

const financePayablesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/payables",
  component: FinancePayablesPage,
});

const financeReceivablesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/receivables",
  component: FinanceReceivablesPage,
});

const financeDeductionsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/deductions",
  component: StatutoryDeductionsPage,
});

const financeDeductionTypesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/deductions/types",
  component: FinanceDeductionTypesPage,
});

const financeReportsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/reports",
  component: FinanceReportsPage,
});

const financeReportDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/reports/$id",
  component: FinanceReportDetailPage,
});

const financeContactsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/contacts",
  component: FinanceContactsPage,
});

const financeCustomersRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/customers",
  component: () => <FinanceContactsPage defaultType="customer" />,
});

const financeVendorsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/vendors",
  component: () => <FinanceContactsPage defaultType="vendor" />,
});

const financeIncomeRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/income",
  component: FinanceIncomePage,
});

const financeItemsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/items",
  component: FinanceItemsPage,
});

const financeStatutoryDeductionManualEntryRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/manual-entry/statutory-deductions",
  component: StatutoryDeductionManualEntryPage,
});

const financeLegacyManualEntryRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/legacy-manual-entry",
  component: FinanceLegacyManualEntryPage,
});

const financeSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/settings",
  component: FinanceSettingsPage,
});

const financeRequestsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/requests",
  component: FinanceRequestsPage,
});

const financeRequestDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/requests/$id",
  component: FinanceRequestDetailsPage,
});

// 10. Workflows, Approvals & Operations Routes
const requestsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/requests",
  component: RequestsListPage,
});

const requestNewTypeRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/requests/new",
  component: RequestTypePage,
});

const requestNewFormRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/requests/new/form",
  component: RequestFormPage,
});

const requestDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/requests/$id",
  component: RequestDetailsPage,
});

const approvalsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/requests/approvals",
  component: ApprovalsPage,
});

const approvalDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/requests/approvals/$id",
  component: ApprovalRequestDetailsPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/projects",
  component: ProjectsPage,
});

const projectDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/projects/$id",
  component: ProjectDetailPage,
});

const adminProjectsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/projects",
  component: AdminProjectsPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/tasks",
  component: TasksPage,
});

const procurementRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/procurement",
  component: ProcurementIndex,
});

// 11. Documents & Media Routes
const documentsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/documents",
  component: DocumentsListPage,
});

const documentNewRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/documents/new",
  component: DocumentEditorPage,
});

const documentEditRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/documents/$id/edit",
  component: DocumentEditorPage,
});

const documentDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/documents/$id",
  component: DocumentDetailPage,
});

const policiesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/policies",
  component: PoliciesListPage,
});

const filesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/files",
  component: FilesPage,
});

const mailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/mail",
  component: MailPage,
});

const chatRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/chat",
  component: ChatPage,
});

// 12. Administration Routes
const adminRolesRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/roles",
  component: AdminRolesPage,
});

const adminOrgsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/organizations",
  component: AdminOrganizationsPage,
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/settings",
  component: AdminSettingsPage,
});

const AnalyticsAdminGatedPage = () => {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
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

  return <WorkspaceAnalyticsPageLazy />;
};

const analyticsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/analytics",
  component: AnalyticsAdminGatedPage,
});

// Compatibility alias routes for navigation links
const hrIndexAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr",
  component: () => <Navigate to="/hr/employees" replace />,
});
const hrAttendanceAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/attendance",
  component: AttendancePage,
});
const hrLeaveAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/leave",
  component: LeavePage,
});
const hrPayrollAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/hr/payroll",
  component: () => <Navigate to="/finance/payroll" replace />,
});
const profileAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/profile",
  component: ProfilePage,
});
const profilePayslipsAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/profile/payslips",
  component: PayslipsPage,
});
const profileTimesheetsAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/profile/timesheets",
  component: TimesheetsPage,
});
const settingsAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/settings",
  component: AccountSettingsPage,
});
const financeChartAccountsAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/chart-accounts",
  component: FinanceChartAccountsPage,
});
const financeSalesInvoicesAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/sales-invoices",
  component: FinanceSalesInvoicesPage,
});
const financeStatutoryDeductionsAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/statutory-deductions",
  component: StatutoryDeductionsPage,
});
const financeManualEntryAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/manual-entry",
  component: FinanceManualEntryPage,
});
const financeDeductionTypesAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/finance/deduction-types",
  component: FinanceDeductionTypesPage,
});
const adminFilesAliasRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin/files",
  component: FilesPage,
});

// 13. Vendor Portal Routes
const vendorDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendor-portal",
  component: VendorDashboardPage,
});

const vendorDashboardAliasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendor-portal/dashboard",
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

const vendorOrderDetailAliasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendor-portal/orders/$id",
  component: VendorDetailPage,
});

// Construct Unified TanStack Route Tree
const routeTree = rootRoute.addChildren([
  // Core Public
  indexRoute,
  homeRoute,
  pricingRoute,
  featuresRoute,
  securityRoute,

  // Public-only Auth
  publicOnlyLayoutRoute.addChildren([
    loginRoute,
    registerRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
  ]),

  // Semi-public Auth flows
  reauthRoute,
  verifyEmailRoute,
  acceptInviteRoute,
  onboardingRoute,

  // Protected Workspace Routes
  protectedLayoutRoute.addChildren([
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
    hrPayrollWorkersRoute,
    hrSettingsRoute,

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
    financeCustomersRoute,
    financeVendorsRoute,
    financeIncomeRoute,
    financeItemsRoute,
    financeStatutoryDeductionManualEntryRoute,
    financeLegacyManualEntryRoute,
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
    documentNewRoute,
    documentEditRoute,
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

    // Compatibility Aliases
    hrIndexAliasRoute,
    hrAttendanceAliasRoute,
    hrLeaveAliasRoute,
    hrPayrollAliasRoute,
    profileAliasRoute,
    profilePayslipsAliasRoute,
    profileTimesheetsAliasRoute,
    settingsAliasRoute,
    financeChartAccountsAliasRoute,
    financeSalesInvoicesAliasRoute,
    financeStatutoryDeductionsAliasRoute,
    financeManualEntryAliasRoute,
    financeDeductionTypesAliasRoute,
    adminFilesAliasRoute,
  ]),

  // Vendor Portal
  vendorDashboardRoute,
  vendorDashboardAliasRoute,
  vendorLoginRoute,
  vendorDetailRoute,
  vendorOrderDetailAliasRoute,
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
