import { useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { onDeepLink } from "@/lib/tauri-bridge";
import AttendancePage from "@/pages/hr/attendance/AttendancePage";
import LeavePage from "@/pages/hr/leave/LeavePage";
import LeaveRequestFormPage from "@/pages/hr/leave/LeaveRequestFormPage";
import LeaveRequestDetailsPage from "@/pages/hr/leave/LeaveRequestDetailsPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import FinanceDashboardPage from "@/pages/finance/dashboard/FinanceDashboardPage";
import FinanceRequestDetailsPage from "@/pages/finance/requests/FinanceRequestDetailsPage";
import FinancePaymentVouchersPage from "@/pages/finance/payment-vouchers/FinancePaymentVouchersPage";
import FinanceRequestsPage from "@/pages/finance/requests/FinanceRequestsPage";
import FinanceLedgerPage from "@/pages/finance/ledger/FinanceLedgerPage";
import FinanceBudgetsPage from "@/pages/finance/budgets/FinanceBudgetsPage";
import FinanceBudgetDetailPage from "@/pages/finance/budgets/FinanceBudgetDetailPage";
import FinanceBudgetEditorPage from "@/pages/finance/budgets/FinanceBudgetEditorPage";
import FinanceReceivablesPage from "@/pages/finance/receivables/FinanceReceivablesPage";
import FinancePayablesPage from "@/pages/finance/payables/FinancePayablesPage";
import FinanceAssetsPage from "@/pages/finance/assets/FinanceAssetsPage";
import FinanceAssetEditorPage from "@/pages/finance/assets/FinanceAssetEditorPage";
import FinanceAssetDisposalsPage from "@/pages/finance/assets/FinanceAssetDisposalsPage";
import FinanceReportsPage from "@/pages/finance/reports/FinanceReportsPage";
import FinanceReportDetailPage from "@/pages/finance/reports/FinanceReportDetailPage";
import FinanceSettingsPage from "@/pages/finance/settings/FinanceSettingsPage";
import FinanceDeductionTypesPage from "@/pages/finance/deductions/FinanceDeductionTypesPage";
import StatutoryDeductionsPage from "@/pages/finance/deductions/StatutoryDeductionsPage";
import FinanceChartAccountsPage from "@/pages/finance/accounts/FinanceChartAccountsPage";
import FinanceContactsPage from "@/pages/finance/contacts";
import FinanceAccountsPage from "@/pages/finance/accounts/FinanceAccountsPage";
import FinanceAccountDetailPage from "@/pages/finance/accounts/FinanceAccountDetailPage";
import FinanceItemsPage from "@/pages/finance/items/FinanceItemsPage";
import FinanceExpensesPage from "@/pages/finance/expenses/FinanceExpensesPage";
import FinanceIncomePage from "@/pages/finance/income/FinanceIncomePage";
import FinanceDonorsPage from "@/pages/finance/donors/FinanceDonorsPage";
import FinanceGrantsPage from "@/pages/finance/grants/FinanceGrantsPage";
import FinancePledgesPage from "@/pages/finance/pledges/FinancePledgesPage";
import FinanceBillsPage from "@/pages/finance/bills/FinanceBillsPage";
import FinanceSalesInvoicesPage from "@/pages/finance/invoices/FinanceSalesInvoicesPage";
import FinanceManualEntryPage from "@/pages/finance/ledger/FinanceManualEntryPage";
import StatutoryDeductionManualEntryPage from "@/pages/finance/deductions/StatutoryDeductionManualEntryPage";
import FinanceLegacyManualEntryPage from "@/pages/finance/requests/FinanceLegacyManualEntryPage";
import AdminRolesPage from "@/pages/admin/roles/AdminRolesPage";
import HrDashboardPage from "@/pages/hr/dashboard/HrDashboardPage";
import HrLeavePage from "@/pages/hr/leave/HrLeavePage";
import HrRequestDetailsPage from "@/pages/hr/requests/HrRequestDetailsPage";
import HrEmployeesPage from "@/pages/hr/employees/HrEmployeesPage";
import HrEmployeeCreatePage from "@/pages/hr/employees/HrEmployeeCreatePage";
import HrEmployeeDetailPage from "@/pages/hr/employees/HrEmployeeDetailPage";
import HrEmployeeEditPage from "@/pages/hr/employees/HrEmployeeEditPage";
import HrAttendancePage from "@/pages/hr/attendance/HrAttendancePage";
import HrSettingsPage from "@/pages/hr/settings/HrSettingsPage";
import HrPayrollPage from "@/pages/hr/payroll/HrPayrollPage";
import HrPayrollRunFormPage from "@/pages/hr/payroll/HrPayrollRunFormPage";
import HrPayrollRunDetailPage from "@/pages/hr/payroll/HrPayrollRunDetailPage";
import HrPayrollWorkersPage from "@/pages/hr/payroll/HrPayrollWorkersPage";
import FinancePayrollPage from "@/pages/finance/payroll/FinancePayrollPage";
import FinancePayrollRunDetailPage from "@/pages/finance/payroll/FinancePayrollRunDetailPage";
import AdminPayrollAuthorizationPage from "@/pages/admin/payroll/AdminPayrollAuthorizationPage";
import AdminPayrollRunAuthorizePage from "@/pages/admin/payroll/AdminPayrollRunAuthorizePage";
import FinancePayrollComponentsPage from "@/pages/finance/payroll/FinancePayrollComponentsPage";
import FinancePayrollTaxTablesPage from "@/pages/finance/payroll/FinancePayrollTaxTablesPage";
import HrPayrollWorkerDetailPage from "@/pages/hr/payroll/HrPayrollWorkerDetailPage";
import HrPayrollLoansPage from "@/pages/hr/payroll/HrPayrollLoansPage";
import AdminUsersPage from "@/pages/admin/users/AdminUsersPage";
import AdminUserDetailPage from "@/pages/admin/users/AdminUserDetailPage";
import AdminUserBulkPage from "@/pages/admin/users/AdminUserBulkPage";
import AdminSettingsPage from "@/pages/admin/settings/AdminSettingsPage";
import AdminOrganizationsPage from "@/pages/admin/organizations/AdminOrganizationsPage";
import AdminGroupsPage from "@/pages/admin/groups/AdminGroupsPage";
import AdminProjectsPage from "@/pages/admin/projects/AdminProjectsPage";
import AdminFilesPage from "@/pages/admin/files/AdminFilesPage";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import ProjectDetailPage from "@/pages/projects/ProjectDetailPage";
import TeamsPage from "@/pages/teams/TeamsPage";
import TeamDetailPage from "@/pages/teams/TeamDetailPage";
import TasksPage from "@/pages/tasks/TasksPage";
import FilesPage from "@/pages/files/FilesPage";
import MailPage from "@/pages/mail";
import ProcurementIndex from "@/pages/procurement/index";
import CreatePr from "@/pages/procurement/create";
import PrDetail from "@/pages/procurement/detail";
import PoIndex from "@/pages/procurement/orders/index";
import CreatePo from "@/pages/procurement/orders/create";
import PoDetail from "@/pages/procurement/orders/detail";
import VendorLogin from "@/pages/vendor-portal/login";
import VendorDashboard from "@/pages/vendor-portal/dashboard";
import VendorOrderDetail from "@/pages/vendor-portal/detail";
import DocumentsListPage from "@/pages/documents/DocumentsListPage";
import DocumentDetailPage from "@/pages/documents/DocumentDetailPage";
import PoliciesListPage from "@/pages/documents/PoliciesListPage";

import {
  ProtectedRoute,
  PublicOnlyRoute,
} from "@/shared/components/auth/RouteGuards";
import {
  ApprovalRoute,
  ModuleRoute,
  PermissionRoute,
} from "@/shared/components/auth/AccessRoute";
import { UpdateBanner } from "@/shared/components/ui/UpdateBanner";
import AcceptInvitePage from "@/pages/auth/AcceptInvitePage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import LoginPage from "@/pages/auth/LoginPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import SessionReauthPage from "@/pages/auth/SessionReauthPage";
import RequestDetailsPage from "@/pages/requests/RequestDetailsPage";
import ApprovalRequestDetailsPage from "@/pages/requests/ApprovalRequestDetailsPage";
import RequestFormPage from "@/pages/requests/new/RequestFormPage";
import RequestTypePage from "@/pages/requests/new/RequestTypePage";
import ApprovalsPage from "@/pages/requests/ApprovalsPage";
import RequestsListPage from "@/pages/requests/RequestsListPage";
import {
  DownloadPage,
  HelpPage,
  NotificationsPage,
  PayslipsPage,
  TimesheetsPage,
  ProfilePage,
  SettingsPage,
} from "@/pages/account";

type LegacyDetailRedirectProps = {
  toBase: string;
  fallbackPath?: string;
};

function LegacyDetailRedirect(props: LegacyDetailRedirectProps) {
  const [searchParams] = useSearchParams();
  const { id: pathId } = useParams<{ id?: string }>();
  const id = pathId || searchParams.get("id") || "";

  if (!id) {
    return <Navigate to={props.fallbackPath ?? props.toBase} replace />;
  }
  return <Navigate to={`${props.toBase}/${id}`} replace />;
}

export default function App() {
  const navigate = useNavigate();
  useEffect(() => {
    const unlisten = onDeepLink((url) => {
      try {
        const path = new URL(url).pathname || "/";
        navigate(path);
      } catch {
        // ignore malformed URLs
      }
    });
    return unlisten;
  }, [navigate]);

  return (
    <>
      <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/reauth" element={<SessionReauthPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/leave" element={<LeavePage />} />
        <Route path="/leave/new/form" element={<LeaveRequestFormPage />} />
        <Route
          path="/leave/details"
          element={<LegacyDetailRedirect toBase="/requests" fallbackPath="/leave" />}
        />
        <Route
          path="/leave/details/:id"
          element={<LegacyDetailRedirect toBase="/requests" fallbackPath="/leave" />}
        />
        <Route path="/requests" element={<RequestsListPage />} />
        <Route element={<ApprovalRoute />}>
          <Route path="/requests/approvals" element={<ApprovalsPage />} />
          <Route
            path="/requests/approvals/:id"
            element={<ApprovalRequestDetailsPage />}
          />
          <Route
            path="/requests/approvals/details"
            element={
              <LegacyDetailRedirect
                toBase="/requests/approvals"
                fallbackPath="/requests/approvals"
              />
            }
          />
          <Route
            path="/requests/approvals/details/:id"
            element={
              <LegacyDetailRedirect
                toBase="/requests/approvals"
                fallbackPath="/requests/approvals"
              />
            }
          />
        </Route>
        <Route path="/requests/new" element={<RequestTypePage />} />
        <Route path="/requests/new/form" element={<RequestFormPage />} />
        <Route path="/requests/:id" element={<RequestDetailsPage />} />
        <Route path="/procurement/create" element={<CreatePr />} />
        <Route
          path="/requests/details"
          element={<LegacyDetailRedirect toBase="/requests" fallbackPath="/requests" />}
        />
        <Route
          path="/requests/details/:id"
          element={<LegacyDetailRedirect toBase="/requests" fallbackPath="/requests" />}
        />
        <Route path="/requests/financial" element={<RequestFormPage />} />

        <Route
          element={
            <PermissionRoute
              requiredPermissions={[
                "procurement.view",
                "procurement.manage",
                "procurement.orders.manage",
                "procurement.grn.manage",
              ]}
              any
            />
          }
        >
          <Route path="/procurement" element={<ProcurementIndex />} />
          <Route path="/procurement/:id" element={<PrDetail />} />
          <Route path="/procurement/orders" element={<PoIndex />} />
          <Route path="/procurement/orders/create" element={<CreatePo />} />
          <Route path="/procurement/orders/:id" element={<PoDetail />} />
        </Route>
        
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route element={<ModuleRoute moduleKey="payroll" />}>
          <Route path="/profile/payslips" element={<PayslipsPage />} />
          <Route path="/profile/timesheets" element={<TimesheetsPage />} />
        </Route>
        <Route element={<ModuleRoute moduleKey="finance" />}>
          <Route element={<PermissionRoute requiredPermissions={["finance.view", "finance.manage", "finance.approve"]} any />}>
            <Route path="/finance" element={<FinanceDashboardPage />} />
            <Route path="/finance/requests" element={<FinanceRequestsPage />} />
            <Route
              path="/finance/requests/:id"
              element={<FinanceRequestDetailsPage />}
            />
            <Route
              path="/finance/requests/details"
              element={
                <LegacyDetailRedirect
                  toBase="/finance/requests"
                  fallbackPath="/finance/requests"
                />
              }
            />
            <Route
              path="/finance/requests/details/:id"
              element={
                <LegacyDetailRedirect
                  toBase="/finance/requests"
                  fallbackPath="/finance/requests"
                />
              }
            />
            <Route
              path="/finance/payment-vouchers"
              element={<FinancePaymentVouchersPage />}
            />
            <Route path="/finance/ledger" element={<FinanceLedgerPage />} />
            <Route path="/finance/chart-accounts" element={<FinanceChartAccountsPage />} />
            <Route path="/finance/accounts" element={<FinanceAccountsPage />} />
            <Route path="/finance/accounts/:id" element={<FinanceAccountDetailPage />} />
            <Route path="/finance/manual-entry" element={<FinanceManualEntryPage />} />
            <Route path="/finance/manual-entry/statutory-deductions" element={<StatutoryDeductionManualEntryPage />} />
            <Route path="/finance/legacy-manual-entry" element={<FinanceLegacyManualEntryPage />} />
            <Route path="/finance/statutory-deductions" element={<StatutoryDeductionsPage />} />
            <Route path="/finance/items" element={<FinanceItemsPage />} />
            <Route path="/finance/expenses" element={<FinanceExpensesPage />} />
            <Route path="/finance/income" element={<FinanceIncomePage />} />
            <Route path="/finance/donors" element={<FinanceDonorsPage />} />
            <Route path="/finance/grants" element={<FinanceGrantsPage />} />
            <Route path="/finance/pledges" element={<FinancePledgesPage />} />
            <Route path="/finance/bills" element={<FinanceBillsPage />} />
            <Route path="/finance/sales-invoices" element={<FinanceSalesInvoicesPage />} />
            <Route path="/finance/budgets" element={<FinanceBudgetsPage />} />
            <Route path="/finance/budgets/new" element={<FinanceBudgetEditorPage />} />
            <Route path="/finance/budgets/:id" element={<FinanceBudgetDetailPage />} />
            <Route path="/finance/budgets/:id/edit" element={<FinanceBudgetEditorPage />} />
            <Route path="/finance/receivables" element={<FinanceReceivablesPage />} />
            <Route path="/finance/receivables/:id" element={<FinanceReceivablesPage />} />
            <Route path="/finance/payables" element={<FinancePayablesPage />} />
            <Route path="/finance/assets" element={<FinanceAssetsPage />} />
            <Route path="/finance/assets/new" element={<FinanceAssetEditorPage />} />
            <Route path="/finance/assets/:id" element={<FinanceAssetEditorPage />} />
            <Route path="/finance/assets/disposals" element={<FinanceAssetDisposalsPage />} />
            <Route path="/finance/reports" element={<FinanceReportsPage />} />
            <Route path="/finance/reports/:reportKey" element={<FinanceReportDetailPage />} />
            <Route path="/finance/deduction-types" element={<FinanceDeductionTypesPage />} />
            <Route path="/finance/customers" element={<FinanceContactsPage defaultType="customer" />} />
            <Route path="/finance/vendors" element={<FinanceContactsPage defaultType="vendor" />} />
            <Route path="/finance/contacts" element={<FinanceContactsPage defaultType="both" />} />

            <Route element={<PermissionRoute requiredPermissions={["finance.manage"]} any />}>
              <Route path="/finance/settings" element={<FinanceSettingsPage />} />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["payroll.approve"]} />}>
              <Route path="/finance/payroll" element={<FinancePayrollPage />} />
              <Route path="/finance/payroll/runs/:id" element={<FinancePayrollRunDetailPage />} />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["finance.manage"]} any />}>
              <Route path="/finance/payroll/components" element={<FinancePayrollComponentsPage />} />
              <Route path="/finance/payroll/tax-tables" element={<FinancePayrollTaxTablesPage />} />
            </Route>
          </Route>
        </Route>
        <Route element={<ModuleRoute moduleKey="hr" />}>
          <Route element={<PermissionRoute requiredPermissions={["hr.view"]} any />}>
            <Route path="/hr" element={<HrDashboardPage />} />

            <Route element={<PermissionRoute requiredPermissions={["hr.manage", "hr.employees"]} any />}>
              <Route path="/hr/employees" element={<HrEmployeesPage />} />
              <Route path="/hr/employees/:id" element={<HrEmployeeDetailPage />} />
              <Route path="/hr/employees/:id/edit" element={<HrEmployeeEditPage />} />
              <Route element={<PermissionRoute requiredPermissions={["hr.manage"]} />}>
                <Route path="/hr/employees/new" element={<HrEmployeeCreatePage />} />
              </Route>
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["attendance.view", "attendance.manage", "attendance.approve"]} any />}>
              <Route path="/hr/attendance" element={<HrAttendancePage />} />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["leave.view", "leave.manage", "leave.approve"]} any />}>
              <Route path="/hr/leave" element={<HrLeavePage />} />
              <Route
                path="/hr/requests/:id"
                element={<HrRequestDetailsPage />}
              />
              <Route
                path="/hr/requests/details"
                element={
                  <LegacyDetailRedirect
                    toBase="/hr/requests"
                    fallbackPath="/hr/leave"
                  />
                }
              />
              <Route
                path="/hr/requests/details/:id"
                element={
                  <LegacyDetailRedirect
                    toBase="/hr/requests"
                    fallbackPath="/hr/leave"
                  />
                }
              />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["payroll.manage"]} />}>
              <Route path="/hr/payroll" element={<HrPayrollPage />} />
              <Route path="/hr/payroll/runs/new" element={<HrPayrollRunFormPage />} />
              <Route path="/hr/payroll/runs/:id" element={<HrPayrollRunDetailPage />} />
              <Route path="/hr/payroll/workers" element={<HrPayrollWorkersPage />} />
              <Route path="/hr/payroll/workers/:id" element={<HrPayrollWorkerDetailPage />} />
              <Route path="/hr/payroll/loans" element={<HrPayrollLoansPage />} />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["hr.manage", "admin.manage"]} any />}>
              <Route path="/hr/settings" element={<HrSettingsPage />} />
            </Route>
          </Route>
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leave" element={<LeavePage />} />
          <Route path="/leave/new/form" element={<LeaveRequestFormPage />} />
          <Route
            path="/leave/details"
            element={<LegacyDetailRedirect toBase="/requests" fallbackPath="/leave" />}
          />
          <Route
            path="/leave/details/:id"
            element={<LegacyDetailRedirect toBase="/requests" fallbackPath="/leave" />}
          />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:id" element={<TeamDetailPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
           <Route path="/files" element={<FilesPage />} />
          <Route path="/mail" element={<MailPage />} />
          <Route path="/documents" element={<DocumentsListPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/policies" element={<PoliciesListPage />} />
        </Route>
        <Route element={<ModuleRoute moduleKey="admin" />}>
          <Route element={<PermissionRoute requiredPermissions={["admin.view"]} any />}>
            <Route element={<PermissionRoute requiredPermissions={["users.view", "users.manage"]} any />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/users/bulk" element={<AdminUserBulkPage />} />
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["roles.manage"]} any />}>
              <Route path="/admin/roles" element={<AdminRolesPage />} />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["groups.view", "groups.manage"]} any />}>
              <Route path="/admin/groups" element={<AdminGroupsPage />} />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["projects.view", "projects.manage"]} any />}>
              <Route path="/admin/projects" element={<AdminProjectsPage />} />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["admin.manage"]} any />}>
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/organizations" element={<AdminOrganizationsPage />} />
            </Route>

            <Route element={<PermissionRoute requiredPermissions={["payroll.authorize"]} any />}>
              <Route path="/admin/payroll/authorization" element={<AdminPayrollAuthorizationPage />} />
              <Route path="/admin/payroll/authorize/:id" element={<AdminPayrollRunAuthorizePage />} />
            </Route>

            <Route path="/admin/files" element={<AdminFilesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/vendor-portal/login" element={<VendorLogin />} />
      <Route path="/vendor-portal/dashboard" element={<VendorDashboard />} />
      <Route path="/vendor-portal/orders/:id" element={<VendorOrderDetail />} />

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <UpdateBanner />
    </>
  );
}
