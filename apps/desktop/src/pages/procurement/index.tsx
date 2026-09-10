import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { procurementApi } from "@/shared/lib/core";
import { formatCurrency } from "@stanforte/shared";
import { SectionCard, Button } from '@/shared';
import { AppShell } from '@/shared/components/layout/AppShell';
import { buildAppNavigation, buildAppMobileNav } from '@/shared/navigation';
import { useAuth } from '@/shared/context/AuthProvider';

export default function ProcurementIndex() {
  const { user } = useAuth();
  const [intake, setIntake] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Procurement';

  useEffect(() => {
    Promise.all([
      procurementApi.listIntake(),
      procurementApi.listPrs(),
    ]).then(([intakeData, prsData]) => {
      setIntake(intakeData);
      setPrs(prsData);
    }).finally(() => setLoading(false));
  }, []);

  const handleCreateCase = async (requestId: string) => {
    await procurementApi.createCaseFromRequest(requestId, { note: 'Accepted into procurement' });
    setIntake(prev => prev.filter(i => i.id !== requestId));
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    submitted: 'bg-blue-100 text-blue-700 border-blue-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 border-rose-200',
    returned: 'bg-amber-100 text-amber-700 border-amber-200',
    converted_to_po: 'bg-violet-100 text-violet-700 border-violet-200',
  };

  if (loading) {
    return (
      <AppShell
        navigation={buildAppNavigation()}
        activeLabel="procurement-intake"
        user={{ name: userName, role: 'Procurement' }}
        mobileNav={buildAppMobileNav('Dashboard')}
      >
        <div className="p-6 max-w-6xl mx-auto">
          <div className="py-12 text-center text-slate-500">Loading procurement intake&hellip;</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="procurement-intake"
      user={{ name: userName, role: 'Procurement' }}
      mobileNav={buildAppMobileNav('Dashboard')}
    >
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Procurement Management</h1>
          <p className="text-sm text-slate-500">
            Manage approved procurement requests, purchase requisitions, and orders.
          </p>
        </div>

      <SectionCard title="Intake Queue" description="Approved procurement requests awaiting case creation">
        {intake.length === 0 ? (
          <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-slate-400">check_circle</span>
            <p className="mt-2 text-sm font-medium">No pending intake</p>
            <p className="text-xs text-slate-400 mt-1">All approved procurement requests have been actioned.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left pb-3 font-semibold">Requester</th>
                  <th className="text-left pb-3 font-semibold">Title / Data</th>
                  <th className="text-left pb-3 font-semibold">Submitted</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {intake.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 font-medium text-slate-900">
                      {item.creator ? `${item.creator.firstName || ''} ${item.creator.lastName || ''}`.trim() || 'Unknown' : 'Unknown'}
                    </td>
                    <td className="py-3.5 text-slate-900">{item.data?.title || 'Untitled'}</td>
                    <td className="py-3.5 text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleCreateCase(item.id)}
                      >
                        Create Case
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

        <SectionCard title="Purchase Requisitions" description="Existing requisitions and their status">
        {prs.length === 0 ? (
          <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-slate-400">shopping_cart</span>
            <p className="mt-2 text-sm font-medium">No requisitions found</p>
            <p className="text-xs text-slate-400 mt-1">Requisitions created from procurement cases appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="text-left pb-3 font-semibold">Number</th>
                  <th className="text-left pb-3 font-semibold">Title</th>
                  <th className="text-left pb-3 font-semibold">Category</th>
                  <th className="text-left pb-3 font-semibold">Est. Total</th>
                  <th className="text-left pb-3 font-semibold">Status</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {prs.map(pr => (
                  <tr key={pr.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 font-mono text-xs text-slate-900 font-medium">{pr.requisitionNumber}</td>
                    <td className="py-3.5 font-medium text-slate-900">{pr.title}</td>
                    <td className="py-3.5 capitalize text-xs">{pr.category}</td>
                    <td className="py-3.5 font-semibold text-slate-900">{formatCurrency(Number(pr.estimatedTotal))}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold border ${statusColor[pr.status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {pr.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Link to={`/procurement/${pr.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-500 underline">
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
