import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { procurementApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import {
  ShoppingBag,
  Inbox,
  FileCheck,
  CreditCard,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Building,
  Plus,
  RefreshCw,
} from "lucide-react";

export default function ProcurementIndex() {
  const { user } = useAuth();
  const [intake, setIntake] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      procurementApi.listIntake(),
      procurementApi.listPrs(),
    ])
      .then(([intakeData, prsData]) => {
        setIntake(intakeData || []);
        setPrs(prsData || []);
      })
      .catch(() => {
        setIntake([]);
        setPrs([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCase = async (requestId: string) => {
    try {
      await procurementApi.createCaseFromRequest(requestId, { note: "Accepted into procurement" });
      setIntake((prev) => prev.filter((i) => i.id !== requestId));
    } catch {
      // error handled
    }
  };

  const totalCommitted = prs.reduce((sum, pr) => sum + Number(pr.estimatedTotal || 0), 0);

  return (
    <PortalLayout activeNav="Finance & Procurement">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link to="/dashboard" className="hover:text-slate-800 transition">Dashboard</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/finance" className="hover:text-slate-800 transition">Finance & Procurement</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-800 font-semibold">Procurement</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-headline">
              Procurement & Sourcing Hub
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review approved operational requisitions, generate purchase cases, and issue purchase orders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#ff6900]" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-xs font-bold shadow-sm shadow-orange-500/20 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Raise Requisition</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Inbox className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Intake Queue</div>
                <div className="text-xl font-black text-amber-600 mt-0.5">{intake.length}</div>
              </div>
            </div>
            {intake.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />}
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Active Requisitions</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{prs.length}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Sourcing
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Estimated Total</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {formatCurrency(totalCommitted, "NGN")}
                </div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Committed
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Vendor Management</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">Verified</div>
              </div>
            </div>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              Connected
            </span>
          </div>
        </div>

        {/* Intake Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Incoming Requisition Intake</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Approved procurement requests awaiting formal sourcing case conversion.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{intake.length} pending cases</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Requester</th>
                  <th className="py-3.5 px-4">Title / Specification</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {intake.length > 0 ? (
                  intake.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        {item.creator
                          ? `${item.creator.firstName || ""} ${item.creator.lastName || ""}`.trim() || item.creator.email || "Staff"
                          : "Staff"}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.data?.title || item.summary || "Requisition Specification"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleCreateCase(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff6900] hover:bg-[#e05d00] text-white text-[11px] font-bold shadow-sm transition active:scale-95"
                        >
                          <span>Convert to Case</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No incoming requests awaiting intake.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Purchase Requisitions Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Purchase Requisitions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track status across RFQ quotation, vendor selection, and Purchase Order issuance.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{prs.length} requisitions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Requisition #</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Est. Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {prs.length > 0 ? (
                  prs.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                        {pr.requisitionNumber || `PR-${pr.id.slice(0, 6)}`}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {pr.title}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-slate-600 font-medium">
                        {pr.category || "General Supplies"}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(Number(pr.estimatedTotal || 0), "NGN")}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {String(pr.status || "active").replaceAll("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to={`/procurement/${pr.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff6900] hover:text-[#e05d00] transition"
                        >
                          <span>Review</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <p className="font-semibold text-slate-700 text-sm">No requisitions created</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Convert an approved request from the intake queue above to create a purchase requisition.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
