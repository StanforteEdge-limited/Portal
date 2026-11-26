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
    draft: "bg-neutral-100 text-neutral-700 border-neutral-200",
    pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    acknowledged: "bg-neutral-100 text-neutral-700 border-neutral-200",
    received: "bg-neutral-100 text-neutral-700 border-neutral-200",
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
          iconColor="bg-orange-50 text-[#C2410C]"
          actions={
            <Link
              to="/procurement/orders/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-medium shadow-md transition transform"
            >
              <Plus className="h-4 w-4" />
              <span>Create Purchase Order</span>
            </Link>
          }
        />

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-100 shadow-2xs hover:border-neutral-200/80 transition-colors flex flex-col justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-50 text-[#C2410C] flex items-center justify-center shrink-0">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-[#C2410C] bg-orange-50 px-2 py-0.5 rounded-full shrink-0">
                POs
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Total Orders</div>
              <div className="text-lg sm:text-2xl font-semibold text-neutral-900 mt-0.5 tracking-tight truncate">{pos.length}</div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-100 shadow-2xs hover:border-neutral-200/80 transition-colors flex flex-col justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                Issued
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Approved & Issued</div>
              <div className="text-lg sm:text-2xl font-semibold text-emerald-600 mt-0.5 tracking-tight truncate">{approvedCount}</div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-100 shadow-2xs hover:border-neutral-200/80 transition-colors flex flex-col justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
                Review
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Pending Review</div>
              <div className="text-lg sm:text-2xl font-semibold text-amber-600 mt-0.5 tracking-tight truncate">{pendingCount}</div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-neutral-100 shadow-2xs hover:border-neutral-200/80 transition-colors flex flex-col justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center justify-between gap-1.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full shrink-0">
                Committed
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-semibold text-neutral-500 truncate">Total Commitment</div>
              <div className="text-base sm:text-xl font-semibold text-neutral-900 mt-0.5 tracking-tight truncate font-mono">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <div className="rounded-2xl bg-white border border-neutral-100 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-xs font-medium text-neutral-400">
              All Purchase Orders ({pos.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs font-medium text-neutral-400">
              Loading purchase orders...
            </div>
          ) : pos.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-neutral-700">No purchase orders found</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                Generate a purchase order from an approved requisition.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-100 text-xs font-medium text-neutral-400">
                    <th className="py-3 px-5">PO Number</th>
                    <th className="py-3 px-4">Requisition & Title</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  {pos.map((po) => (
                    <tr
                      key={po.id}
                      className="hover:bg-neutral-50/80 transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-mono font-medium text-neutral-900">
                        {po.poNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 group-hover:text-[#C2410C] transition-colors truncate">
                            {po.requisition ? `${po.requisition.requisitionNumber} - ${po.requisition.title}` : "Direct PO"}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-neutral-800">
                        {po.vendor?.name || "Unassigned Vendor"}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-neutral-900">
                        {formatCurrency(Number(po.totalAmount))}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${
                            statusColor[po.status] ?? "bg-neutral-100 text-neutral-700 border-neutral-200"
                          }`}
                        >
                          {po.status?.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to={`/procurement/orders/${po.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-700 group-hover:text-white group-hover:bg-[#C2410C] border border-neutral-200 group-hover:border-[#C2410C] transition shadow-sm"
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
