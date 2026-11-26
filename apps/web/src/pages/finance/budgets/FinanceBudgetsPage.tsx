import { useNavigate } from "react-router-dom";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import BudgetWorkspace from "@/features/budgets/BudgetWorkspace";
import {
  PieChart,
  ChevronRight,
  Plus,
  ArrowRight,
  Wallet,
  TrendingUp,
  Building2,
} from "lucide-react";

export default function FinanceBudgetsPage() {
  const navigate = useNavigate();

  return (
    <PortalLayout activeNav="Budgets & Plans">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Budgets & Fiscal Envelopes"
          description="Track approved departmental budgets, capital expenditure plans, and variance analyses."
          icon={PieChart}
          iconColor="bg-orange-50 text-[#C2410C]"
          actions={
            <button
              type="button"
              onClick={() => navigate("/finance/budgets/new")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-medium shadow-md transition transform"
            >
              <Plus className="h-4 w-4" />
              <span>New Budget</span>
            </button>
          }
        />

        {/* Budget Workspace Embedded Area */}
        <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-sm p-6">
          <BudgetWorkspace context={{ scopeType: "finance", mode: "finance" }} layout="full-page" />
        </div>
      </div>
    </PortalLayout>
  );
}
