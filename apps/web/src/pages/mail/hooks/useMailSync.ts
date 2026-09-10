import { useState, useCallback } from 'react';
import { mailApi } from '@/shared/lib/core';
import type { MailAccount } from '@stanforte/shared';

export function useMailSync(accounts: MailAccount[], onComplete?: () => void) {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const sync = useCallback(async () => {
    if (syncing || accounts.length === 0) return;
    setSyncing(true);
    try {
      await mailApi.syncAll();
      setLastSyncedAt(new Date());
      onComplete?.();
    } finally {
      setSyncing(false);
    }
  }, [syncing, accounts, onComplete]);

  return { sync, syncing, lastSyncedAt };
}
