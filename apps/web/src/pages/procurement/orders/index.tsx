import { useEffect, useState, useMemo } from "react";
import { Link } from "@/shared/router-adapter";
import { procurementApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { PageHeader } from "@/shared";
import {
  ShoppingCart,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Plus,
  ArrowRight,
  DollarSign,
  FileText,
} from "lucide-react";

export default function PoIndex() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    procurementApi
      .listPos()
      .then((data: any) => setPos(Array.isArray(data) ? data : []))
      .catch(() => setPos([]))
      .finally(() => setLoading(false));
  }, []);

  const totalAmount = useMemo(() => {
    return pos.reduce((sum, po) => sum + (Number(po.totalAmount) || 0), 0);
  }, [pos]);

  const approvedCount = pos.filter((po) =>
    ["approved", "acknowledged", "received"].includes(po.status)
  ).length;

  const pendingCount = pos.filter((po) =>
    ["draft", "pending_approval"].includes(po.status)
  ).length;

  const statusColor: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    acknowledged: "bg-blue-50 text-blue-700 border-blue-200",
    received: "bg-purple-50 text-purple-700 border-purple-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <PortalLayout activeNav="Procurement">
      <div className="space-y-6">
        {/* Modern Unified Page Header (No Breadcrumbs) */}
        <PageHeader
          title="Purchase Orders"
          description="Generate, track, and manage official purchase orders issued to certified suppliers and vendors."
          icon={ShoppingCart}
          iconColor="bg-orange-50 text-[#ff6900]"
          actions={
            <Link
              to="/procurement/orders/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff6900] hover:bg-[#ea580c] text-white text-xs font-bold shadow-md shadow-orange-500/20 transition transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create Purchase Order</span>
            </Link>
          }
        />

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6900] flex items-center justify-center shrink-0">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Total Orders</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{pos.length}</div>
              </div>
            </div>
            <div className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              POs
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Approved & Issued</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">{approvedCount}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Pending Review</div>
              <div className="text-xl font-black text-amber-600 mt-0.5">{pendingCount}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Total Commitment</div>
              <div className="text-lg font-black text-blue-700 mt-0.5 font-mono">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              All Purchase Orders ({pos.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-medium text-slate-400">
              Loading purchase orders...
            </div>
          ) : pos.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No purchase orders found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Generate a purchase order from an approved requisition.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-5">PO Number</th>
                    <th className="py-3 px-4">Requisition & Title</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pos.map((po) => (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                        {po.poNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 group-hover:text-[#ff6900] transition-colors truncate">
                            {po.requisition ? `${po.requisition.requisitionNumber} - ${po.requisition.title}` : "Direct PO"}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {po.vendor?.name || "Unassigned Vendor"}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {formatCurrency(Number(po.totalAmount))}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${
                            statusColor[po.status] ?? "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {po.status?.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to={`/procurement/orders/${po.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 group-hover:text-white group-hover:bg-[#ff6900] border border-slate-200 group-hover:border-[#ff6900] transition shadow-sm"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
