import { useState, useEffect, useCallback } from 'react';
import { mailApi } from '@/shared/lib/core';
import type { MailAccount } from '@stanforte/shared';

export function useMailAccounts() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await mailApi.listAccounts();
      setAccounts(Array.isArray(result) ? result : (result as any)?.data ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const connectGoogle = useCallback(async () => {
    const result = await mailApi.getGoogleAuthUrl();
    const url = (result as any)?.url ?? result;
    if (url) window.location.href = url;
  }, []);

  const connectMicrosoft = useCallback(async () => {
    const result = await mailApi.getMicrosoftAuthUrl();
    const url = (result as any)?.url ?? result;
    if (url) window.location.href = url;
  }, []);

  const disconnect = useCallback(async (id: string) => {
    await mailApi.deleteAccount(id);
    await load();
  }, [load]);

  return { accounts, loading, connectGoogle, connectMicrosoft, disconnect, reload: load };
}
