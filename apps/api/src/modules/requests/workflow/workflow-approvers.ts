export type WorkflowApproverType = 'role' | 'permission' | 'relation' | 'office';

export type WorkflowStepConfig = {
  role?: string;
  action?: string;
  min_amount?: number;
  approval_limit?: number;
  approver_type?: WorkflowApproverType;
  approver_id?: string;
  approver?: {
    type?: WorkflowApproverType;
    value?: string;
  };
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  }>;
};

export type NormalizedWorkflowApprover = {
  approverType: WorkflowApproverType;
  approverId: string;
};

const LEGACY_ROLE_MAP: Record<string, NormalizedWorkflowApprover> = {
  team_lead: { approverType: 'relation', approverId: 'requester_team_lead' },
  manager: { approverType: 'relation', approverId: 'requester_team_lead_or_manager' },
  team_lead_or_manager: { approverType: 'relation', approverId: 'requester_team_lead_or_manager' },
  accountant: { approverType: 'permission', approverId: 'finance.approve' },
  hr: { approverType: 'permission', approverId: 'hr.approve' },
  coo: { approverType: 'office', approverId: 'coo' },
  ed: { approverType: 'office', approverId: 'ed' },
};

export function normalizeWorkflowStepApprover(step: WorkflowStepConfig): NormalizedWorkflowApprover {
  const explicitType = String(step.approver?.type ?? step.approver_type ?? '')
    .trim()
    .toLowerCase() as WorkflowApproverType;
  const explicitId = String(step.approver?.value ?? step.approver_id ?? '')
    .trim();

  if (explicitType && explicitId) {
    return { approverType: explicitType, approverId: explicitId };
  }

  const role = String(step.role ?? '')
    .trim()
    .toLowerCase();

  if (!role) return { approverType: 'permission', approverId: 'requests.approve' };
  if (LEGACY_ROLE_MAP[role]) return LEGACY_ROLE_MAP[role];
  if (role.includes('.')) return { approverType: 'permission', approverId: role };
  return { approverType: 'role', approverId: role };
}

export function getWorkflowApproverLabel(approverType: WorkflowApproverType, approverId: string) {
  if (approverType === 'relation') {
    if (approverId === 'requester_team_lead') return 'Team lead approval';
    if (approverId === 'requester_team_lead_or_manager') return 'Team lead or manager approval';
  }

  if (approverType === 'permission') {
    if (approverId === 'finance.approve') return 'Finance approval';
    if (approverId === 'hr.approve') return 'HR approval';
    if (approverId === 'payroll.approve') return 'Payroll approval';
  }

  if (approverType === 'office') {
    if (approverId === 'coo') return 'COO approval';
    if (approverId === 'ed') return 'ED approval';
  }

  const label = approverId
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return `${label} approval`;
}

export function isLeadOrManagerApprover(step: WorkflowStepConfig) {
  const approver = normalizeWorkflowStepApprover(step);
  return (
    approver.approverType === 'relation' &&
    (approver.approverId === 'requester_team_lead' || approver.approverId === 'requester_team_lead_or_manager')
  );
}
