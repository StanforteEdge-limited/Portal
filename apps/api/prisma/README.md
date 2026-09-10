# Database Schema

118 models across these domains:

## Auth & Users
`Profile` → `Token`, `Notification`, `EmailLog`
`EmployeeProfile` → `EmployeeMeta`
`ProfileOrganization` → `UserRole` → `Role` → `RolePermission` → `Permission`

## Organizations & Groups
`Organization` → `OrganizationOfficeLocation` ↔ `OfficeLocation`
`Group` → `GroupUser` → `GroupUserOrganizationScope`, `GroupOrganization`

## HR
`EmployeeProfile` (job info, employment type/status)
`OnboardingProgress` (invited → completed)
`AttendanceEntry`, `AttendanceDaily`, `AttendanceHoliday`, `AttendanceCorrection`, `AttendanceException`
`LeaveBalanceLedger`

## Requests & Workflow
`RequestGroup` → `RequestCategory` → `RequestType` → `RequestInstance` → `RequestItem` → `RequestItemFile`
`Workflow` → `WorkflowStep` → `WorkflowStepApprover` → `WorkflowTransition`
`WorkflowInstance` → `WorkflowHistory`

## Finance Core
`FinanceAccount` (chart of accounts)
`FinanceJournalEntry` → `FinanceJournalLine` → `FinanceLedgerEntry`
`FinanceReportingPeriod`, `FinanceJournalSequence`
`FinanceIncomeEntry`

## Finance Assets
`FinanceAsset` → `FinanceAssetVerification`, `FinanceAssetDisposal`

## Finance Receivables & Payables
`FinanceContact` → `FinanceContactPerson`
`FinanceSalesInvoice` → `FinanceSalesInvoiceLine` → `FinanceReceipt` → `FinanceReceiptAllocation`
`FinanceBillHeader` → `FinanceBillLine` → `FinanceVendorPayment`

## Finance Budgets
`FinanceBudget` → `FinanceBudgetLine` → `FinanceBudgetAssumption`
`FinanceBudgetPortfolio`

## Finance Items & Expenses
`FinanceItem` → `FinanceExpense`
`FinanceDeductionType` → `FinancePVDeduction`
`FinanceVendorWHTAccrual` → `FinanceWHTRemittance`

## Finance Payment Vouchers
`FinancePaymentVoucher` → `FinancePaymentVoucherFile`, `FinancePaymentVoucherCorrection`
`FinanceSetting`, `FinanceDonor`, `FinanceFund`, `FinanceGrant`, `FinanceChartAccount`, `FinanceReportNote`

## Payroll
`PayrollWorker` → `PayrollWorkerProfile` → `PayrollWorkerProfileComponent`
`PayrollComponent`, `PayrollWorkerAllocation`
`PayrollRun` → `PayrollRunItem` → `PayrollRunItemLine`, `PayrollRunItemAllocation`, `PayrollRunTimesheetAllocation`
`PayrollLoan` → `PayrollLoanRepayment`
`PayrollAccountingPosting`
`PayrollTaxTable` → `PayrollTaxBand`
`PayrollImportJob` → `PayrollImportRow`
`PayrollRunEvent`, `PayrollPayslipDistribution`, `PayrollSetting`, `PayrollNotificationPreference`

## Work / Tasks
`WorkItem` → `WorkLog`
`ProjectTimesheetEntry`
`TeamGoal` → `TeamObjective` → `TeamKpi`

## Documents & Policies
`Document` → `DocumentAcknowledgement`
`Policy`
`FileAsset`

## Forms
`Form` → `FormField` → `FormAssignment` → `FormSubmission` → `FormSubmissionData`, `FormSubmissionHistory`

## Acknowledgements
`Acknowledgement`

## Taxonomy
`Taxonomy` → `TaxonomyTerm` → `TaxonomyTagAssignment`
