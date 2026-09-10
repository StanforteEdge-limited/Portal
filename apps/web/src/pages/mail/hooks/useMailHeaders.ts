import { useState, useEffect, useCallback, useRef } from 'react';
import { mailApi } from '@/shared/lib/core';
import type { MailHeader } from '@stanforte/shared';

const PAGE_SIZE = 50;

export function useMailHeaders(accountIds: string[], folder: string) {
  const [headers, setHeaders] = useState<MailHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const accountIdsKey = accountIds.join(',');

  const loadPage = useCallback(async (p: number, reset: boolean) => {
    if (accountIds.length === 0) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        accountIds.map(id => mailApi.listHeaders(id, folder, p, PAGE_SIZE)),
      );
      const data: MailHeader[] = results
        .flatMap(r => (r as any)?.data ?? r ?? [])
        .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
      if (reset) setHeaders(data);
      else setHeaders(prev => [...prev, ...data]);
      setHasMore(data.length >= PAGE_SIZE);
      pageRef.current = p;
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIdsKey, folder]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    void loadPage(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIdsKey, folder]);

  const loadMore = useCallback(() => {
    const next = pageRef.current + 1;
    setPage(next);
    void loadPage(next, false);
  }, [loadPage]);

  const refresh = useCallback(() => {
    setPage(1);
    void loadPage(1, true);
  }, [loadPage]);

  return { headers, loading, loadMore, hasMore, refresh };
}
