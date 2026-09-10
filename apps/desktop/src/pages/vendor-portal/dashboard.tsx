import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { procurementApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { SectionCard } from '@/shared';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('vendor_token') || '';
  const vendorName = localStorage.getItem('vendor_name') || 'Vendor';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/vendor-portal/login');
      return;
    }
    procurementApi.vendorListOrders(token)
      .then((data) => {
        if (Array.isArray(data)) {
          setOrders(data);
        } else {
          localStorage.removeItem('vendor_token');
          navigate('/vendor-portal/login');
        }
      })
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('vendor_token');
    localStorage.removeItem('vendor_name');
    navigate('/vendor-portal/login');
  };

  const statusColor: Record<string, string> = {
    pending_approval: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    acknowledged: 'bg-blue-100 text-blue-700 border-blue-200',
    received: 'bg-violet-100 text-violet-700 border-violet-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome, {vendorName}</h1>
          <p className="text-sm text-slate-500">Manage and acknowledge your purchase orders.</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Logout
        </button>
      </div>

      <SectionCard title="Active Purchase Orders" description="Acknowledge incoming POs and view status">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-slate-400">receipt_long</span>
            <p className="mt-2 text-sm font-medium">No purchase orders found</p>
            <p className="text-xs text-slate-400 mt-1">Incoming orders will be shown here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left pb-3 font-semibold">PO Number</th>
                  <th className="text-left pb-3 font-semibold">Order Date</th>
                  <th className="text-left pb-3 font-semibold">Amount</th>
                  <th className="text-left pb-3 font-semibold">Status</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 font-mono text-xs text-slate-900 font-medium">{po.poNumber}</td>
                    <td className="py-3.5">{new Date(po.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 font-semibold text-slate-900">{formatCurrency(Number(po.totalAmount))}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold border ${statusColor[po.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {po.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Link to={`/vendor-portal/orders/${po.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-500 underline">
                        View & Acknowledge
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
  );
}
