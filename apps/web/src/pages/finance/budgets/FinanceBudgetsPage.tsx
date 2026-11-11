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
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <button
              type="button"
              onClick={() => navigate("/finance/budgets/new")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              <span>New Budget</span>
            </button>
          }
        />

        {/* Budget Workspace Embedded Area */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6">
          <BudgetWorkspace context={{ scopeType: "finance", mode: "finance" }} layout="full-page" />
        </div>
      </div>
    </PortalLayout>
  );
}
