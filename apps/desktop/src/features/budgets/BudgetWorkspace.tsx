import { useState, useRef, useEffect } from 'react';
import { useCachedQuery } from '@/shared/lib/core';
import { useAuth } from '@/shared/context/AuthProvider';
import { budgetApi } from './budget-api';
import BudgetListPanel from './BudgetListPanel';
import BudgetSummaryPanel from './BudgetSummaryPanel';
import BudgetRevisionTimeline from './BudgetRevisionTimeline';
import BudgetEditorPanel from './BudgetEditorPanel';
import type { BudgetScopeContext, BudgetRecord } from './budget-types';

type BudgetWorkspaceProps = {
  context: BudgetScopeContext;
  selectedBudgetId?: string;
  layout?: 'embedded' | 'full-page';
  createAttempt?: number;
  showInlineCreateButton?: boolean;
};

export default function BudgetWorkspace({ context, selectedBudgetId: initialId, layout = 'embedded', createAttempt = 0, showInlineCreateButton = true }: BudgetWorkspaceProps) {
  const { user } = useAuth();
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | undefined>(initialId);
  const [view, setView] = useState<'list' | 'detail' | 'edit'>(initialId ? 'detail' : 'list');
  const prevCreateAttempt = useRef(createAttempt);

  useEffect(() => {
    if (createAttempt > 0 && createAttempt !== prevCreateAttempt.current) {
      prevCreateAttempt.current = createAttempt;
      setSelectedBudgetId(undefined);
      setView('edit');
    }
  }, [createAttempt]);
  const permissions = (user?.permissions ?? []).map((permission) => String(permission).toLowerCase());
  const canUseBudgetEndpoints = permissions.includes('*') || permissions.includes('finance.view') || permissions.includes('finance.manage');

  const cacheKey = selectedBudgetId ? `budget:detail:${selectedBudgetId}` : null;
  const { data: budgetData, loading, refetch } = useCachedQuery(
    cacheKey || 'budget:empty',
    () => (selectedBudgetId ? budgetApi.get(selectedBudgetId) : Promise.resolve(null)),
    { ttlMs: 30_000, storage: 'memory', revalidateOnMount: true },
  );
  const budget = (budgetData || null) as BudgetRecord | null;

  const handleSelect = (id: string) => {
    setSelectedBudgetId(id);
    setView('detail');
  };

  const handleNew = () => {
    setSelectedBudgetId(undefined);
    setView('edit');
  };

  const handleEdit = () => {
    setView('edit');
  };

  const handleSaved = (id: string) => {
    setSelectedBudgetId(id);
    setView('detail');
    refetch();
  };

  const handleBack = () => {
    setSelectedBudgetId(undefined);
    setView('list');
  };

  const handleCancel = () => {
    if (selectedBudgetId) {
      setView('detail');
    } else {
      setView('list');
    }
  };

  const btnStyle = (variant: 'primary' | 'secondary' | 'danger' = 'secondary'): React.CSSProperties => {
    const colors = {
      primary: { bg: '#2563eb', text: '#fff', border: '#2563eb' },
      secondary: { bg: '#fff', text: '#334155', border: '#cbd5e1' },
      danger: { bg: '#dc2626', text: '#fff', border: '#dc2626' },
    };
    const c = colors[variant];
    return {
      padding: '6px 14px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', border: `1px solid ${c.border}`,
      background: c.bg, color: c.text, cursor: 'pointer',
    };
  };

  if (context.mode === 'owner' && !canUseBudgetEndpoints) {
    return (
      <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>Budget access pending</div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Your account does not yet have budget workspace permissions. Finance can still manage budgets from the finance module while access is being configured.
        </div>
      </div>
    );
  }

  if (view === 'edit') {
    return (
      <div>
        <div style={{ marginBottom: '12px' }}>
          <button onClick={handleCancel} style={{ ...btnStyle('secondary') }}>Back</button>
        </div>
        <BudgetEditorPanel
          context={context}
          budgetId={selectedBudgetId}
          onSaved={handleSaved}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  if (view === 'detail' && selectedBudgetId) {
    if (loading) {
      return <div style={{ padding: '16px', fontSize: '14px', color: '#94a3b8' }}>Loading budget details...</div>;
    }
    if (!budget) {
      return <div style={{ padding: '16px', fontSize: '14px', color: '#dc2626' }}>Budget not found.</div>;
    }

    const revs = ((budget.revisions || []) as any[]);

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <button onClick={handleBack} style={{ ...btnStyle('secondary') }}>Back to list</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(budget.draft_revision?.status === 'draft' || budget.draft_revision?.status === 'returned' || budget.status === 'draft' || budget.status === 'returned') ? (
              <button onClick={handleEdit} style={{ ...btnStyle('primary') }}>Edit</button>
            ) : null}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <BudgetSummaryPanel budget={budget} />
        </div>

        {revs.length > 0 ? (
          <BudgetRevisionTimeline
            revisions={revs}
            context={context}
            budgetId={selectedBudgetId}
            draftRevisionId={budget.draft_revision?.id || null}
            onRevisionAction={refetch}
          />
        ) : null}
      </div>
    );
  }

  return (
    <BudgetListPanel
      context={context}
      onSelect={handleSelect}
      onNew={showInlineCreateButton ? handleNew : undefined}
    />
  );
}
