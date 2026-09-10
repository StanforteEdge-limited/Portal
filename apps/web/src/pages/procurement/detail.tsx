import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { procurementApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { SectionCard } from '@/shared';
import { uploadFileAsset } from '@/pages/files/files-api';
import { AppShell } from '@/shared/components/layout/AppShell';
import { buildAppNavigation, buildAppMobileNav } from '@/shared/navigation';
import { useAuth } from '@/shared/context/AuthProvider';

export default function PrDetail() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [pr, setPr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Procurement';

  useEffect(() => {
    if (id) {
      procurementApi.getPr(id)
        .then(setPr)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-intake" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="p-12 text-center text-slate-500">Loading...</div>
    </AppShell>
  );
  if (!pr) return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-intake" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="p-12 text-center text-slate-500">Requisition not found</div>
    </AppShell>
  );

  const linkedCase = pr.procurementCase;
  const linkedRequest = linkedCase?.request;
  const requestTitle = linkedRequest?.data?.title || linkedRequest?.requestType?.name || 'Procurement request';
  const attachments = Array.isArray(linkedCase?.attachments) ? linkedCase.attachments : [];

  const statusColor: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    submitted: 'bg-blue-100 text-blue-700 border-blue-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 border-rose-200',
    returned: 'bg-amber-100 text-amber-700 border-amber-200',
    converted_to_po: 'bg-violet-100 text-violet-700 border-violet-200',
  };

  const refresh = async () => {
    if (!id) return;
    const data = await procurementApi.getPr(id);
    setPr(data);
  };

  const attachFile = async (file: File, visibility: 'internal' | 'vendor') => {
    if (!id) return;
    try {
      setUploading(true);
      const uploaded = await uploadFileAsset(file, {
        metadata: { source: 'procurement_case_attachment', visibility },
      });
      await procurementApi.attachToPr(id, {
        fileId: uploaded.id,
        label: file.name,
        visibility,
      });
      await refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-intake" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
        <Link to="/procurement" className="text-slate-400 hover:text-slate-600 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{pr.title}</h1>
          <p className="text-sm text-slate-500">{pr.requisitionNumber} · Raised by {pr.requester?.firstName} {pr.requester?.lastName}</p>
        </div>
        <div className="ml-auto">
          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-semibold border ${statusColor[pr.status] ?? ''}`}>
            {pr.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

        <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <SectionCard title="Request Handoff" description="How this requisition entered procurement.">
            {linkedCase ? (
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-400">Linked Request</span>
                  <p className="mt-1 font-semibold text-slate-900">{requestTitle}</p>
                  <p className="text-xs text-slate-500">Request ID: {String(linkedRequest?.id ?? '-')}</p>
                </div>
                <div>
                  <span className="block text-xs font-semibold uppercase text-slate-400">Procurement Case</span>
                  <p className="mt-1 font-semibold text-slate-900">{linkedCase.id}</p>
                  <p className="text-xs text-slate-500">Status: {String(linkedCase.status || 'new').replace(/_/g, ' ')}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                This requisition is not yet linked to a procurement case. Approved request handoff details will appear here once the case is created.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Items Requested" description="List of items in this purchase requisition">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-600">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase">
                    <th className="text-left pb-3">Description</th>
                    <th className="text-center pb-3">Qty</th>
                    <th className="text-center pb-3">Unit</th>
                    <th className="text-right pb-3">Est. Unit Cost</th>
                    <th className="text-right pb-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pr.items?.map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 font-medium text-slate-900">{it.description}</td>
                      <td className="py-3 text-center">{it.qty}</td>
                      <td className="py-3 text-center capitalize">{it.unit}</td>
                      <td className="py-3 text-right">{formatCurrency(it.estimatedUnitCost)}</td>
                      <td className="py-3 text-right font-semibold text-slate-900">{formatCurrency(it.qty * it.estimatedUnitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Estimated Total</span>
                  <div className="text-xl font-bold text-slate-900">{formatCurrency(Number(pr.estimatedTotal))}</div>
                </div>
              </div>
            </div>
          </SectionCard>

          {pr.justification && (
            <SectionCard title="Justification" description="Reason for request">
              <p className="text-sm text-slate-600 leading-relaxed">{pr.justification}</p>
            </SectionCard>
          )}

          <SectionCard title="Procurement Documents" description="Attach internal-only or vendor-shareable files for this procurement case.">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-300">
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
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
                    disabled={uploading}
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
                <p className="text-sm text-slate-500">No procurement documents attached yet.</p>
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
        </div>

        <div className="space-y-6">
          <SectionCard title="Details" description="Summary attributes">
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Category</span>
                <span className="font-semibold text-slate-900 capitalize">{pr.category}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Payment Pattern</span>
                <span className="font-semibold text-slate-900 capitalize">{pr.paymentPattern.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase block">Date Raised</span>
                <span className="font-semibold text-slate-900">{new Date(pr.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </SectionCard>

          {pr.status === 'approved' && (
            <div className="bg-brand-900 p-5 rounded-2xl text-white space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-white/80">Procurement Action</h3>
              <p className="text-xs text-white/70 leading-relaxed">This requisition is approved. You can now generate a Purchase Order to send to the vendor.</p>
              <Link
                to={`/procurement/orders/create?${linkedCase ? `caseId=${linkedCase.id}` : `prId=${pr.id}`}`}
                className="w-full inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-900 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Generate PO
              </Link>
            </div>
          )}
        </div>
        </div>
      </div>
    </AppShell>
  );
}
