import { useEffect, useState } from 'react';
import { LocalDB } from '@stanforte/shared';
import { AppShell } from '@/shared/components/layout/AppShell';
import { useAuth } from '@/shared/context/AuthProvider';
import { buildAppNavigation, buildAppMobileNav } from '@/shared/navigation';
import { MailLayout } from './MailLayout';

LocalDB.register({ store: 'mailBodies', keyPath: 'uid' });

export default function MailPage() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    LocalDB.put('mailBodies', { uid: '__init__' })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Staff';

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="Mail"
      user={{ name: userName, role: 'Staff' }}
      mobileNav={buildAppMobileNav('Requests')}
    >
      <div style={{ height: 'calc(100dvh - 13rem)', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '0 -1rem' }}>
        {ready ? <MailLayout /> : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#9ca3af', fontSize: 13 }}>
            Initializing…
          </div>
        )}
      </div>
    </AppShell>
  );
}
