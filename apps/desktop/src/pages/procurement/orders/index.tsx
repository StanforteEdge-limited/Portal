import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { procurementApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { SectionCard } from '@/shared';
import { AppShell } from '@/shared/components/layout/AppShell';
import { buildAppNavigation, buildAppMobileNav } from '@/shared/navigation';
import { useAuth } from '@/shared/context/AuthProvider';

export default function PoIndex() {
  const { user } = useAuth();
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Procurement';

  useEffect(() => {
    procurementApi.listPos()
      .then((data: any) => setPos(data))
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    pending_approval: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    acknowledged: 'bg-blue-100 text-blue-700 border-blue-200',
    received: 'bg-violet-100 text-violet-700 border-violet-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-orders" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Generate, track, and manage purchase orders issued to vendors.</p>
        </div>

      <SectionCard title="All Purchase Orders" description="Overview of generated POs and acknowledgement status">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading purchase orders...</div>
        ) : pos.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-slate-400">description</span>
            <p className="mt-2 text-sm font-medium">No purchase orders found</p>
            <p className="text-xs text-slate-400 mt-1">Generate a purchase order from an approved requisition.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left pb-3 font-semibold">PO Number</th>
                  <th className="text-left pb-3 font-semibold">Requisition</th>
                  <th className="text-left pb-3 font-semibold">Case</th>
                  <th className="text-left pb-3 font-semibold">Vendor</th>
                  <th className="text-left pb-3 font-semibold">Amount</th>
                  <th className="text-left pb-3 font-semibold">Status</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pos.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 font-mono text-xs text-slate-900 font-medium">{po.poNumber}</td>
                    <td className="py-3.5 font-medium text-slate-900">
                      {po.requisition ? `${po.requisition.requisitionNumber} - ${po.requisition.title}` : '—'}
                    </td>
                    <td className="py-3.5 text-xs text-slate-500">{po.requisition?.procurementCase?.id || '—'}</td>
                    <td className="py-3.5">{po.vendor?.name}</td>
                    <td className="py-3.5 font-semibold text-slate-900">{formatCurrency(Number(po.totalAmount))}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold border ${statusColor[po.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {po.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Link to={`/procurement/orders/${po.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-500 underline">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
