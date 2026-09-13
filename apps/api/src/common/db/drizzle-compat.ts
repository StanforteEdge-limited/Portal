import DecimalValue from 'decimal.js';
import { sql as drizzleSql } from 'drizzle-orm';
import type * as appSchema from '$app/db/schema';
import type { RepositoryService } from './repository.service';

export * from '$app/db/enums';

export const TokenType = { access: 'access', refresh: 'refresh', reset: 'reset', invite: 'invite' } as const;
export type TokenType = (typeof TokenType)[keyof typeof TokenType];
export const OrganizationType = { group: 'group', venture: 'venture', shared_function: 'shared_function' } as const;
export type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType];
export const GroupUserRole = { member: 'member', admin: 'admin', moderator: 'moderator' } as const;
export type GroupUserRole = (typeof GroupUserRole)[keyof typeof GroupUserRole];
export const RequestStatus = {
  draft: 'draft',
  returned: 'returned',
  sent: 'sent',
  approval: 'approval',
  cleared: 'cleared',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
  payment_processing: 'payment_processing',
  disbursed: 'disbursed',
  confirmed: 'confirmed',
  partially_disbursed: 'partially_disbursed',
  pending_retirement: 'pending_retirement',
  retired: 'retired',
  completed: 'completed',
} as const;
export const EmploymentType = { full_time: 'full_time', contract: 'contract', intern: 'intern', consultant: 'consultant' } as const;
export type EmploymentType = (typeof EmploymentType)[keyof typeof EmploymentType];
export const EmploymentStatus = { draft: 'draft', active: 'active', suspended: 'suspended', exited: 'exited' } as const;
export type EmploymentStatus = (typeof EmploymentStatus)[keyof typeof EmploymentStatus];
export const WorkMode = { onsite: 'onsite', hybrid: 'hybrid', remote: 'remote' } as const;
export type WorkMode = (typeof WorkMode)[keyof typeof WorkMode];
export const WorkItemStatus = { planned: 'planned', in_progress: 'in_progress', completed: 'completed', blocked: 'blocked', carried_over: 'carried_over', cancelled: 'cancelled' } as const;
export type WorkItemStatus = (typeof WorkItemStatus)[keyof typeof WorkItemStatus];
export const WorkLogApprovalStatus = { draft: 'draft', submitted: 'submitted', approved: 'approved', rejected: 'rejected' } as const;
export type WorkLogApprovalStatus = (typeof WorkLogApprovalStatus)[keyof typeof WorkLogApprovalStatus];

export class DrizzleClientKnownRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly clientVersion = 'drizzle',
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
  }
}

const DrizzleClientKnownRequestErrorValue = DrizzleClientKnownRequestError;

type JsonObject = Record<string, any>;
type Payload<T = unknown> = Record<string, any>;

export namespace Drizzle {
  export const Decimal = DecimalValue;
  export type Decimal = DecimalValue;
  export type JsonValue = unknown;
  export type InputJsonValue = unknown;
  export const JsonNull: null = null;
  export const DbNull: null = null;
  export const sql = drizzleSql;
  export const DrizzleClientKnownRequestError = DrizzleClientKnownRequestErrorValue;
  export type TransactionClient = RepositoryService;
  export type DrizzleClientOptions = { log?: string[] };
  export type DecimalJsLike = DecimalValue;

