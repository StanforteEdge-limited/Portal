import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { procurementApi, financeApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { Button, SectionCard } from '@/shared';
import { AppShell } from '@/shared/components/layout/AppShell';
import { buildAppNavigation, buildAppMobileNav } from '@/shared/navigation';
import { useAuth } from '@/shared/context/AuthProvider';

export default function CreatePo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prId = searchParams.get('prId') || '';
  const caseId = searchParams.get('caseId') || '';

  const [pr, setPr] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Procurement';

  useEffect(() => {
    if (prId) {
      procurementApi.getPr(prId).then((data: any) => {
        setPr(data);
        const mappedItems = data.items.map((i: any) => ({
          description: i.description,
          qty: i.qty,
          unit: i.unit,
          unitCost: i.estimatedUnitCost, // default to estimated cost
        }));
        setItems(mappedItems);
      });
    } else if (caseId) {
      procurementApi.listPrs().then((rows: any[]) => {
        const data = rows.find((row) => row.procurementCase?.id === caseId) || null;
        setPr(data);
        const mappedItems = (data?.items || []).map((i: any) => ({
          description: i.description,
          qty: i.qty,
          unit: i.unit,
          unitCost: i.estimatedUnitCost,
        }));
        setItems(mappedItems);
      });
    }

    financeApi.listVendors({ per_page: 100 }).then((res) => {
      setVendors(res.result || []);
    });
  }, [caseId, prId]);

  const updateItemCost = (idx: number, cost: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, unitCost: cost } : item));
  };

  const total = items.reduce((s, i) => s + i.qty * i.unitCost, 0);

  const handleSubmit = async () => {
    if (!pr || !selectedVendorId) return;
    setSaving(true);
    try {
      const approvalFlowJson = { steps: [{ approverType: 'finance_manager' }, { approverType: 'coo' }] };
      await procurementApi.createPo({
        caseId: pr.procurementCase?.id,
        requisitionId: pr.id,
        vendorId: selectedVendorId,
        items,
        paymentPattern: pr.paymentPattern,
        paymentTerms,
        deliveryDate: deliveryDate || undefined,
        deliveryAddress: deliveryAddress || undefined,
        approvalFlowJson,
      });
      navigate('/procurement/orders');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!pr) return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-orders" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="p-12 text-center text-slate-500">Loading Requisition details...</div>
    </AppShell>
  );

  return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-orders" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Generate Purchase Order</h1>
          <p className="text-sm text-slate-500">Generate PO for approved requisition: <span className="font-mono">{pr.requisitionNumber}</span></p>
        </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <SectionCard title="Vendor Selection" description="Select the vendor and specify delivery details">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Vendor</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={selectedVendorId}
                  onChange={e => setSelectedVendorId(e.target.value)}
                >
                  <option value="">Select a vendor...</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. Net 30"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Delivery Address</label>
                <input
                  type="text"
                  placeholder="e.g. 12 Townhall Crescent, Lagos"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="PO Line Items" description="Finalize the negotiated item costs for the PO">
            <div className="space-y-4">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6 font-medium text-slate-900 text-sm">{it.description}</div>
                  <div className="col-span-2 text-center text-slate-500 text-sm">{it.qty} {it.unit}</div>
                  <div className="col-span-4">
                    <label className="block text-xs text-slate-400 font-semibold mb-0.5">Unit Cost (₦)</label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={it.unitCost}
                      onChange={e => updateItemCost(idx, Number(e.target.value))}
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <div className="text-lg font-bold text-slate-900">PO Total: {formatCurrency(total)}</div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Requisition Info" description="Reference attributes">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Requisition</span>
                <span className="font-semibold text-slate-900">{pr.title}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Est. Original Total</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Number(pr.estimatedTotal))}</span>
              </div>
              <div>
               <span className="text-xs text-slate-400 font-semibold uppercase block">Payment Pattern</span>
                <span className="font-semibold text-slate-900 capitalize">{pr.paymentPattern}</span>
              </div>
              {pr.procurementCase ? (
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Procurement Case</span>
                  <span className="font-semibold text-slate-900">{pr.procurementCase.id}</span>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <Button className="w-full" onClick={handleSubmit} disabled={saving || !selectedVendorId}>
            Create & Submit PO
          </Button>
        </div>
      </div>
      </div>
    </AppShell>
  );
}
