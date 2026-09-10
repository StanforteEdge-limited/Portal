import { useState } from 'react';
import { Button } from '@/shared';
import { budgetApi } from './budget-api';
import type { BudgetRevisionRecord, BudgetScopeContext } from './budget-types';

function getRevisionNumber(revision: BudgetRevisionRecord) {
  return revision.revisionNumber ?? revision.revision_number ?? 0;
}

function getSubmissionNote(revision: BudgetRevisionRecord) {
  return revision.submissionNote ?? revision.submission_note ?? null;
}

const btn = {
  padding: '6px 14px',
  fontSize: '13px',
  fontWeight: 600,
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const chip = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: '#fef3c7', text: '#92400e' },
    approval: { bg: '#dbeafe', text: '#1e40af' },
    approved: { bg: '#d1fae5', text: '#065f46' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
    returned: { bg: '#fce7f3', text: '#9d174d' },
  };
  const c = colors[status] || { bg: '#f1f5f9', text: '#475569' };
  return { display: 'inline-block', padding: '3px 10px', fontSize: '12px', fontWeight: 600, borderRadius: '12px', background: c.bg, color: c.text };
};

type BudgetRevisionTimelineProps = {
  revisions: BudgetRevisionRecord[];
  context: BudgetScopeContext;
  budgetId: string;
  activeRevisionId?: string | null;
  draftRevisionId?: string | null;
  onRevisionAction?: () => void;
};

export default function BudgetRevisionTimeline({
  revisions,
  context,
  budgetId,
  draftRevisionId,
  onRevisionAction,
}: BudgetRevisionTimelineProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...revisions].sort((a, b) => getRevisionNumber(b) - getRevisionNumber(a));
  const draftRev = sorted.find((r) => r.id === draftRevisionId);
  const isFinanceMode = context.mode === 'finance';

  const handleAction = async (action: string, revisionId: string) => {
    setActionLoading(action);
    setError(null);
    try {
      if (action === 'submit') await budgetApi.submitRevision(revisionId);
      else if (action === 'approve') await budgetApi.approveRevision(revisionId, { action: 'approve' });
      else if (action === 'reject') await budgetApi.rejectRevision(revisionId, { action: 'reject' });
      else if (action === 'return') await budgetApi.returnRevision(revisionId, { action: 'return' });
      onRevisionAction?.();
    } catch (e: any) {
      setError(e?.message || `Failed to ${action} revision`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Revision Timeline</div>

      {error ? (
        <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', fontSize: '13px', borderRadius: '6px', marginBottom: '12px' }}>
          {error}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>No revisions yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map((rev) => {
            const isDraft = rev.id === draftRevisionId;
            return (
              <div key={rev.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', background: isDraft ? '#fefce8' : '#f8fafc',
                borderRadius: '6px', border: isDraft ? '1px solid #fde68a' : '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>v{getRevisionNumber(rev)}</span>
                  <span style={chip(rev.status)}>{rev.status}</span>
                  {getSubmissionNote(rev) ? (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{getSubmissionNote(rev)}</span>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {(rev.status === 'draft' || rev.status === 'returned') && (
                    <button style={{ ...btn, background: '#2563eb', color: '#fff' }}
                      onClick={() => handleAction('submit', rev.id)}
                      disabled={actionLoading === 'submit'}>
                      {actionLoading === 'submit' ? '...' : 'Submit'}
                    </button>
                  )}
                  {rev.status === 'approval' && isFinanceMode && (
                    <>
                      <button style={{ ...btn, background: '#16a34a', color: '#fff' }}
                        onClick={() => handleAction('approve', rev.id)}
                        disabled={actionLoading === 'approve'}>
                        {actionLoading === 'approve' ? '...' : 'Approve'}
                      </button>
                      <button style={{ ...btn, background: '#dc2626', color: '#fff' }}
                        onClick={() => handleAction('reject', rev.id)}
                        disabled={actionLoading === 'reject'}>
                        {actionLoading === 'reject' ? '...' : 'Reject'}
                      </button>
                      <button style={{ ...btn, background: '#d97706', color: '#fff' }}
                        onClick={() => handleAction('return', rev.id)}
                        disabled={actionLoading === 'return'}>
                        {actionLoading === 'return' ? '...' : 'Return'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
