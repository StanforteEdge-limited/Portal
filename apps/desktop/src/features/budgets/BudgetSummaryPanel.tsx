import { useMemo } from 'react';
import { formatCurrency } from '@stanforte/shared';
import type { BudgetRecord } from './budget-types';

function asMoney(value: unknown, currency = 'NGN') {
  const amount = Number(value || 0);
  return formatCurrency(Number.isFinite(amount) ? amount : 0, currency);
}

function getRevisionNumber(revision: BudgetRecord['current_active_revision'] | BudgetRecord['draft_revision']) {
  if (!revision) return null;
  return revision.revisionNumber ?? revision.revision_number ?? null;
}

type StatBoxProps = {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

function StatBox({ label, value, tone = 'neutral' }: StatBoxProps) {
  const colorMap: Record<string, string> = {
    neutral: '#475569',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626',
  };
  return (
    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: colorMap[tone] }}>{value}</div>
    </div>
  );
}

type BudgetSummaryPanelProps = {
  budget: BudgetRecord;
};

export default function BudgetSummaryPanel({ budget }: BudgetSummaryPanelProps) {
  const total = useMemo(() => Number(budget.total_budget || 0), [budget.total_budget]);
  const actual = useMemo(() => Number(budget.total_actual || 0), [budget.total_actual]);
  const variance = useMemo(() => Number(budget.variance_amount || 0), [budget.variance_amount]);
  const currency = budget.currency || 'NGN';

  const varianceTone = variance >= 0 ? 'success' : 'danger';
  const status = String(budget.status || 'draft').toLowerCase();
  const rev = budget.current_active_revision || budget.currentActiveRevision || budget.draft_revision || budget.draftRevision;
  const year = budget.fiscal_year ?? budget.year;
  const revisionNumber = getRevisionNumber(rev);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <StatBox label="Total Budget" value={asMoney(total, currency)} tone="neutral" />
        <StatBox label="Actual Spend" value={asMoney(actual, currency)} tone="warning" />
        <StatBox label="Variance" value={asMoney(variance, currency)} tone={varianceTone} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        <DetailField label="Status" value={status} />
        <DetailField label="Year" value={String(year || '-')} />
        {budget.quarter ? <DetailField label="Quarter" value={`Q${budget.quarter}`} /> : null}
        {budget.month ? <DetailField label="Month" value={`M${budget.month}`} /> : null}
        <DetailField label="Currency" value={currency} />
        {rev && revisionNumber ? <DetailField label="Active Revision" value={`#${revisionNumber} - ${rev.status}`} /> : null}
      </div>

      {budget.notes ? (
        <div style={{ marginTop: '12px', padding: '12px', background: '#f1f5f9', borderRadius: '6px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Notes</div>
          <div style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap' }}>{budget.notes}</div>
        </div>
      ) : null}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{value}</div>
    </div>
  );
}
