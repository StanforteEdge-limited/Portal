import { useState, useEffect } from 'react';
import { Button, TextField, SelectField, TextAreaField } from '@/shared';
import { DataTable } from '@/shared/components/ui/DataTable';
import { useCachedQuery } from '@/shared/lib/core';
import { budgetApi } from './budget-api';
import type { BudgetScopeContext, BudgetRecord } from './budget-types';

const emptyLine = { section: 'expenditure', group_name: '', line_name: '', total_amount: '' };
const emptyAssumption = { section: 'general', label: '', value: '', notes: '' };
const emptyPortfolio = { section: 'portfolio', funder_name: '', status: 'active', total_budget: '' };

type BudgetEditorPanelProps = {
  context: BudgetScopeContext;
  budgetId?: string;
  onSaved?: (budgetId: string) => void;
  onCancel?: () => void;
};

export default function BudgetEditorPanel({ context, budgetId, onSaved, onCancel }: BudgetEditorPanelProps) {
  const isEditing = Boolean(budgetId);
  const [activeTab, setActiveTab] = useState<'summary' | 'expenditures' | 'assumptions' | 'portfolio'>('summary');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [periodType, setPeriodType] = useState(context.scopeType === 'project' ? 'annual' : 'monthly');
  const [quarter, setQuarter] = useState('');
  const [month, setMonth] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [notes, setNotes] = useState('');

  const [assumptions, setAssumptions] = useState<any[]>([emptyAssumption]);
  const [portfolio, setPortfolio] = useState<any[]>([emptyPortfolio]);
  const [lines, setLines] = useState<any[]>([emptyLine]);

  const { data: existingBudget } = useCachedQuery(
    `finance:budget:${budgetId}`,
    () => (isEditing && budgetId ? budgetApi.get(budgetId) : Promise.resolve(null)),
    { ttlMs: 30_000, storage: 'memory' },
  );

  useEffect(() => {
    if (existingBudget) {
      const b = existingBudget as any;
      setTitle(b.name || b.title || '');
      setYear(b.fiscal_year ? String(b.fiscal_year) : b.year ? String(b.year) : '');
      setQuarter(b.quarter ? String(b.quarter) : '');
      setMonth(b.month ? String(b.month) : '');
      setCurrency(b.currency || 'NGN');
      setNotes(b.notes || '');
      setPeriodType(b.period_type || 'annual');
      if (b.assumptions?.length) setAssumptions(b.assumptions);
      if (b.portfolio?.length) setPortfolio(b.portfolio);
      if (b.lines?.length) setLines(b.lines);
    }
  }, [existingBudget]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      name: title || null,
      fiscal_year: year ? Number(year) : undefined,
      quarter: quarter ? Number(quarter) : undefined,
      month: month ? Number(month) : undefined,
      currency,
      period_type: periodType,
      notes: notes || null,
      assumptions: assumptions.filter((a) => a.label || a.value),
      portfolio: portfolio.filter((p) => p.funder_name || p.total_budget),
      lines: lines.filter((l) => l.line_name || l.total_amount),
    };
    if (context.scopeType !== 'finance') {
      payload.scope_type = context.scopeType;
      if (context.scopeId) {
        if (context.scopeType === 'team') payload.team_id = context.scopeId;
        else if (context.scopeType === 'project') payload.project_id = context.scopeId;
      }
    }

    try {
      let result: any;
      if (isEditing && budgetId) {
        result = await budgetApi.update(budgetId, payload);
      } else {
        result = await budgetApi.create(payload);
      }
      onSaved?.(result?.id || budgetId || '');
    } catch (e: any) {
      setError(e?.message || 'Failed to save budget');
    } finally {
      setIsSaving(false);
    }
  };

  const tabStyle = (tab: string): React.CSSProperties => ({
    padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer',
    borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
    color: activeTab === tab ? '#2563eb' : '#64748b',
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
        {(['summary', 'expenditures', 'assumptions', 'portfolio'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(t)}>{t}</button>
        ))}
      </div>

      {error ? (
        <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', fontSize: '13px', borderRadius: '6px', marginBottom: '12px' }}>{error}</div>
      ) : null}

      {activeTab === 'summary' && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Basic Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <TextField label="Title (Optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <SelectField label="Period Type" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
              <option value="annual">Annual</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </SelectField>
            <TextField label="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            <SelectField label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="NGN">NGN - Naira</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </SelectField>
            {periodType === 'quarterly' && (
              <SelectField label="Quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                <option value="">Select Quarter...</option>
                {[1, 2, 3, 4].map((q) => (<option key={q} value={String(q)}>Q{q}</option>))}
              </SelectField>
            )}
            {periodType === 'monthly' && (
              <SelectField label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">Select Month...</option>
                {Array.from({ length: 12 }).map((_, i) => (<option key={i + 1} value={String(i + 1)}>Month {i + 1}</option>))}
              </SelectField>
            )}
          </div>
          <div style={{ marginTop: '12px' }}>
            <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>
        </div>
      )}

      {activeTab === 'expenditures' && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Expenditure Lines</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Enter budgeted lines. Empty rows will be ignored.</div>
            </div>
            <Button variant="secondary" onClick={() => setLines([...lines, { ...emptyLine }])}>+ Add Row</Button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <DataTable
              columns={[
                { header: "Group Name", cell: (line: any) => { const idx = lines.indexOf(line); return <TextField label="" value={line.group_name || ''} onChange={(e) => { const u = [...lines]; u[idx].group_name = e.target.value; setLines(u); }} />; } },
                { header: "Line Name", cell: (line: any) => { const idx = lines.indexOf(line); return <TextField label="" value={line.line_name || ''} onChange={(e) => { const u = [...lines]; u[idx].line_name = e.target.value; setLines(u); }} />; } },
                { header: "Total Amount", cell: (line: any) => { const idx = lines.indexOf(line); return <TextField label="" type="number" value={line.total_amount || ''} onChange={(e) => { const u = [...lines]; u[idx].total_amount = e.target.value; setLines(u); }} />; } },
                { header: "Actions", cell: (line: any) => { const idx = lines.indexOf(line); return <Button variant="danger" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>Remove</Button>; } }
              ]}
              data={lines}
            />
          </div>
        </div>
      )}

      {activeTab === 'assumptions' && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Assumptions</div>
            <Button variant="secondary" onClick={() => setAssumptions([...assumptions, { ...emptyAssumption }])}>+ Add Assumption</Button>
          </div>
          <DataTable
            columns={[
              { header: "Label", cell: (asm: any) => { const idx = assumptions.indexOf(asm); return <TextField label="" value={asm.label || ''} onChange={(e) => { const u = [...assumptions]; u[idx].label = e.target.value; setAssumptions(u); }} />; } },
              { header: "Value", cell: (asm: any) => { const idx = assumptions.indexOf(asm); return <TextField label="" value={asm.value || ''} onChange={(e) => { const u = [...assumptions]; u[idx].value = e.target.value; setAssumptions(u); }} />; } },
              { header: "Notes", cell: (asm: any) => { const idx = assumptions.indexOf(asm); return <TextField label="" value={asm.notes || ''} onChange={(e) => { const u = [...assumptions]; u[idx].notes = e.target.value; setAssumptions(u); }} />; } },
              { header: "Actions", cell: (asm: any) => { const idx = assumptions.indexOf(asm); return <Button variant="danger" onClick={() => setAssumptions(assumptions.filter((_, i) => i !== idx))}>Remove</Button>; } }
            ]}
            data={assumptions}
          />
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Portfolio Integrations</div>
            <Button variant="secondary" onClick={() => setPortfolio([...portfolio, { ...emptyPortfolio }])}>+ Add Portfolio</Button>
          </div>
          <DataTable
            columns={[
              { header: "Funder Name", cell: (port: any) => { const idx = portfolio.indexOf(port); return <TextField label="" value={port.funder_name || ''} onChange={(e) => { const u = [...portfolio]; u[idx].funder_name = e.target.value; setPortfolio(u); }} />; } },
              { header: "Status", cell: (port: any) => { const idx = portfolio.indexOf(port); return (
                <SelectField label="" value={port.status || 'active'} onChange={(e) => { const u = [...portfolio]; u[idx].status = e.target.value; setPortfolio(u); }}>
                  <option value="active">Active</option>
                  <option value="pipeline">Pipeline</option>
                  <option value="closed">Closed</option>
                </SelectField>
              ); } },
              { header: "Total Budget", cell: (port: any) => { const idx = portfolio.indexOf(port); return <TextField label="" type="number" value={port.total_budget || ''} onChange={(e) => { const u = [...portfolio]; u[idx].total_budget = e.target.value; setPortfolio(u); }} />; } },
              { header: "Actions", cell: (port: any) => { const idx = portfolio.indexOf(port); return <Button variant="danger" onClick={() => setPortfolio(portfolio.filter((_, i) => i !== idx))}>Remove</Button>; } }
            ]}
            data={portfolio}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
        {onCancel ? <Button variant="secondary" onClick={onCancel}>Cancel</Button> : null}
        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Update Budget' : 'Create Budget'}</Button>
      </div>
    </div>
  );
}
