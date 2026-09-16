import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { CreatePayrollRunDto } from '$modules/hrm/payroll/dto/create-payroll-run.dto';
import { PayPayrollRunDto } from '$modules/hrm/payroll/dto/pay-payroll-run.dto';
import { GeneratePayrollPayslipTemplateDto, GeneratePayrollSummaryTemplateDto } from '$modules/hrm/payroll/dto/generate-payroll-template.dto';
import { PayrollImportDto } from '$modules/hrm/payroll/dto/payroll-import.dto';
import { UpdatePayrollRunAllocationsDto } from '$modules/hrm/payroll/dto/update-payroll-run-allocations.dto';
import { UpdatePayrollRunItemDto } from '$modules/hrm/payroll/dto/update-payroll-run-item.dto';
import { UpdatePayrollRunTimesheetAllocationsDto } from '$modules/hrm/payroll/dto/update-payroll-run-timesheet-allocations.dto';
import { UpsertPayrollLoanDto } from '$modules/hrm/payroll/dto/upsert-payroll-loan.dto';
import { UpsertProjectTimesheetEntryDto } from '$modules/hrm/payroll/dto/upsert-project-timesheet-entry.dto';
import { UpsertPayrollTaxTableDto } from '$modules/hrm/payroll/dto/upsert-payroll-tax-table.dto';
import { ReviewPayrollRunDto } from '$modules/hrm/payroll/dto/review-payroll-run.dto';
import { UpsertPayrollComponentDto } from '$modules/hrm/payroll/dto/upsert-payroll-component.dto';
import { UpsertPayrollSettingDto } from '$modules/hrm/payroll/dto/upsert-payroll-setting.dto';
import { UpsertPayrollWorkerDto } from '$modules/hrm/payroll/dto/upsert-payroll-worker.dto';
import { AuthorizePayrollRunDto } from '$modules/hrm/payroll/dto/authorize-payroll-run.dto';
import { PayrollService } from './payroll.service';
import { BackgroundJobsService } from '$modules/background-jobs/background-jobs.service';

