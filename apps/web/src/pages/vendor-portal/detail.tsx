import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { procurementApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { Button, SectionCard } from '@/shared';
import { downloadBackgroundJob } from '@/shared/lib/download';

export default function VendorOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('vendor_token') || '';

  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ackNote, setAckNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const attachments = Array.isArray(po?.attachments) ? po.attachments : [];

  useEffect(() => {
    if (!token) {
      navigate('/vendor-portal/login');
      return;
    }
    if (id) {
      procurementApi.vendorGetOrder(token, id)
        .then(setPo)
        .finally(() => setLoading(false));
    }
  }, [id, token, navigate]);

  const handleAcknowledge = async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      await procurementApi.vendorAcknowledge(token, id, ackNote);
      const data = await procurementApi.vendorGetOrder(token, id);
      setPo(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-neutral-500">Loading Order details...</div>;
  if (!po) return <div className="p-12 text-center text-neutral-500">Order not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/vendor-portal/dashboard" className="text-neutral-400 hover:text-neutral-600 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-neutral-900">Purchase Order {po.poNumber}</h1>
          <p className="text-sm text-neutral-500">Issued on {new Date(po.createdAt).toLocaleDateString()}</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            procurementApi.downloadPo(id!).then((job) => downloadBackgroundJob(job.job_id)).catch(console.error);
          }}
        >
          Download PO
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <SectionCard title="Ordered Items" description="Review line items of this Purchase Order">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-neutral-600">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 text-xs font-semibold">
                    <th className="text-left pb-3">Description</th>
                    <th className="text-center pb-3">Qty</th>
                    <th className="text-center pb-3">Unit</th>
                    <th className="text-right pb-3">Unit Cost</th>
                    <th className="text-right pb-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {po.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 font-medium text-neutral-900">{it.description}</td>
                      <td className="py-3 text-center">{it.qty}</td>
                      <td className="py-3 text-center capitalize">{it.unit}</td>
                      <td className="py-3 text-right">{formatCurrency(it.unitCost)}</td>
                      <td className="py-3 text-right font-semibold text-neutral-900">{formatCurrency(it.qty * it.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end pt-4 border-t border-neutral-100">
                <div className="text-right">
                  <span className="text-xs text-neutral-400 font-semibold">Order Total</span>
                  <div className="text-xl font-medium text-neutral-900">{formatCurrency(Number(po.totalAmount))}</div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Vendor Documents" description="Files shared with you for this purchase order.">
            {attachments.length === 0 ? (
              <p className="text-sm text-neutral-500">No supporting files have been shared for this order yet.</p>
            ) : (
              <div className="space-y-3">
                {attachments.map((attachment: any) => (
                  <div key={attachment.id} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-neutral-900">{attachment.label || attachment.file?.file_name}</p>
                      <p className="mt-1 text-xs text-neutral-500">Vendor-shareable attachment</p>
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
          </SectionCard>

          {!po.vendorAcknowledgedAt ? (
            <SectionCard title="Acknowledge Order" description="Sign off and accept terms to begin fulfillment">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1">Acknowledgement Note (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Add optional notes, e.g., estimated shipping timeline..."
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={ackNote}
                    onChange={e => setAckNote(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAcknowledge} disabled={submitting}>
                    {submitting ? 'Acknowledging...' : 'Acknowledge & Accept PO'}
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-emerald-900 flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600">check_circle</span>
              <div>
                <h4 className="font-semibold text-sm">Order Acknowledged</h4>
                <p className="text-xs text-emerald-700 mt-0.5">You acknowledged this Purchase Order on {new Date(po.vendorAcknowledgedAt).toLocaleString()}.</p>
                {po.vendorAcknowledgeNote && (
                  <p className="text-xs text-emerald-800 mt-2 bg-white/40 p-2.5 rounded-xl border border-emerald-100/50 italic">"{po.vendorAcknowledgeNote}"</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SectionCard title="Terms & Details" description="Fulfillment parameters">
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-neutral-400 font-semibold block">Delivery Address</span>
                <span className="font-semibold text-neutral-900">{po.deliveryAddress || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 font-semibold block">Expected Delivery Date</span>
                <span className="font-semibold text-neutral-900">
                  {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 font-semibold block">Payment Terms</span>
                <span className="font-semibold text-neutral-900">{po.paymentTerms || '—'}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 font-semibold block">Payment Pattern</span>
                <span className="font-semibold text-neutral-900 capitalize">{po.paymentPattern.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
