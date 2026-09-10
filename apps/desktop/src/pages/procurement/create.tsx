import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared';
import { AppShell } from '@/shared/components/layout/AppShell';
import { buildAppNavigation, buildAppMobileNav } from '@/shared/navigation';
import { useAuth } from '@/shared/context/AuthProvider';

export default function CreatePr() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Procurement';

  useEffect(() => {
    const timer = setTimeout(() => navigate('/requests/new'), 6000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <AppShell navigation={buildAppNavigation()} activeLabel="procurement-intake" user={{ name: userName, role: 'Procurement' }} mobileNav={buildAppMobileNav('Dashboard')}>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="material-symbols-outlined text-5xl text-brand-500">campaign</span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Direct PR Creation Is No Longer Available</h1>
        <p className="max-w-md text-sm text-slate-500">
          Procurement requisitions are now initiated through the Request Engine.
          Your request will go through the appropriate approval workflow before reaching the procurement team.
        </p>
        <Button onClick={() => navigate('/requests/new')}>
          Choose Request Type
        </Button>
        <p className="text-xs text-slate-400">
          You will be redirected automatically in a few seconds&hellip;
        </p>
      </div>
    </AppShell>
  );
}
