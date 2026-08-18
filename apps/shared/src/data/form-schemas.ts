export interface RequestFormField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'uuid';
  options?: { label: string; value: string }[];
}

export const WORKFLOW_FORM_SCHEMAS: Record<string, RequestFormField[]> = {
  leave: [
    { name: 'leave_type', label: 'Leave Type', type: 'uuid' },
    { name: 'start_date', label: 'Start Date', type: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date' },
    { name: 'duration_days', label: 'Duration (Days)', type: 'number' },
    { name: 'handover_user_id', label: 'Handover Person', type: 'uuid' },
    { name: 'reason', label: 'Reason', type: 'string' },
  ],
  procurement: [
    { name: 'amount', label: 'Total Amount', type: 'number' },
    { name: 'category', label: 'Category', type: 'string' },
    { name: 'needed_by', label: 'Needed By', type: 'date' },
    { name: 'suggested_vendor_id', label: 'Suggested Vendor', type: 'uuid' },
    { name: 'budget_id', label: 'Budget', type: 'uuid' },
    { name: 'budget_line_id', label: 'Budget Line', type: 'uuid' },
    { name: 'justification', label: 'Justification', type: 'string' },
    { name: 'specification', label: 'Specification', type: 'string' },
  ],
  payment: [
    { name: 'amount', label: 'Total Amount', type: 'number' },
    { name: 'vendor_id', label: 'Vendor', type: 'uuid' },
    { name: 'invoice_number', label: 'Invoice Number', type: 'string' },
    { name: 'due_date', label: 'Due Date', type: 'date' },
    { name: 'budget_id', label: 'Budget', type: 'uuid' },
    { name: 'bank_name', label: 'Bank Name', type: 'string' },
  ],
  loan: [
    { name: 'amount', label: 'Loan Amount', type: 'number' },
    { name: 'repayment_months', label: 'Repayment Months', type: 'number' },
    { name: 'purpose', label: 'Purpose', type: 'string' },
  ]
};
