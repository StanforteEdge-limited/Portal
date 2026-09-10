import { useParams, useNavigate } from "react-router-dom";
import { AppShell, PageHeader, Button } from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import BudgetWorkspace from "@/features/budgets/BudgetWorkspace";

export default function FinanceBudgetDetailPage() {
  const { id } = useParams<{ id: string }>();
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
        eyebrow="Budget Details"
        breadcrumbs={[
          { label: "Finance", path: "/finance" },
          { label: "Budgets", path: "/finance/budgets" },
          { label: "Detail" },
        ]}
        title="Budget Detail"
        actions={
          <Button variant="secondary" onClick={() => navigate("/finance/budgets")}>
            Back to List
          </Button>
        }
      />

      {id ? (
        <BudgetWorkspace context={{ scopeType: "finance", mode: "finance" }} selectedBudgetId={id} layout="full-page" />
      ) : (
        <div style={{ padding: "24px", color: "#dc2626", fontSize: "14px" }}>Budget ID not provided.</div>
      )}
    </AppShell>
  );
}