@Controller('payroll')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Payroll')
@ApiBearerAuth('bearer')
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly backgroundJobs: BackgroundJobsService,
  ) {}

  @Get('summary')
  @Permissions('finance.view')
  summary(@Query() query: Record<string, any>) {
    return this.payrollService.summary(query);
  }

  @Get('my/payslips')
  myPayslips(@Req() req: any, @Query() query: Record<string, any>) {
    return this.payrollService.listMyPayslips(req.user?.id, query);
  }

  @Get('my/payslips/:runId/:itemId')
  myPayslipDetails(@Req() req: any, @Param('runId') runId: string, @Param('itemId') itemId: string) {
    return this.payrollService.getMyPayslipDetails(req.user?.id, runId, itemId);
  }

  @Post('my/payslips/:runId/:itemId')
  downloadMyPayslip(@Req() req: any, @Param('runId') runId: string, @Param('itemId') itemId: string) {
    return this.payrollService.generateMyPayslip(req.user?.id, runId, itemId);
  }

  @Get('my/timesheets')
  myTimesheets(@Req() req: any, @Query() query: Record<string, any>) {
    return this.payrollService.listMyProjectTimesheets(req.user?.id, query);
  }

  @Post('my/timesheets')
  createMyTimesheet(@Req() req: any, @Body() dto: UpsertProjectTimesheetEntryDto) {
    return this.payrollService.createMyProjectTimesheet(req.user?.id, dto);
  }

  @Post('my/timesheets/:id')
  updateMyTimesheet(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertProjectTimesheetEntryDto) {
    return this.payrollService.updateMyProjectTimesheet(req.user?.id, id, dto);
  }

  @Post('my/timesheets/:id/submit')
  submitMyTimesheet(@Req() req: any, @Param('id') id: string) {
    return this.payrollService.submitMyProjectTimesheet(req.user?.id, id);
  }

  @Get('inbox')
  @Permissions('finance.view')
  inbox(@Req() req: any, @Query() query: Record<string, any>) {
    return this.payrollService.getInbox(req.user?.id, req.user?.permissions ?? [], query);
  }

  @Get('settings')
  @Permissions('finance.manage')
  settings(@Query() query: Record<string, any>) {
    return this.payrollService.getSettings(query);
  }

  @Get('notification-preferences')
  @Permissions('finance.view')
  notificationPreferences(@Req() req: any) {
    return this.payrollService.getNotificationPreferences(req.user?.id);
  }

  @Post('notification-preferences')
  @Permissions('finance.view')
  upsertNotificationPreferences(@Req() req: any, @Body() body: Record<string, any>) {
    return this.payrollService.upsertNotificationPreferences(req.user?.id, body);
  }

  @Post('settings')
  @Permissions('finance.manage')
  upsertSettings(@Req() req: any, @Body() dto: UpsertPayrollSettingDto) {
    return this.payrollService.upsertSettings(dto, req.user?.id);
  }

  @Get('workers')
  @Permissions('payroll.manage', 'finance.view')
  listWorkers(@Query() query: Record<string, any>) {
    return this.payrollService.listWorkers(query);
  }

  @Get('workers/:id')
  @Permissions('payroll.manage', 'finance.view')
  getWorker(@Param('id') id: string) {
    return this.payrollService.getWorker(id);
  }

  @Post('workers')
  @Permissions('payroll.manage', 'finance.manage')
  createWorker(@Req() req: any, @Body() dto: UpsertPayrollWorkerDto) {
    return this.payrollService.createWorker(dto, req.user?.id);
  }

  @Post('workers/:id')
  @Permissions('payroll.manage', 'finance.manage')
  updateWorker(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertPayrollWorkerDto) {
    return this.payrollService.updateWorker(id, dto, req.user?.id);
  }

  @Delete('workers/:id')
  @Permissions('payroll.manage')
  deleteWorker(@Param('id') id: string) {
    return this.payrollService.deleteWorker(id);
  }

  @Get('loans')
  @Permissions('finance.view', 'payroll.manage')
  listLoans(@Query() query: Record<string, any>) {
    return this.payrollService.listLoans(query);
  }

  @Post('loans')
  @Permissions('finance.manage', 'payroll.manage')
  createLoan(@Body() dto: UpsertPayrollLoanDto) {
    return this.payrollService.createLoan(dto);
  }

  @Post('loans/:id')
  @Permissions('finance.manage', 'payroll.manage')
  updateLoan(@Param('id') id: string, @Body() dto: UpsertPayrollLoanDto) {
    return this.payrollService.updateLoan(id, dto);
  }

  @Post('loans/:id/repayments')
  @Permissions('finance.manage', 'payroll.manage')
  logManualRepayment(
    @Param('id') id: string,
    @Body() body: { amount: number; notes?: string }
  ) {
    return this.payrollService.logManualRepayment(id, body.amount, body.notes);
  }

  @Get('timesheets')
  @Permissions('finance.view')
  listTimesheets(@Query() query: Record<string, any>) {
    return this.payrollService.listProjectTimesheets(query);
  }

  @Post('timesheets')
  @Permissions('finance.manage')
  createTimesheet(@Req() req: any, @Body() dto: UpsertProjectTimesheetEntryDto) {
    return this.payrollService.createProjectTimesheet(dto, req.user?.id);
  }

  @Post('timesheets/:id')
  @Permissions('finance.manage')
  updateTimesheet(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertProjectTimesheetEntryDto) {
    return this.payrollService.updateProjectTimesheet(id, dto, req.user?.id);
  }

  @Post('timesheets/:id/submit')
  @Permissions('finance.manage')
  submitTimesheet(@Param('id') id: string) {
    return this.payrollService.submitProjectTimesheet(id);
  }

  @Post('timesheets/:id/approve')
  @Permissions('finance.manage')
  approveTimesheet(@Req() req: any, @Param('id') id: string) {
    return this.payrollService.approveProjectTimesheet(id, req.user?.id);
  }

  @Post('timesheets/:id/reject')
  @Permissions('finance.manage')
  rejectTimesheet(@Param('id') id: string) {
    return this.payrollService.rejectProjectTimesheet(id);
  }

  @Get('tax-tables')
  @Permissions('finance.view')
  listTaxTables(@Query() query: Record<string, any>) {
    return this.payrollService.listTaxTables(query);
  }

  @Post('tax-tables')
  @Permissions('finance.manage')
  createTaxTable(@Body() dto: UpsertPayrollTaxTableDto) {
    return this.payrollService.createTaxTable(dto);
  }

  @Post('tax-tables/:id')
  @Permissions('finance.manage')
  updateTaxTable(@Param('id') id: string, @Body() dto: UpsertPayrollTaxTableDto) {
    return this.payrollService.updateTaxTable(id, dto);
  }

  @Get('components')
  @Permissions('finance.view', 'payroll.manage')
  listComponents(@Query() query: Record<string, any>) {
    return this.payrollService.listComponents(query);
  }

  @Post('components')
  @Permissions('finance.manage')
  createComponent(@Body() dto: UpsertPayrollComponentDto) {
    return this.payrollService.createComponent(dto);
  }

  @Post('components/:id')
  @Permissions('finance.manage')
  updateComponent(@Param('id') id: string, @Body() dto: UpsertPayrollComponentDto) {
    return this.payrollService.updateComponent(id, dto);
  }

  @Delete('components/:id')
  @Permissions('finance.manage')
  deleteComponent(@Param('id') id: string) {
    return this.payrollService.deleteComponent(id);
  }

  @Get('runs/:id')
  @Permissions('payroll.manage', 'payroll.approve', 'payroll.authorize')
  getRun(@Param('id') id: string) {
    return this.payrollService.getRun(id);
  }

  @Get('runs')
  @Permissions('payroll.manage', 'payroll.approve', 'payroll.authorize')
  listRuns(@Query() query: Record<string, any>) {
    return this.payrollService.listRuns(query);
  }

  @Delete('runs/:id')
  @Permissions('payroll.manage')
  deleteRun(@Param('id') id: string) {
    return this.payrollService.deleteRun(id);
  }

  @Post('runs')
  @Permissions('payroll.manage')
  createRun(@Req() req: any, @Body() dto: CreatePayrollRunDto) {
    return this.payrollService.createRun(dto, req.user?.id);
  }

  @Post('runs/:id')
  @Permissions('payroll.manage')
  updateRun(@Req() req: any, @Param('id') id: string, @Body() dto: CreatePayrollRunDto) {
    return this.payrollService.updateRun(id, dto, req.user?.id);
  }

  @Post('runs/:id/generate')
  @Permissions('payroll.manage')
  generateRun(@Req() req: any, @Param('id') id: string) {
    return this.payrollService.generateRun(id, req.user?.id);
  }

  @Post('runs/:id/submit')
  @Permissions('payroll.manage')
  submitRun(@Req() req: any, @Param('id') id: string) {
    return this.payrollService.submitRun(id, req.user?.id);
  }

  @Post('runs/:id/review')
  @Permissions('payroll.approve')
  reviewRun(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewPayrollRunDto) {
    return this.payrollService.reviewRun(id, dto, req.user?.id);
  }

  @Post('runs/:id/approve')
  @Permissions('payroll.approve')
  approveRun(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewPayrollRunDto) {
    return this.payrollService.approveRun(id, dto, req.user?.id);
  }

  @Post('runs/:id/reject')
  @Permissions('payroll.approve')
  rejectRun(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewPayrollRunDto) {
    return this.payrollService.rejectRun(id, dto, req.user?.id);
  }

  @Post('runs/:id/authorize')
  @Permissions('payroll.authorize')
  authorizeRun(@Req() req: any, @Param('id') id: string, @Body() dto: AuthorizePayrollRunDto) {
    return this.payrollService.authorizeRun(id, dto, req.user?.id);
  }

  @Post('runs/:id/reopen')
  @Permissions('payroll.manage')
  reopenRun(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewPayrollRunDto) {
    return this.payrollService.reopenRun(id, dto, req.user?.id);
  }

  @Post('runs/:id/close')
  @Permissions('payroll.approve')
  closeRun(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewPayrollRunDto) {
    return this.payrollService.closeRun(id, dto, req.user?.id);
  }

  @Post('runs/:id/pay')
  @Permissions('payroll.approve')
  payRun(@Req() req: any, @Param('id') id: string, @Body() dto: PayPayrollRunDto) {
    return this.payrollService.payRun(id, dto, req.user?.id);
  }

  @Post('runs/:id/payslips/:itemId')
  @Permissions('finance.view')
  generateRunItemPayslip(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.payrollService.generateRunItemPayslip(id, itemId);
  }

  @Post('runs/:id/payslips-package')
  @Permissions('finance.view')
  generateRunPayslipsPackage(@Param('id') id: string) {
    return this.backgroundJobs.enqueue({
      type: 'payroll.generate-payslips-package',
      input: { runId: id },
      onSuccessTitle: 'Payslips package generated',
      onSuccessMessage: `Payslips package for payroll run #${id} has been generated and is ready to download.`,
    });
  }

  @Post('runs/:id/distribute-payslips')
  @Permissions('finance.view')
  distributeRunPayslips(@Req() req: any, @Param('id') id: string) {
    return this.backgroundJobs.enqueue({
      type: 'payroll.distribute-payslips',
      input: { runId: id },
      onSuccessTitle: 'Payslips distributed',
      onSuccessMessage: `Payslips for payroll run #${id} have been distributed to workers.`,
    });
  }

  @Post('runs/:id/bank-schedule')
  @Permissions('finance.view')
  generateBankSchedule(@Param('id') id: string) {
    return this.payrollService.generateBankSchedule(id);
  }

  @Post('runs/:id/monthly-breakdown')
  @Permissions('payroll.manage', 'payroll.approve', 'payroll.authorize')
  monthlyBreakdown(@Param('id') id: string) {
    return this.payrollService.monthlyBreakdown(id);
  }

  @Get('reports/overview')
  @Permissions('finance.view')
  reportsOverview(@Query() query: Record<string, any>) {
    return this.payrollService.reportsOverview(query);
  }

  @Post('runs/:id/items/:itemId')
  @Permissions('finance.manage')
  updateRunItem(@Req() req: any, @Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: UpdatePayrollRunItemDto) {
    return this.payrollService.updateRunItem(id, itemId, dto, req.user?.id);
  }

  @Post('runs/:id/items/:itemId/allocations')
  @Permissions('finance.manage')
  updateRunItemAllocations(
    @Req() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePayrollRunAllocationsDto
  ) {
    return this.payrollService.updateRunItemAllocations(id, itemId, dto, req.user?.id);
  }

  @Post('runs/:id/workers/:workerId/timesheet-allocations')
  @Permissions('finance.manage')
  updateRunWorkerTimesheetAllocations(
    @Req() req: any,
    @Param('id') id: string,
    @Param('workerId') workerId: string,
    @Body() dto: UpdatePayrollRunTimesheetAllocationsDto
  ) {
    return this.payrollService.updateRunWorkerTimesheetAllocations(id, workerId, dto, req.user?.id);
  }

  @Post('import/validate')
  @Permissions('finance.manage')
  validateImport(@Body() dto: PayrollImportDto) {
    return this.payrollService.validateImport(dto);
  }

  @Get('import/jobs')
  @Permissions('finance.manage')
  listImportJobs(@Query() query: Record<string, any>) {
    return this.payrollService.listImportJobs(query);
  }

  @Get('import/jobs/:id')
  @Permissions('finance.manage')
  getImportJob(@Param('id') id: string) {
    return this.payrollService.getImportJob(id);
  }

  @Post('import/commit')
  @Permissions('finance.manage')
  commitImport(@Req() req: any, @Body() dto: PayrollImportDto) {
    return this.payrollService.commitImport(dto, req.user?.id);
  }

  @Post('import/jobs/:id/retry-failed')
  @Permissions('finance.manage')
  retryFailedImport(@Req() req: any, @Param('id') id: string) {
    return this.payrollService.retryFailedImport(id, req.user?.id);
  }

  @Post('templates/payslip')
  @Permissions('finance.view')
  generatePayslipTemplate(@Body() dto: GeneratePayrollPayslipTemplateDto) {
    return this.payrollService.generatePayslipTemplate(dto);
  }

  @Post('templates/summary')
  @Permissions('finance.view')
  generateSummaryTemplate(@Body() dto: GeneratePayrollSummaryTemplateDto) {
    return this.payrollService.generateSummaryTemplate(dto);
  }
}

