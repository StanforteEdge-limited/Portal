import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { procurementApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { Button, SectionCard } from '@/shared';
import { uploadFileAsset } from '@/pages/files/files-api';
import { downloadBase64File } from '@/shared/lib/download';
import { AppShell } from '@/shared/components/layout/AppShell';
import { buildAppNavigation, buildAppMobileNav } from '@/shared/navigation';
import { useAuth } from '@/shared/context/AuthProvider';

export default function PoDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [raisingGrn, setRaisingGrn] = useState(false);
  const [grnNotes, setGrnNotes] = useState('');
  const [grnCondition, setGrnCondition] = useState<'satisfactory' | 'partial' | 'rejected'>('satisfactory');
  const [grnItems, setGrnItems] = useState<any[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Procurement';

  useEffect(() => {
    if (id) {
      procurementApi.getPo(id)
        .then((data: any) => {
          setPo(data);
          if (data.items) {
            setGrnItems(data.items.map((i: any) => ({
              description: i.description,
              qtyOrdered: i.qty,
              qtyReceived: i.qty, // default received to ordered
              condition: 'good',
              notes: '',
            })));
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleRaiseGrn = async () => {
    if (!id) return;
    try {
      await procurementApi.createGrn({
        poId: id,
        receivedDate: new Date().toISOString().split('T')[0],
        items: grnItems,
        overallCondition: grnCondition,
        notes: grnNotes,
      });
      // reload
      const data = await procurementApi.getPo(id);
      setPo(data);
      setRaisingGrn(false);
    } catch (err) {
      console.error(err);
    }
  };

  const updateGrnItemQty = (idx: number, qty: number) => {
    setGrnItems(prev => prev.map((item, i) => i === idx ? { ...item, qtyReceived: qty } : item));
  };

  if (loading) return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-orders" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="p-12 text-center text-slate-500">Loading PO...</div>
    </AppShell>
  );
  if (!po) return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-orders" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="p-12 text-center text-slate-500">PO not found</div>
    </AppShell>
  );

  const linkedCase = po.requisition?.procurementCase;
  const linkedRequest = linkedCase?.request;
  const attachments = Array.isArray(po.attachments) ? po.attachments : [];
  const vendorAttachments = attachments.filter((attachment: any) => attachment.visibility === 'vendor');

  const statusColor: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    pending_approval: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    acknowledged: 'bg-blue-100 text-blue-700 border-blue-200',
    received: 'bg-violet-100 text-violet-700 border-violet-200',
    cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
  };

  const attachFile = async (file: File, visibility: 'internal' | 'vendor') => {
    if (!id) return;
    try {
      setUploadingAttachment(true);
      const uploaded = await uploadFileAsset(file, {
        metadata: { source: 'procurement_order_attachment', visibility },
      });
      await procurementApi.attachToPo(id, {
        fileId: uploaded.id,
        label: file.name,
        visibility,
      });
      const data = await procurementApi.getPo(id);
      setPo(data);
    } catch (error) {
      console.error(error);
    } finally {
      setUploadingAttachment(false);
    }
  };

  return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-orders" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
        <Link to="/procurement/orders" className="text-slate-400 hover:text-slate-600 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Order {po.poNumber}</h1>
          <p className="text-sm text-slate-500">Issued to {po.vendor?.name}</p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                procurementApi.downloadPo(id!).then((file) => {
                  downloadBase64File(file.file_name, file.mime_type, file.content_base64);
                }).catch(console.error);
              }}
            >
              Download PO
            </Button>
          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-semibold border ${statusColor[po.status] ?? ''}`}>
            {po.status.replace(/_/g, ' ')}
          </span>
          </div>
        </div>
      </div>

        <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <SectionCard title="Source Context" description="Approved request and procurement case that produced this PO.">
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Request</span>
                <p className="mt-1 font-semibold text-slate-900">{String(linkedRequest?.id ?? '—')}</p>
                <p className="text-xs text-slate-500">{linkedRequest?.data?.title || linkedRequest?.requestType?.name || '—'}</p>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Procurement Case</span>
                <p className="mt-1 font-semibold text-slate-900">{linkedCase?.id || '—'}</p>
                <p className="text-xs text-slate-500">{linkedCase?.status ? String(linkedCase.status).replace(/_/g, ' ') : '—'}</p>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">GRN Readiness</span>
                <p className="mt-1 font-semibold text-slate-900">
                  {po.grns?.length ? `${po.grns.length} GRN record(s)` : 'Awaiting delivery'}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="PO Items" description="List of negotiated goods or services">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
                    <th className="text-left pb-3">Description</th>
                    <th className="text-center pb-3">Qty</th>
                    <th className="text-center pb-3">Unit</th>
                    <th className="text-right pb-3">Unit Cost</th>
                    <th className="text-right pb-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {po.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 font-medium text-slate-900">{it.description}</td>
                      <td className="py-3 text-center">{it.qty}</td>
                      <td className="py-3 text-center capitalize">{it.unit}</td>
                      <td className="py-3 text-right">{formatCurrency(it.unitCost)}</td>
                      <td className="py-3 text-right font-semibold text-slate-900">{formatCurrency(it.qty * it.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold uppercase">PO Total</span>
                  <div className="text-xl font-bold text-slate-900">{formatCurrency(Number(po.totalAmount))}</div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="PO Documents" description="Attach internal procurement files and vendor-shareable files for this order.">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300">
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadingAttachment}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void attachFile(file, 'internal');
                      e.currentTarget.value = '';
                    }}
                  />
                  Upload Internal File
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100">
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploadingAttachment}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void attachFile(file, 'vendor');
                      e.currentTarget.value = '';
                    }}
                  />
                  Upload Vendor File
                </label>
              </div>

              {attachments.length === 0 ? (
                <p className="text-sm text-slate-500">No purchase order documents attached yet.</p>
              ) : (
                <div className="space-y-3">
                  {attachments.map((attachment: any) => (
                    <div key={attachment.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{attachment.label || attachment.file?.file_name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${attachment.visibility === 'vendor' ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-700'}`}>
                            {attachment.visibility === 'vendor' ? 'Vendor-shareable' : 'Internal only'}
                          </span>
                        </p>
                      </div>
                      {attachment.file?.public_url ? (
                        <a
                          href={attachment.file.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-brand-600 hover:text-brand-500"
                        >
                          Download
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {raisingGrn ? (
            <SectionCard title="Raise Goods Received Note (GRN)" description="Confirm delivered quantity and condition">
              <div className="space-y-4">
                {grnItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-6 text-sm font-medium text-slate-950">{item.description}</div>
                    <div className="col-span-3 text-center text-xs text-slate-500">Ordered: {item.qtyOrdered}</div>
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-slate-400 mb-0.5">Qty Received</label>
                      <input
                        type="number"
                        className="w-full rounded-xl border border-slate-200 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        value={item.qtyReceived}
                        onChange={e => updateGrnItemQty(idx, Number(e.target.value))}
                      />
                    </div>
                  </div>
                ))}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Overall Condition</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={grnCondition}
                      onChange={e => setGrnCondition(e.target.value as any)}
                    >
                      <option value="satisfactory">Satisfactory (All Good)</option>
                      <option value="partial">Partial Delivery/Issue</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Receiving Notes</label>
                    <input
                      type="text"
                      placeholder="Add delivery observations..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={grnNotes}
                      onChange={e => setGrnNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button variant="secondary" onClick={() => setRaisingGrn(false)}>Cancel</Button>
                  <Button onClick={handleRaiseGrn}>Submit GRN</Button>
                </div>
              </div>
            </SectionCard>
          ) : (
            ['approved', 'sent', 'acknowledged'].includes(po.status) && (
              <Button onClick={() => setRaisingGrn(true)}>
                Raise Goods Received Note (GRN)
              </Button>
            )
          )}

          {po.grns && po.grns.length > 0 && (
            <SectionCard title="Associated GRNs" description="Goods Received Notes registered for this PO">
              <div className="divide-y divide-slate-100">
                {po.grns.map((grn: any) => (
                  <div key={grn.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-semibold text-slate-900">{grn.grnNumber}</div>
                      <div className="text-xs text-slate-500">Received on {new Date(grn.receivedDate).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold uppercase border ${
                        grn.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {grn.status}
                      </span>
                      {grn.status === 'pending' && (
                        <button
                          onClick={() => {
                            procurementApi.confirmGrn(grn.id, 'confirmed')
                              .then(() => procurementApi.getPo(id!).then(setPo));
                          }}
                          className="rounded-lg bg-brand-50 border border-brand-200 px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100"
                        >
                          Confirm Delivery
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="space-y-6">
          <SectionCard title="PO Summary" description="Core attributes">
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Vendor Files</span>
                <span className="font-semibold text-slate-900">{vendorAttachments.length}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Vendor Acknowledged</span>
                <span className="font-semibold text-slate-900">
                  {po.vendorAcknowledgedAt ? new Date(po.vendorAcknowledgedAt).toLocaleString() : 'Not Yet'}
                </span>
              </div>
              {po.vendorAcknowledgeNote && (
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Acknowledge Note</span>
                  <span className="text-slate-600 italic">"{po.vendorAcknowledgeNote}"</span>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Delivery Address</span>
                <span className="font-semibold text-slate-900">{po.deliveryAddress || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Expected Delivery Date</span>
                <span className="font-semibold text-slate-900">
                  {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Payment Terms</span>
                <span className="font-semibold text-slate-900">{po.paymentTerms || '—'}</span>
              </div>
            </div>
          </SectionCard>
        </div>
        </div>
      </div>
    </AppShell>
  );
}
