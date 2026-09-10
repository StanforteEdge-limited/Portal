import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableHeaderRow, TableRow, EmptyState, TextField, SelectField } from '@/shared';
import { useCachedQuery } from '@/shared/lib/core';
import { formatCurrency } from '@stanforte/shared';
import { budgetApi } from './budget-api';
import type { BudgetScopeContext, BudgetRecord } from './budget-types';

function asMoney(value: unknown, currency = 'NGN') {
  const amount = Number(value || 0);
  return formatCurrency(Number.isFinite(amount) ? amount : 0, currency);
}

type BudgetListPanelProps = {
  context: BudgetScopeContext;
  onSelect?: (id: string) => void;
  onNew?: () => void;
};

export default function BudgetListPanel({ context, onSelect, onNew }: BudgetListPanelProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const query = useMemo(() => {
    const q: Record<string, unknown> = {};
    if (context.scopeType !== 'finance') {
      q.scope_type = context.scopeType;
      if (context.scopeId) {
        if (context.scopeType === 'team') q.team_id = context.scopeId;
        else if (context.scopeType === 'project') q.project_id = context.scopeId;
      }
    }
    if (statusFilter !== 'all') q.status = statusFilter;
    if (search.trim()) q.q = search.trim();
    return q;
  }, [context, statusFilter, search]);

  const cacheKey = `budgets:list:${JSON.stringify(query)}`;
  const { data: rowsData, loading, error } = useCachedQuery(
    cacheKey,
    () => budgetApi.list(query),
    { ttlMs: 30_000, storage: 'memory' },
  );
  const rows = (Array.isArray(rowsData) ? rowsData : []) as BudgetRecord[];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <div style={{ width: '180px' }}>
            <TextField label="" placeholder="Search budgets..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ width: '140px' }}>
            <SelectField label="" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="approval">In Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </SelectField>
          </div>
        </div>
        {onNew ? (
          <Button onClick={onNew}>New Budget</Button>
        ) : null}
      </div>

      {loading ? <div style={{ padding: '16px', fontSize: '14px', color: '#94a3b8' }}>Loading budgets...</div> : null}
      {error ? <div style={{ padding: '16px', fontSize: '14px', color: '#dc2626' }}>{String(error)}</div> : null}

      {rows.length > 0 ? (
        <Table caption="Budget list">
          <TableHead>
            <TableHeaderRow>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Budget</TableHeaderCell>
              <TableHeaderCell>Actual</TableHeaderCell>
              <TableHeaderCell>Variance</TableHeaderCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {rows.map((row: any) => {
              const label = row.name || row.title || [row.month ? `M${row.month}` : null, row.quarter ? `Q${row.quarter}` : null, row.fiscal_year || row.year || ''].filter(Boolean).join(' ');
              const s = String(row.status || 'draft').toLowerCase();
              const variance = Number(row.variance_amount || 0);
              return (
                <TableRow key={row.id} onClick={() => (onSelect ? onSelect(row.id) : navigate(`/finance/budgets/${row.id}`))}>
                  <TableCell>{label || row.id?.slice(0, 8)}</TableCell>
                  <TableCell>
                    <Chip variant={s === 'approved' ? 'success' : s === 'draft' ? 'pending' : s === 'approval' ? 'warning' : 'neutral'}>
                      {s}
                    </Chip>
                  </TableCell>
                  <TableCell>{asMoney(row.total_budget, String(row.currency || 'NGN'))}</TableCell>
                  <TableCell>{asMoney(row.total_actual, String(row.currency || 'NGN'))}</TableCell>
                  <TableCell>
                    <span style={{ color: variance >= 0 ? '#16a34a' : '#dc2626' }}>
                      {asMoney(variance, String(row.currency || 'NGN'))}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : !loading ? (
        <EmptyState title="No budgets yet" description="Create a budget to start tracking." />
      ) : null}
    </div>
  );
}
