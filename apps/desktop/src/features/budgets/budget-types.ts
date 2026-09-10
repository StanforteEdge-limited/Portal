export type BudgetScopeContext = {
  scopeType: 'team' | 'project' | 'finance';
  scopeId?: string;
  mode: 'owner' | 'finance';
};

export type BudgetRevisionRecord = {
  id: string;
  revisionNumber?: number;
  revision_number: number;
  status: string;
  submittedAt?: string | null;
  submitted_at?: string | null;
  approvedAt?: string | null;
  approved_at?: string | null;
  submittedBy?: string | null;
  submitted_by?: number | null;
  approvedBy?: string | null;
  approved_by?: number | null;
  submissionNote?: string | null;
  submission_note?: string | null;
  justification?: string | null;
  lines?: BudgetLineRecord[];
};

export type BudgetLineRecord = {
  id?: string;
  line_label?: string;
  line_name?: string;
  group_name?: string;
  section?: string;
  amount?: number;
  total_amount?: number;
  notes?: string;
  sort_order?: number;
};

export type BudgetRecord = {
  id: string;
  name?: string;
  title?: string;
  fiscal_year?: number;
  year?: number;
  month?: number | null;
  quarter?: number | null;
  status?: string;
  currency?: string;
  total_budget?: number;
  total_actual?: number;
  variance_amount?: number;
  current_active_revision?: BudgetRevisionRecord | null;
  draft_revision?: BudgetRevisionRecord | null;
  currentActiveRevision?: BudgetRevisionRecord | null;
  draftRevision?: BudgetRevisionRecord | null;
  revisions?: BudgetRevisionRecord[];
  lines?: BudgetLineRecord[];
  assumptions?: Record<string, unknown>[];
  portfolio?: Record<string, unknown>[];
  notes?: string;
  scope_type?: string;
  team_id?: string;
  project_id?: string;
  owner_type?: string;
  owner_id?: number;
  period_type?: string;
};
