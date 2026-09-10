import { useParams, useNavigate } from "react-router-dom";
import { AppShell, PageHeader, Button } from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import BudgetEditorPanel from "@/features/budgets/BudgetEditorPanel";

export default function FinanceBudgetEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";
  const isEditing = Boolean(id);

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-budgets"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Budget Editor"
        breadcrumbs={[
          { label: "Finance", path: "/finance" },
          { label: "Budgets", path: "/finance/budgets" },
          { label: isEditing ? "Edit" : "New" },
        ]}
        title={isEditing ? "Edit Budget" : "Create New Budget"}
        actions={<Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>}
      />

      <BudgetEditorPanel
        context={{ scopeType: "finance", mode: "finance" }}
        budgetId={id}
        onSaved={(savedId) => navigate(`/finance/budgets/${savedId}`)}
        onCancel={() => navigate(-1)}
      />
    </AppShell>
  );
}