  export type AcknowledgementUncheckedCreateInput = JsonObject;
  export type AuditEventWhereInput = JsonObject;
  export type ContactWhereInput = JsonObject;
  export type ProfileWhereInput = JsonObject;
  export type DocumentAcknowledgementWhereInput = JsonObject;
  export type DocumentWhereInput = JsonObject;
  export type EmailLogWhereInput = JsonObject;
  export type EmployeeProfileWhereInput = JsonObject;
  export type AttendanceDailyWhereInput = JsonObject;
  export type FileAssetWhereInput = JsonObject;
  export type FinanceAccountWhereInput = JsonObject;
  export type FinanceAssetDisposalWhereInput = JsonObject;
  export type FinanceAssetGetPayload<T = unknown> = Payload<T>;
  export type FinanceAssetInclude = JsonObject;
  export type FinanceAssetWhereInput = JsonObject;
  export type FinanceBillHeaderGetPayload<T = unknown> = Payload<T>;
  export type FinanceBillHeaderWhereInput = JsonObject;
  export type FinanceBudgetGetPayload<T = unknown> = Payload<T>;
  export type FinanceBudgetRevisionGetPayload<T = unknown> = Payload<T>;
  export type FinanceBudgetRevisionLineGetPayload<T = unknown> = Payload<T>;
  export type FinanceChartAccountGetPayload<T = unknown> = Payload<T>;
  export type FinanceChartAccountWhereInput = JsonObject;
  export type FinanceContactCreateInput = JsonObject;
  export type FinanceContactUpdateInput = JsonObject;
  export type FinanceContactWhereInput = JsonObject;
  export type FinanceDonorGetPayload<T = unknown> = Payload<T>;
  export type FinanceFundGetPayload<T = unknown> = Payload<T>;
  export type FinanceGrantGetPayload<T = unknown> = Payload<T>;
  export type FinanceIncomeEntryGetPayload<T = unknown> = Payload<T>;
  export type FinanceIncomeEntryWhereInput = JsonObject;
  export type FinanceJournalEntryWhereInput = JsonObject;
  export type FinanceJournalLineGetPayload<T = unknown> = Payload<T>;
  export type FinanceLedgerEntryGetPayload<T = unknown> = Payload<T>;
  export type FinanceLedgerEntryWhereInput = JsonObject;
  export type FinancePaymentVoucherCorrectionGetPayload<T = unknown> = Payload<T>;
  export type FinancePaymentVoucherGetPayload<T = unknown> = Payload<T>;
  export type FinancePaymentVoucherWhereInput = JsonObject;
  export type FinanceReportNoteGetPayload<T = unknown> = Payload<T>;
  export type FinanceReportNoteWhereInput = JsonObject;
  export type FinanceReportingPeriodGetPayload<T = unknown> = Payload<T>;
  export type FinanceReportingPeriodWhereInput = JsonObject;
  export type FinanceRequestDeductionRemittanceAllocationWhereInput = JsonObject;
  export type FinanceRequestDeductionWhereInput = JsonObject;
  export type FinanceRequestRemittanceWhereInput = JsonObject;
  export type FinanceSalesInvoiceGetPayload<T = unknown> = Payload<T>;
  export type FinanceSalesInvoiceWhereInput = JsonObject;
  export type FormAssignmentWhereInput = JsonObject;
  export type FormWhereInput = JsonObject;
  export type LeaveBalanceLedgerWhereInput = JsonObject;
  export type GroupWhereInput = JsonObject;
  export type GroupInclude = JsonObject;
  export type OrganizationWhereInput = JsonObject;
  export type AcknowledgementWhereInput = JsonObject;
  export type NullableJsonNullValueInput = null;

  export type PayrollImportJobWhereInput = JsonObject;
  export type PayrollTaxTableUncheckedCreateInput = JsonObject;
  export type PolicyUncheckedCreateInput = JsonObject;
  export type PolicyUncheckedUpdateInput = JsonObject;
  export type PolicyWhereInput = JsonObject;
  export type ProjectUpdateInput = JsonObject;
  export type ProjectWhereInput = JsonObject;
  export type SprintWhereInput = JsonObject;
  export type SprintInclude = JsonObject;
  export type SprintUncheckedCreateInput = JsonObject;
  export type SprintUncheckedUpdateInput = JsonObject;
  export type RequestInstanceWhereInput = JsonObject;
  export type WorkflowHistoryWhereInput = JsonObject;
  export type WorkflowInstanceWhereInput = JsonObject;
  export type PayrollSettingUncheckedCreateInput = JsonObject;
  export type PayrollSettingUncheckedUpdateInput = JsonObject;
  export type PayrollWorkerWhereInput = JsonObject;
  export type PayrollComponentWhereInput = JsonObject;
  export type PayrollRunWhereInput = JsonObject;
  export type PayrollWorkerUncheckedCreateInput = JsonObject;
  export type PayrollComponentUncheckedCreateInput = JsonObject;
  export type PayrollWorkerInclude = JsonObject;
  export type PayrollRunInclude = JsonObject;
  export type ProjectTimesheetEntryUncheckedCreateInput = JsonObject;
  export type TeamGoalWhereInput = JsonObject;
  export type TeamGoalUncheckedCreateInput = JsonObject;
  export type TeamGoalUncheckedUpdateInput = JsonObject;
  export type TeamObjectiveWhereInput = JsonObject;
  export type TeamObjectiveUncheckedCreateInput = JsonObject;
  export type TeamObjectiveUncheckedUpdateInput = JsonObject;
  export type TeamKpiWhereInput = JsonObject;
  export type TeamKpiUncheckedCreateInput = JsonObject;
  export type TeamKpiUncheckedUpdateInput = JsonObject;
  export type WorkItemWhereInput = JsonObject;
  export type WorkItemUncheckedCreateInput = JsonObject;
  export type WorkItemUncheckedUpdateInput = JsonObject;
  export type WorkLogWhereInput = JsonObject;
  export type WorkLogUncheckedCreateInput = JsonObject;
  export type WorkLogUncheckedUpdateInput = JsonObject;
  export type WorkItemInclude = JsonObject;
  export type WorkLogInclude = JsonObject;
}

export type MailAccount = appSchema.MailAccount;
export type Policy = appSchema.Policy;
