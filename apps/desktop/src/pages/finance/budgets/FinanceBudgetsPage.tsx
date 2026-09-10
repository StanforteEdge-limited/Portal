import { useNavigate } from "react-router-dom";
import { AppShell, PageHeader, Button } from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import BudgetWorkspace from "@/features/budgets/BudgetWorkspace";

export default function FinanceBudgetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-budgets"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Budgets" }]}
        title="Budgets"
        description="Track approved budgets, actual spend, and variance in one view."
        actions={<Button onClick={() => navigate("/finance/budgets/new")}>New Budget</Button>}
      />

      <BudgetWorkspace context={{ scopeType: "finance", mode: "finance" }} layout="full-page" />
    </AppShell>
  );
}
