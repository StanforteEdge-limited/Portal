import { useNavigate } from "react-router-dom";
import { Link } from "@/shared/router-adapter";
import { PortalLayout } from "@/components/layout/PortalLayout";
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
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link to="/finance" className="hover:text-slate-800 transition">
                Finance
              </Link>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="text-[#ff6900]">Budgets & Plans</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Budgets & Fiscal Envelopes
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track approved departmental budgets, capital expenditure plans, and variance analyses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/finance/budgets/new")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition transform hover:-translate-y-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Budget</span>
            </button>
          </div>
        </div>

        {/* Budget Workspace Embedded Area */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6">
          <BudgetWorkspace context={{ scopeType: "finance", mode: "finance" }} layout="full-page" />
        </div>
      </div>
    </PortalLayout>
  );
}
