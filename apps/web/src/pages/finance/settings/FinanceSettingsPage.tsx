import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell, PageHeader, SectionCard, SidebarTabs, Button } from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import ChartOfAccountsTab from "./tabs/ChartOfAccountsTab";
import ReportingPeriodsTab from "./tabs/ReportingPeriodsTab";
import NonprofitSetupTab from "./tabs/NonprofitSetupTab";

export default function FinanceSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"chart" | "periods" | "nonprofit">("chart");

  const navItems = [
    { id: "chart", label: "Chart of Accounts", icon: "account_tree" },
    { id: "periods", label: "Reporting Periods", icon: "calendar_month" },
    { id: "nonprofit", label: "Nonprofit Setup", icon: "volunteer_activism" },
  ];

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Finance Admin";

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-settings"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Settings" }]}
        title="Finance Settings"
        description="Manage chart structure, periods, and nonprofit classifications."
      />

      <SidebarTabs items={navItems} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as typeof activeTab)}>
        <SectionCard>
          {activeTab === "chart" && <ChartOfAccountsTab />}
          {activeTab === "periods" && <ReportingPeriodsTab />}
          {activeTab === "nonprofit" && <NonprofitSetupTab />}
        </SectionCard>
      </SidebarTabs>

      <SectionCard title="Party Management">
        <p className="text-sm text-slate-500 mb-4">Manage customers and vendors as dedicated entities with full transaction history.</p>
        <div className="flex gap-3">
          <Link to="/finance/customers">
            <Button variant="secondary">View Customers</Button>
          </Link>
          <Link to="/finance/vendors">
            <Button variant="secondary">View Vendors</Button>
          </Link>
        </div>
      </SectionCard>
    </AppShell>
  );
}
