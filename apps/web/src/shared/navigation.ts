import type { SidebarItem } from "@/shared";

export type MobileNavItem = {
  label: string;
  icon: string;
  path?: string;
  active?: boolean;
};

/**
 * Build the main application navigation sidebar.
 * All modules (Staff, Finance, HR) are registered here.
 * Permission-based filtering happens in AppShell using hasAnyPermission.
 */
export function buildAppNavigation(options?: {
  includeRequestDetails?: boolean;
  requestDetailsPath?: string;
  requestDetailsParent?: "requests" | "finance";
}): SidebarItem[] {
  const includeDetails = options?.includeRequestDetails ?? false;
  const detailsParent = options?.requestDetailsParent ?? "requests";
  const detailsPath =
    options?.requestDetailsPath ??
    (detailsParent === "finance"
      ? "/finance/requests"
      : "/requests");

  const requestDetailsItem = {
    label: "Request Details",
    icon: "description",
    path: detailsPath,
  };

  const financeRequestDetailsItem = {
    key: "finance-request-details",
    label: "Request Details",
    icon: "description",
    path: detailsPath,
  };

  return [
    // Staff section
    { label: "Dashboard", icon: "grid_view", path: "/", section: "Staff" },
    {
      label: "Requests",
      icon: "format_list_bulleted",
      section: "Staff",
      children: [
        { label: "My Requests", icon: "list_alt", path: "/requests" },
        { label: "Approvals", icon: "task_alt", path: "/requests/approvals", permissions: ["requests.approve"], requiresTeamLeadAssignment: true },
        { label: "New Request", icon: "add_circle", path: "/requests/new" },
        ...(includeDetails && detailsParent === "requests"
          ? [requestDetailsItem]
          : []),
      ],
    },
    { key: "my-tasks", label: "Tasks", icon: "checklist", path: "/tasks", section: "Staff" },
    { label: "Attendance", icon: "pending_actions", path: "/attendance", section: "Staff" },
    {
      label: "Workspace",
      icon: "workspaces",
      section: "Staff",
      children: [
        { key: "workspace-groups", label: "Groups", icon: "groups", path: "/teams" },
        { key: "workspace-projects", label: "Projects", icon: "assignment", path: "/projects" },
        { key: "workspace-documents", label: "Documents", icon: "description", path: "/documents" },
      ],
    },
    { key: "mail", label: "Mail", icon: "mail", path: "/mail", section: "Staff" },
    {
      label: "Profile",
      icon: "person",
      section: "Staff",
      children: [
        { label: "My Profile", icon: "person", path: "/profile" },
        { label: "Policies & Sign-offs", icon: "policy", path: "/policies" },
        { label: "Payslips", icon: "receipt_long", path: "/profile/payslips" },
        { label: "Leave", icon: "event_available", path: "/leave" },
        { label: "Settings", icon: "settings", path: "/settings" },
      ],
    },

    // Finance section - filtered by AppShell using permissions
    {
      label: "Finance",
      icon: "account_balance_wallet",
      section: "Admin",
      permissions: ["finance.view"],
      children: [
        { key: "finance-dashboard", label: "Dashboard", icon: "grid_view", path: "/finance" },
        {
          key: "finance-group-workflows",
          label: "Workflows",
          icon: "build",
          children: [
            { key: "finance-requests", label: "Requests", icon: "receipt_long", path: "/finance/requests" },
            { key: "finance-vouchers", label: "Payment Vouchers", icon: "payments", path: "/finance/payment-vouchers", permissions: ["finance.vouchers"] },
            { key: "finance-budgets", label: "Budgets", icon: "savings", path: "/finance/budgets", permissions: ["finance.manage"] },
            { key: "finance-statutory-deductions", label: "Statutory Deductions", icon: "account_balance", path: "/finance/statutory-deductions", permissions: ["finance.manage"] },
            ...(includeDetails && detailsParent === "finance"
              ? [financeRequestDetailsItem]
              : []),
          ],
        },
        {
          key: "finance-group-manual-entries",
          label: "Manual Entries",
          icon: "edit_note",
          children: [
            { key: "finance-manual-entry", label: "Journal Entry", icon: "edit_note", path: "/finance/manual-entry", permissions: ["finance.manage"] },
            { key: "finance-statutory-deduction-entry", label: "Statutory Deduction Entry", icon: "account_balance", path: "/finance/manual-entry/statutory-deductions", permissions: ["finance.manage"] },
            { key: "finance-legacy-manual-entry", label: "Request Manual Entry", icon: "receipt_long", path: "/finance/legacy-manual-entry", permissions: ["finance.manage"] },
          ],
        },
        {
          key: "finance-group-accounting",
          label: "Accounting",
          icon: "book",
          children: [
            { key: "finance-ledger", label: "Ledger", icon: "book", path: "/finance/ledger" },
            { key: "finance-chart-accounts", label: "Chart of Accounts", icon: "account_balance", path: "/finance/chart-accounts", permissions: ["finance.manage"] },
            { key: "finance-accounts", label: "Bank & Cash", icon: "account_balance_wallet", path: "/finance/accounts", permissions: ["finance.manage"] },
            { key: "finance-reports", label: "Reports", icon: "insights", path: "/finance/reports" },
          ],
        },
        {
          key: "finance-group-receivables",
          label: "Receivables",
          icon: "trending_up",
          children: [
            { key: "finance-sales-invoices", label: "Sales Invoices", icon: "request_quote", path: "/finance/sales-invoices", permissions: ["finance.manage"] },
            { key: "finance-income", label: "Income", icon: "payments", path: "/finance/income" },
            { key: "finance-receivables", label: "Receivables", icon: "request_quote", path: "/finance/receivables" },
            { key: "finance-customers", label: "Customers", icon: "person", path: "/finance/customers", permissions: ["finance.manage"] },
          ],
        },
        {
          key: "finance-group-money-out",
          label: "Payables",
          icon: "trending_down",
          children: [
            { key: "finance-bills", label: "Bills", icon: "receipt_long", path: "/finance/bills", permissions: ["finance.manage"] },
            { key: "finance-expenses", label: "Expenses", icon: "receipt", path: "/finance/expenses" },
            { key: "finance-payables", label: "Payables", icon: "payments", path: "/finance/payables" },
            { key: "finance-vendors", label: "Vendors", icon: "local_shipping", path: "/finance/vendors", permissions: ["finance.manage"] },
            { key: "finance-contacts", label: "All Contacts", icon: "contacts", path: "/finance/contacts", permissions: ["finance.manage"] },
          ],
        },
        {
          key: "finance-group-fixed-assets",
          label: "Fixed Assets",
          icon: "inventory_2",
          children: [
            { key: "finance-assets", label: "Asset Register", icon: "inventory_2", path: "/finance/assets", permissions: ["finance.manage"] },
            { key: "finance-assets-disposals", label: "Disposals", icon: "delete_sweep", path: "/finance/assets/disposals", permissions: ["finance.manage"] },
          ],
        },
        {
          key: "finance-group-payroll",
          label: "Payroll",
          icon: "account_balance",
          children: [
            { key: "finance-payroll", label: "Payroll", icon: "account_balance", path: "/finance/payroll", permissions: ["payroll.approve"] },
            { key: "finance-deduction-types", label: "Deduction Types", icon: "percent", path: "/finance/deduction-types", permissions: ["finance.manage"] },
            { key: "finance-payroll-components", label: "Salary Components", icon: "account_balance", path: "/finance/payroll/components", permissions: ["finance.manage"] },
            { key: "finance-payroll-tax-tables", label: "Tax Tables", icon: "percent", path: "/finance/payroll/tax-tables", permissions: ["finance.manage"] },
          ],
        },
        {
          key: "finance-group-setup",
          label: "Setup",
          icon: "settings",
          children: [
            { key: "finance-items", label: "Products & Services", icon: "inventory", path: "/finance/items", permissions: ["finance.manage"] },
            { key: "finance-settings", label: "Settings", icon: "settings", path: "/finance/settings", permissions: ["finance.manage"] },
          ],
        },
      ],
    },
    // HR section - filtered by AppShell using permissions
    {
      label: "HR",
      icon: "people",
      section: "Admin",
      permissions: ["hr.view"],
      children: [
        { key: "hr-dashboard", label: "Overview", icon: "dashboard", path: "/hr", permissions: ["hr.view"] },
        { key: "hr-employees", label: "Employees", icon: "group", path: "/hr/employees", permissions: ["hr.manage", "hr.employees"] },
        { key: "hr-attendance", label: "Attendance", icon: "pending_actions", path: "/hr/attendance", permissions: ["attendance.view", "attendance.manage", "attendance.approve"] },
        { key: "hr-leave", label: "Leave", icon: "event_available", path: "/hr/leave", permissions: ["leave.view", "leave.manage", "leave.approve"] },
        {
          key: "hr-payroll-group",
          label: "Payroll",
          icon: "payments",
          permissions: ["payroll.manage"],
          children: [
            { key: "hr-payroll", label: "Payroll Runs", icon: "receipt_long", path: "/hr/payroll", permissions: ["payroll.manage"] },
            { key: "hr-payroll-workers", label: "Workers", icon: "group", path: "/hr/payroll/workers", permissions: ["payroll.manage"] },
            { key: "hr-payroll-loans", label: "Loans", icon: "credit_score", path: "/hr/payroll/loans", permissions: ["payroll.manage"] },
          ],
        },
        { key: "hr-settings", label: "Settings", icon: "settings", path: "/hr/settings", permissions: ["hr.manage"] },
      ],
    },

    // Administration section - filtered by AppShell using permissions
    {
      label: "Administration",
      icon: "manage_accounts",
      section: "Admin",
      permissions: ["admin.view"],
      children: [
        { key: "admin-procurement", label: "Procurement", icon: "shopping_cart", path: "/procurement", permissions: ["procurement.view", "procurement.manage"] },
        { key: "admin-users", label: "Users", icon: "people", path: "/admin/users", permissions: ["users.view", "users.manage"] },
        { key: "admin-organizations", label: "Organizations", icon: "domain", path: "/admin/organizations", permissions: ["admin.manage"] },
        { key: "admin-roles", label: "Roles", icon: "admin_panel_settings", path: "/admin/roles", permissions: ["roles.manage"] },
        { key: "admin-groups", label: "Groups", icon: "groups", path: "/admin/groups", permissions: ["groups.manage"] },
        { key: "admin-projects", label: "Projects", icon: "assignment", path: "/admin/projects", permissions: ["projects.manage"] },
        { key: "admin-files", label: "Files", icon: "folder", path: "/admin/files", permissions: ["admin.manage"] },
        { key: "admin-payroll-auth", label: "Payroll Authorization", icon: "verified", path: "/admin/payroll/authorization", permissions: ["payroll.authorize"] },
      ],
    },
    {
      label: "System Settings",
      icon: "settings_applications",
      section: "Admin",
      permissions: ["admin.manage"],
      children: [
        { key: "system-settings", label: "Platform Settings", icon: "settings", path: "/admin/settings", permissions: ["admin.manage"] },
      ],
    },
  ];
}

/**
 * Build mobile bottom navigation.
 */
export function buildAppMobileNav(activeLabel: "Requests" | "Tasks" | "Attendance" | "Workspace" | "Profile" | "Dashboard" | "Finance" | "HR" | "Employees" = "Requests"): MobileNavItem[] {
  return [
    { label: "Dashboard", icon: "grid_view", path: "/", active: activeLabel === "Dashboard" },
    { label: "Requests", icon: "format_list_bulleted", path: "/requests", active: activeLabel === "Requests" },
    { label: "Tasks", icon: "checklist", path: "/tasks", active: activeLabel === "Tasks" },
    { label: "Attendance", icon: "pending_actions", path: "/attendance", active: activeLabel === "Attendance" },
    { label: "More", icon: "menu", active: ["Workspace", "Profile", "Finance", "HR", "Employees"].includes(activeLabel) },
  ];
}
