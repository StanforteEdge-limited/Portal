import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PdfService } from '../../common/pdf/pdf.service';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { MailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { GeneratePayrollPayslipTemplateDto, GeneratePayrollSummaryTemplateDto } from './dto/generate-payroll-template.dto';
import { PayPayrollRunDto } from './dto/pay-payroll-run.dto';
import { PayrollImportDto } from './dto/payroll-import.dto';
import { UpdatePayrollRunAllocationsDto } from './dto/update-payroll-run-allocations.dto';
import { UpdatePayrollRunItemDto } from './dto/update-payroll-run-item.dto';
import { UpdatePayrollRunTimesheetAllocationsDto } from './dto/update-payroll-run-timesheet-allocations.dto';
import { UpsertPayrollComponentDto } from './dto/upsert-payroll-component.dto';
import { UpsertPayrollSettingDto } from './dto/upsert-payroll-setting.dto';
import { UpsertPayrollTaxTableDto } from './dto/upsert-payroll-tax-table.dto';
import { UpsertPayrollWorkerDto } from './dto/upsert-payroll-worker.dto';
import { paginatedResponse } from '../../common/helpers/paginated-response';

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly pdfService: PdfService
  ) {}

  async summary(query: Record<string, any> = {}) {
    const orgFilter = query.organization_id ? { organizationId: toBigInt(String(query.organization_id)) } : {};
    const [workers, activeWorkers, consultants, components, runs, latestRun] = await this.prisma.$transaction([
      this.prisma.payrollWorker.count({ where: orgFilter }),
      this.prisma.payrollWorker.count({ where: { status: 'active', ...orgFilter } }),
      this.prisma.payrollWorker.count({ where: { workerType: 'consultant', ...orgFilter } }),
      this.prisma.payrollComponent.count({ where: { isActive: true } }),
      this.prisma.payrollRun.count({ where: orgFilter }),
      this.prisma.payrollRun.findFirst({ where: orgFilter, orderBy: [{ year: 'desc' }, { month: 'desc' }] })
    ]);

    return {
      workers,
      active_workers: activeWorkers,
      consultants,
      active_components: components,
      runs,
      latest_run: latestRun ? this.serializeRunSummary(latestRun) : null
    };
  }

  async listMyPayslips(userId: string, query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(50, Math.max(1, Number(query.per_page ?? 20)));
    const worker = await this.prisma.payrollWorker.findFirst({
      where: { profileId: toBigInt(userId) },
      select: { id: true }
    });
    if (!worker) {
      return paginatedResponse([], { page, per_page: perPage, total: 0 });
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payrollRunItem.findMany({
        where: { workerId: worker.id },
        include: {
          run: true,
          payslipDistributions: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: [{ run: { year: 'desc' } }, { run: { month: 'desc' } }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.payrollRunItem.count({ where: { workerId: worker.id } }),
    ]);

    return paginatedResponse(rows.map((row) => ({
      id: row.id,
      run_id: row.runId,
      run_name: row.run.name,
      year: row.run.year,
      month: row.run.month,
      status: row.run.status,
      gross_pay: Number(row.grossPay || 0),
      total_deductions: Number(row.totalDeductions || 0),
      net_pay: Number(row.netPay || 0),
      payment_status: row.paymentStatus,
      payment_reference: row.paymentReference,
      latest_distribution: row.payslipDistributions?.[0]
        ? {
            id: row.payslipDistributions[0].id,
            status: row.payslipDistributions[0].status,
            sent_at: row.payslipDistributions[0].sentAt,
            created_at: row.payslipDistributions[0].createdAt,
          }
        : null,
    })), { page, per_page: perPage, total });
  }

  async getMyPayslipDetails(userId: string, runId: string, itemId: string) {
    const worker = await this.prisma.payrollWorker.findFirst({
      where: { profileId: toBigInt(userId) },
      select: { id: true }
    });
    if (!worker) throw new NotFoundException('Payslip not found');

    const row = await this.prisma.payrollRunItem.findFirst({
      where: { id: itemId, runId, workerId: worker.id },
      include: {
        run: true,
        worker: true,
        organization: { select: { id: true, name: true } },
        lines: { include: { component: true }, orderBy: { createdAt: 'asc' } },
        payslipDistributions: { orderBy: { createdAt: 'desc' }, take: 5 },
      }
    });
    if (!row) throw new NotFoundException('Payslip not found');

    const earnings = row.lines
      .filter((line) => line.lineType === 'earning')
      .map((line) => ({ label: line.component.name, amount: Number(line.amount || 0) }));
    const deductions = row.lines
      .filter((line) => line.lineType === 'deduction')
      .map((line) => ({ label: line.component.name, amount: Number(line.amount || 0) }));
    const employerCosts = row.lines
      .filter((line) => line.lineType === 'employer_cost')
      .map((line) => ({ label: line.component.name, amount: Number(line.amount || 0) }));
    const employerCostTotal = employerCosts.reduce((sum, item) => sum + item.amount, 0);

    return {
      id: row.id,
      run_id: row.runId,
      run_name: row.run.name,
      year: row.run.year,
      month: row.run.month,
      status: row.run.status,
      currency: row.run.currency,
      worker_name: row.worker.fullName,
      worker_type: row.workerType,
      organization_name: row.organization?.name || null,
      gross_pay: Number(row.grossPay || 0),
      total_deductions: Number(row.totalDeductions || 0),
      net_pay: Number(row.netPay || 0),
      employer_cost: employerCostTotal,
      payment_status: row.paymentStatus,
      payment_reference: row.paymentReference,
      latest_distribution: row.payslipDistributions?.[0]
        ? {
            id: row.payslipDistributions[0].id,
            status: row.payslipDistributions[0].status,
            sent_at: row.payslipDistributions[0].sentAt,
            created_at: row.payslipDistributions[0].createdAt,
          }
        : null,
      earnings,
      deductions,
      employer_costs: employerCosts,
    };
  }

  async generateMyPayslip(userId: string, runId: string, itemId: string) {
    const row = await this.prisma.payrollRunItem.findFirst({
      where: {
        id: itemId,
        runId,
        worker: { profileId: toBigInt(userId) },
      },
      select: { id: true }
    });
    if (!row) throw new NotFoundException('Payslip not found');
    return this.generateRunItemPayslip(runId, itemId);
  }

  async listMyProjectTimesheets(userId: string, query: Record<string, any>) {
    const worker = await this.resolveWorkerForUser(userId);
    return this.listProjectTimesheets({ ...query, worker_id: worker.id });
  }

  async createMyProjectTimesheet(userId: string, dto: any) {
    const worker = await this.resolveWorkerForUser(userId);
    return this.createProjectTimesheet({ ...dto, worker_id: worker.id }, userId);
  }

  async updateMyProjectTimesheet(userId: string, id: string, dto: any) {
    const worker = await this.resolveWorkerForUser(userId);
    const row = await this.prisma.projectTimesheetEntry.findUnique({ where: { id } });
    if (!row || row.workerId !== worker.id) throw new NotFoundException('Project timesheet entry not found');
    if (!['draft', 'rejected'].includes(row.status)) {
      throw new BadRequestException('Only draft or rejected timesheets can be edited');
    }
    return this.updateProjectTimesheet(id, { ...dto, worker_id: worker.id, status: row.status }, userId);
  }

  async submitMyProjectTimesheet(userId: string, id: string) {
    const worker = await this.resolveWorkerForUser(userId);
    const row = await this.prisma.projectTimesheetEntry.findUnique({ where: { id } });
    if (!row || row.workerId !== worker.id) throw new NotFoundException('Project timesheet entry not found');
    if (!['draft', 'rejected'].includes(row.status)) {
      throw new BadRequestException('Only draft or rejected timesheets can be submitted');
    }
    return this.submitProjectTimesheet(id);
  }

  async getInbox(userId: string, permissions: string[] = [], query: Record<string, any> = {}) {
    const actorId = toBigInt(userId);
    const canManage =
      permissions.includes('finance.manage') ||
      permissions.includes('payroll.approve') ||
      permissions.includes('requests.approve') ||
      permissions.includes('settings.manage');

    const orgFilter = query.organization_id ? { organizationId: toBigInt(String(query.organization_id)) } : {};

    const [approvals, corrections, payments, importJobs, failedDistributions, notifications] = await this.prisma.$transaction([
      this.prisma.payrollRun.findMany({
        where: canManage ? { status: 'under_review', ...orgFilter } : { status: 'under_review', preparedById: actorId, ...orgFilter },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 10,
        include: { items: true, _count: { select: { items: true } } }
      }),
      this.prisma.payrollRun.findMany({
        where: canManage
          ? { status: 'rejected', ...orgFilter }
          : { status: 'rejected', OR: [{ preparedById: actorId }, { reviewedById: actorId }, { approvedById: actorId }], ...orgFilter },
        orderBy: [{ updatedAt: 'desc' }],
        take: 10,
        include: { items: true, _count: { select: { items: true } } }
      }),
      this.prisma.payrollRun.findMany({
        where: canManage ? { status: 'approved', ...orgFilter } : { status: 'approved', preparedById: actorId, ...orgFilter },
        orderBy: [{ updatedAt: 'desc' }],
        take: 10,
        include: { items: true, _count: { select: { items: true } } }
      }),
      this.prisma.payrollImportJob.findMany({
        where: canManage
          ? { status: { in: ['partial', 'failed'] } }
          : { uploadedBy: actorId, status: { in: ['partial', 'failed'] } },
        orderBy: [{ createdAt: 'desc' }],
        take: 10,
        include: { _count: { select: { rows: true } } }
      }),
      this.prisma.payrollPayslipDistribution.findMany({
        where: canManage
          ? { status: { in: ['failed', 'skipped'] } }
          : { OR: [{ sentBy: actorId }, { run: { preparedById: actorId } }], status: { in: ['failed', 'skipped'] } },
        orderBy: [{ createdAt: 'desc' }],
        take: 20,
        include: {
          run: true,
          worker: { select: { id: true, fullName: true, email: true, workerType: true } }
        }
      }),
      this.prisma.notification.findMany({
        where: {
          userId: actorId,
          OR: [
            { notifiableType: 'payroll_run' },
            { notifiableType: 'payroll_import_job' },
            { type: { startsWith: 'payroll.' } },
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      approvals: approvals.map((row) => ({ ...this.serializeRunSummary(row), link: `/app/finance/payroll/runs?run_id=${row.id}` })),
      corrections: corrections.map((row) => ({ ...this.serializeRunSummary(row), link: `/app/finance/payroll/runs?run_id=${row.id}` })),
      payments: payments.map((row) => ({ ...this.serializeRunSummary(row), link: `/app/finance/payroll/runs?run_id=${row.id}` })),
      import_issues: importJobs.map((row) => ({ ...this.serializeImportJobSummary(row), link: `/app/finance/payroll/import?job_id=${row.id}` })),
      delivery_issues: failedDistributions.map((row) => ({
        id: row.id,
        status: row.status,
        error_message: row.errorMessage,
        recipient_email: row.recipientEmail,
        sent_at: row.sentAt,
        created_at: row.createdAt,
        link: row.run ? `/app/finance/payroll/runs?run_id=${row.run.id}` : "/app/finance/payroll/runs",
        run: row.run ? { id: row.run.id, name: row.run.name, status: row.run.status } : null,
        worker: row.worker
          ? { id: row.worker.id, full_name: row.worker.fullName, email: row.worker.email, worker_type: row.worker.workerType }
          : null,
      })),
      notifications: notifications.map((row) => ({
        id: row.id.toString(),
        type: row.type,
        title: row.title,
        message: row.message,
        link: row.link,
        status: row.status,
        created_at: row.createdAt,
        data: row.data || {},
      })),
      counts: {
        approvals: approvals.length,
        corrections: corrections.length,
        payments: payments.length,
        import_issues: importJobs.length,
        delivery_issues: failedDistributions.length,
        notifications: notifications.length,
      }
    };
  }

  async getSettings(query: Record<string, any>) {
    const organizationId = query.organization_id ? this.parseBigInt(query.organization_id, 'organization id') : null;
    const row = await this.prisma.payrollSetting.findFirst({
      where: organizationId ? { organizationId } : {},
      include: {
        organization: { select: { id: true, name: true } },
        defaultExpenseAccount: { select: { id: true, code: true, name: true } },
        defaultCashAccount: { select: { id: true, code: true, name: true } },
        employeeTaxTable: { include: { bands: { orderBy: { sortOrder: 'asc' } } } },
      }
    });
    return row ? this.serializeSetting(row) : null;
  }

  async getNotificationPreferences(userId: string) {
    const row = await this.prisma.payrollNotificationPreference.findUnique({
      where: { userId: toBigInt(userId) }
    });
    return this.serializeNotificationPreferences(row);
  }

  async upsertNotificationPreferences(userId: string, payload: Record<string, any>) {
    const config = this.normalizeNotificationPreferenceConfig(payload);
    const row = await this.prisma.payrollNotificationPreference.upsert({
      where: { userId: toBigInt(userId) },
      create: { userId: toBigInt(userId), config: config as Prisma.InputJsonValue },
      update: { config: config as Prisma.InputJsonValue },
    });
    return this.serializeNotificationPreferences(row);
  }

  async upsertSettings(dto: UpsertPayrollSettingDto, actorId?: string) {
    const organizationId = dto.organization_id ? this.parseBigInt(dto.organization_id, 'organization id') : null;
    const existing = await this.prisma.payrollSetting.findFirst({ where: organizationId ? { organizationId } : { organizationId: null } });
    const payload: Prisma.PayrollSettingUncheckedCreateInput | Prisma.PayrollSettingUncheckedUpdateInput = {
      organizationId,
      defaultExpenseAccountId: dto.default_expense_account_id || null,
      defaultCashAccountId: dto.default_cash_account_id || null,
      employeeTaxTableId: dto.employee_tax_table_id || null,
      config: (dto.config || {}) as Prisma.InputJsonValue,
      updatedBy: actorId ? toBigInt(actorId) : null,
    };
    const row = existing
      ? await this.prisma.payrollSetting.update({
          where: { id: existing.id },
          data: payload,
          include: {
            organization: { select: { id: true, name: true } },
            defaultExpenseAccount: { select: { id: true, code: true, name: true } },
            defaultCashAccount: { select: { id: true, code: true, name: true } },
            employeeTaxTable: { include: { bands: { orderBy: { sortOrder: 'asc' } } } },
          }
        })
      : await this.prisma.payrollSetting.create({
          data: payload as Prisma.PayrollSettingUncheckedCreateInput,
          include: {
            organization: { select: { id: true, name: true } },
            defaultExpenseAccount: { select: { id: true, code: true, name: true } },
            defaultCashAccount: { select: { id: true, code: true, name: true } },
            employeeTaxTable: { include: { bands: { orderBy: { sortOrder: 'asc' } } } },
          }
        });
    return this.serializeSetting(row);
  }

  async listTaxTables(query: Record<string, any>) {
    const organizationId = query.organization_id ? this.parseBigInt(query.organization_id, 'organization id') : null;
    const rows = await this.prisma.payrollTaxTable.findMany({
      where: {
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
        ...(query.status ? { status: String(query.status) } : {}),
        ...(query.worker_type ? { workerType: String(query.worker_type) } : {}),
      },
      include: {
        bands: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ status: 'asc' }, { effectiveFrom: 'desc' }, { name: 'asc' }],
    });
    const items = rows.map((row) => this.serializeTaxTable(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createTaxTable(dto: UpsertPayrollTaxTableDto) {
    const row = await this.prisma.payrollTaxTable.create({
      data: {
        ...this.mapTaxTableDto(dto),
        bands: {
          create: this.mapTaxBandDtos(dto.bands || []),
        },
      },
      include: { bands: { orderBy: { sortOrder: 'asc' } } },
    });
    return this.serializeTaxTable(row);
  }

  async updateTaxTable(id: string, dto: UpsertPayrollTaxTableDto) {
    const existing = await this.prisma.payrollTaxTable.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payroll tax table not found');
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.payrollTaxBand.deleteMany({ where: { tableId: id } });
      return tx.payrollTaxTable.update({
        where: { id },
        data: {
          ...this.mapTaxTableDto(dto),
          bands: {
            create: this.mapTaxBandDtos(dto.bands || []),
          },
        },
        include: { bands: { orderBy: { sortOrder: 'asc' } } },
      });
    });
    return this.serializeTaxTable(row);
  }

  async listWorkers(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));
    const where: Prisma.PayrollWorkerWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullName: { contains: String(query.search), mode: 'insensitive' } },
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { staffCode: { contains: String(query.search), mode: 'insensitive' } }
      ];
    }
    if (query.worker_type) where.workerType = String(query.worker_type);
    if (query.status) where.status = String(query.status);
    if (query.organization_id) where.organizationId = toBigInt(String(query.organization_id));

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payrollWorker.findMany({
        where,
        include: this.workerInclude(),
        orderBy: [{ fullName: 'asc' }],
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.prisma.payrollWorker.count({ where })
    ]);

    return paginatedResponse(rows.map((row) => this.serializeWorker(row)), { page, per_page: perPage, total });
  }

  async getWorker(id: string) {
    const row = await this.prisma.payrollWorker.findUnique({ where: { id }, include: this.workerInclude() });
    if (!row) throw new NotFoundException('Payroll worker not found');
    return this.serializeWorker(row);
  }

  async createWorker(dto: UpsertPayrollWorkerDto, actorId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const worker = await tx.payrollWorker.create({
        data: this.mapWorkerDto(dto),
      });
      await this.syncWorkerChildrenTx(tx, worker.id, dto);
      const row = await tx.payrollWorker.findUnique({ where: { id: worker.id }, include: this.workerInclude() });
      return this.serializeWorker(row!);
    });
  }

  async updateWorker(id: string, dto: UpsertPayrollWorkerDto, actorId?: string) {
    const existing = await this.prisma.payrollWorker.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payroll worker not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.payrollWorker.update({ where: { id }, data: this.mapWorkerDto(dto) });
      await this.syncWorkerChildrenTx(tx, id, dto);
      const row = await tx.payrollWorker.findUnique({ where: { id }, include: this.workerInclude() });
      return this.serializeWorker(row!);
    });
  }

  async deleteWorker(id: string) {
    const existing = await this.prisma.payrollWorker.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payroll worker not found');

    // Prevent removal if worker is in an active (non-draft/non-rejected) run
    const activeRunItems = await this.prisma.payrollRunItem.count({
      where: {
        workerId: id,
        run: { status: { notIn: ['draft', 'rejected'] } },
      },
    });
    if (activeRunItems > 0) {
      throw new BadRequestException(
        'Cannot remove worker — they are included in an active payroll run. Deactivate them instead.'
      );
    }

    const usage = await this.prisma.$transaction([
      this.prisma.payrollRunItem.count({ where: { workerId: id } }),
      this.prisma.projectTimesheetEntry.count({ where: { workerId: id } }),
      this.prisma.payrollLoan.count({ where: { workerId: id } }),
      this.prisma.payrollRunTimesheetAllocation.count({ where: { workerId: id } }),
      this.prisma.payrollPayslipDistribution.count({ where: { workerId: id } }),
    ]);

    const totalUsage = usage.reduce((sum, count) => sum + count, 0);
    if (totalUsage > 0) {
      await this.prisma.payrollWorker.update({
        where: { id },
        data: { status: 'inactive' },
      });
      return { action: 'deactivated', reason: 'worker has payroll history and was marked inactive instead of deleted' };
    }

    await this.prisma.payrollWorker.delete({ where: { id } });
    return { action: 'deleted' };
  }

  async listLoans(query: Record<string, any>) {
    const rows = await this.prisma.payrollLoan.findMany({
      where: {
        ...(query.worker_id ? { workerId: String(query.worker_id) } : {}),
        ...(query.status ? { status: String(query.status) } : {}),
        ...(query.loan_type ? { loanType: String(query.loan_type) } : {}),
      },
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        repayments: { orderBy: { createdAt: 'desc' }, take: 24 },
      },
      orderBy: [{ status: 'asc' }, { issuedDate: 'desc' }]
    });
    const items = rows.map((row) => this.serializeLoan(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createLoan(dto: any) {
    const row = await this.prisma.payrollLoan.create({
      data: {
        workerId: dto.worker_id,
        componentId: dto.component_id || null,
        requestId: dto.request_id ? BigInt(String(dto.request_id)) : null,
        loanType: dto.loan_type,
        title: dto.title,
        principalAmount: dto.principal_amount,
        outstandingAmount: dto.principal_amount,
        issuedDate: new Date(dto.issued_date),
        startRecoveryDate: new Date(dto.start_recovery_date),
        monthlyRecoveryAmount: dto.monthly_recovery_amount ?? null,
        recoveryRate: dto.recovery_rate ?? null,
        status: dto.status || 'active',
        notes: dto.notes || null,
      },
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        repayments: { orderBy: { createdAt: 'desc' }, take: 24 },
      }
    });
    return this.serializeLoan(row);
  }

  async updateLoan(id: string, dto: any) {
    const existing = await this.prisma.payrollLoan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payroll loan not found');
    const row = await this.prisma.payrollLoan.update({
      where: { id },
      data: {
        workerId: dto.worker_id,
        componentId: dto.component_id || null,
        requestId: dto.request_id ? BigInt(String(dto.request_id)) : null,
        loanType: dto.loan_type,
        title: dto.title,
        principalAmount: dto.principal_amount,
        issuedDate: new Date(dto.issued_date),
        startRecoveryDate: new Date(dto.start_recovery_date),
        monthlyRecoveryAmount: dto.monthly_recovery_amount ?? null,
        recoveryRate: dto.recovery_rate ?? null,
        status: dto.status || existing.status,
        notes: dto.notes || null,
      },
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        repayments: { orderBy: { createdAt: 'desc' }, take: 24 },
      }
    });
    return this.serializeLoan(row);
  }

  async logManualRepayment(id: string, amount: number, notes?: string) {
    const existing = await this.prisma.payrollLoan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payroll loan not found');

    const newOutstanding = Number(existing.outstandingAmount || 0) - amount;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.payrollLoanRepayment.create({
        data: {
          loanId: id,
          amount,
          notes: notes || 'Manual repayment',
        }
      });
      return tx.payrollLoan.update({
        where: { id },
        data: {
          outstandingAmount: newOutstanding,
          status: newOutstanding <= 0 ? 'completed' : existing.status,
        },
        include: {
          worker: { select: { id: true, fullName: true, workerType: true, email: true } },
          component: { select: { id: true, code: true, name: true } },
          repayments: { orderBy: { createdAt: 'desc' }, take: 24 },
        }
      });
    });

    return this.serializeLoan(row);
  }

  async listProjectTimesheets(query: Record<string, any>) {
    const rows = await this.prisma.projectTimesheetEntry.findMany({
      where: {
        ...(query.worker_id ? { workerId: String(query.worker_id) } : {}),
        ...(query.status ? { status: String(query.status) } : {}),
        ...(query.project_id ? { projectId: this.parseBigInt(String(query.project_id), 'project id') } : {}),
      },
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, name: true } },
        fund: { select: { id: true, code: true, name: true } },
        grant: { select: { id: true, code: true, name: true } },
        syncedRun: { select: { id: true, name: true, year: true, month: true, status: true } },
      },
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }]
    });
    const items = rows.map((row) => this.serializeProjectTimesheet(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createProjectTimesheet(dto: any, actorId?: string) {
    const row = await this.prisma.projectTimesheetEntry.create({
      data: this.mapProjectTimesheetDto(dto, actorId),
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, name: true } },
        fund: { select: { id: true, code: true, name: true } },
        grant: { select: { id: true, code: true, name: true } },
        syncedRun: { select: { id: true, name: true, year: true, month: true, status: true } },
      }
    });
    return this.serializeProjectTimesheet(row);
  }

  async updateProjectTimesheet(id: string, dto: any, actorId?: string) {
    const existing = await this.prisma.projectTimesheetEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project timesheet entry not found');
    const row = await this.prisma.projectTimesheetEntry.update({
      where: { id },
      data: this.mapProjectTimesheetDto(dto, actorId, true),
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, name: true } },
        fund: { select: { id: true, code: true, name: true } },
        grant: { select: { id: true, code: true, name: true } },
        syncedRun: { select: { id: true, name: true, year: true, month: true, status: true } },
      }
    });
    return this.serializeProjectTimesheet(row);
  }

  async submitProjectTimesheet(id: string) {
    const row = await this.prisma.projectTimesheetEntry.update({
      where: { id },
      data: { status: 'submitted' },
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, name: true } },
        fund: { select: { id: true, code: true, name: true } },
        grant: { select: { id: true, code: true, name: true } },
        syncedRun: { select: { id: true, name: true, year: true, month: true, status: true } },
      }
    });
    return this.serializeProjectTimesheet(row);
  }

  async approveProjectTimesheet(id: string, actorId?: string) {
    const row = await this.prisma.projectTimesheetEntry.update({
      where: { id },
      data: { status: 'approved', approvedBy: actorId ? toBigInt(actorId) : null, approvedAt: new Date() },
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, name: true } },
        fund: { select: { id: true, code: true, name: true } },
        grant: { select: { id: true, code: true, name: true } },
        syncedRun: { select: { id: true, name: true, year: true, month: true, status: true } },
      }
    });
    await this.syncApprovedTimesheetsToPayrollRun(row.workerId, row.workDate);
    const refreshed = await this.prisma.projectTimesheetEntry.findUnique({
      where: { id },
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, name: true } },
        fund: { select: { id: true, code: true, name: true } },
        grant: { select: { id: true, code: true, name: true } },
        syncedRun: { select: { id: true, name: true, year: true, month: true, status: true } },
      }
    });
    return this.serializeProjectTimesheet(refreshed!);
  }

  async rejectProjectTimesheet(id: string) {
    const existing = await this.prisma.projectTimesheetEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Project timesheet entry not found');
    const row = await this.prisma.projectTimesheetEntry.update({
      where: { id },
      data: { status: 'rejected' },
      include: {
        worker: { select: { id: true, fullName: true, workerType: true, email: true } },
        component: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, name: true } },
        fund: { select: { id: true, code: true, name: true } },
        grant: { select: { id: true, code: true, name: true } },
        syncedRun: { select: { id: true, name: true, year: true, month: true, status: true } },
      }
    });
    await this.syncApprovedTimesheetsToPayrollRun(existing.workerId, existing.workDate);
    return this.serializeProjectTimesheet(row);
  }

  async listComponents(query: Record<string, any>) {
    const where: Prisma.PayrollComponentWhereInput = {};
    if (query.component_type) where.componentType = String(query.component_type);
    if (query.is_active === 'true' || query.is_active === 'false') where.isActive = query.is_active === 'true';
    const rows = await this.prisma.payrollComponent.findMany({
      where,
      include: { chartAccount: { select: { id: true, code: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });
    const items = rows.map((row) => this.serializeComponent(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createComponent(dto: UpsertPayrollComponentDto) {
    const row = await this.prisma.payrollComponent.create({
      data: this.mapComponentDto(dto),
      include: { chartAccount: { select: { id: true, code: true, name: true } } }
    });
    return this.serializeComponent(row);
  }

  async updateComponent(id: string, dto: UpsertPayrollComponentDto) {
    const existing = await this.prisma.payrollComponent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payroll component not found');
    const row = await this.prisma.payrollComponent.update({
      where: { id },
      data: this.mapComponentDto(dto),
      include: { chartAccount: { select: { id: true, code: true, name: true } } }
    });
    return this.serializeComponent(row);
  }

  async deleteComponent(id: string) {
    const existing = await this.prisma.payrollComponent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payroll component not found');

    const usage = await this.prisma.$transaction([
      this.prisma.payrollWorkerProfileComponent.count({ where: { componentId: id } }),
      this.prisma.payrollRunItemLine.count({ where: { componentId: id } }),
      this.prisma.payrollLoan.count({ where: { componentId: id } }),
      this.prisma.projectTimesheetEntry.count({ where: { componentId: id } }),
    ]);

    const totalUsage = usage.reduce((sum, count) => sum + count, 0);
    if (totalUsage > 0) {
      const row = await this.prisma.payrollComponent.update({
        where: { id },
        data: { isActive: false },
        include: { chartAccount: { select: { id: true, code: true, name: true } } }
      });
      return { action: 'deactivated', component: this.serializeComponent(row), reason: 'component has payroll history and was deactivated instead of deleted' };
    }

    await this.prisma.payrollComponent.delete({ where: { id } });
    return { action: 'deleted' };
  }

  async listRuns(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));
    const where: Prisma.PayrollRunWhereInput = {};
    if (query.status_in) {
      where.status = { in: String(query.status_in).split(',') };
    } else if (query.status) {
      where.status = String(query.status);
    }
    if (query.year) where.year = Number(query.year);
    if (query.month) where.month = Number(query.month);
    if (query.organization_id) where.organizationId = toBigInt(String(query.organization_id));
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payrollRun.findMany({
        where,
        include: {
          preparedBy: { select: { id: true, firstName: true, lastName: true, email: true, username: true } },
          paidFromAccount: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true } },
          items: { select: { grossPay: true, totalDeductions: true, employerCostTotal: true, netPay: true } }
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.prisma.payrollRun.count({ where })
    ]);
    return paginatedResponse(rows.map((row) => this.serializeRunSummary(row)), { page, per_page: perPage, total });
  }

  async getRun(id: string) {
    const row = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: this.runInclude()
    });
    if (!row) throw new NotFoundException('Payroll run not found');
    return this.serializeRun(row);
  }

  async deleteRun(id: string) {
    const existing = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            postings: true,
            payslipDistributions: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Payroll run not found');
    if (!['draft', 'prepared'].includes(existing.status)) {
      throw new BadRequestException('Only draft or prepared payroll runs can be deleted');
    }
    if ((existing as any)._count?.postings || (existing as any)._count?.payslipDistributions) {
      throw new BadRequestException('Cannot delete payroll run with payroll history or postings');
    }

    await this.prisma.$transaction(async (tx) => {
      const repayments = await tx.payrollLoanRepayment.findMany({
        where: { runId: id },
      });
      for (const repayment of repayments) {
        await tx.payrollLoan.update({
          where: { id: repayment.loanId },
          data: {
            outstandingAmount: { increment: repayment.amount },
            status: 'active',
          },
        });
      }
      await tx.payrollLoanRepayment.deleteMany({
        where: { runId: id },
      });

      await tx.payrollRun.delete({ where: { id } });
    });

    return { action: 'deleted' };
  }

  async createRun(dto: CreatePayrollRunDto, actorId?: string) {
    let row: any;
    try {
      row = await this.prisma.payrollRun.create({
        data: {
          name: dto.name,
          year: dto.year,
          month: dto.month,
          periodStart: new Date(dto.period_start),
          periodEnd: new Date(dto.period_end),
          currency: dto.currency || 'NGN',
          notes: dto.notes || null,
          organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
          paidFromAccountId: dto.paid_from_account_id || null,
          preparedById: actorId ? toBigInt(actorId) : null,
        }
      });
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException('A payroll run already exists for this organization and period');
        }
        if (err.code === 'P2003') {
          throw new BadRequestException('Referenced account or organization not found');
        }
      }
      throw err;
    }
    await this.recordRunEvent(row.id, 'created', actorId, `Created payroll run ${dto.name}`);
    return this.getRun(row.id);
  }

  async updateRun(id: string, dto: CreatePayrollRunDto, actorId?: string) {
    const existing = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Payroll run not found');
    if (!['draft', 'prepared'].includes(existing.status)) {
      throw new BadRequestException('Only draft or prepared runs can be edited');
    }
    await this.prisma.payrollRun.update({
      where: { id },
      data: {
        name: dto.name,
        year: dto.year,
        month: dto.month,
        periodStart: new Date(dto.period_start),
        periodEnd: new Date(dto.period_end),
        currency: dto.currency || existing.currency,
        notes: dto.notes || null,
        organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
        paidFromAccountId: dto.paid_from_account_id || null,
        preparedById: actorId ? toBigInt(actorId) : existing.preparedById,
      }
    });
    await this.recordRunEvent(id, 'updated', actorId, `Updated payroll run ${dto.name}`);
    return this.getRun(id);
  }

  async generateRun(id: string, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (!['draft', 'prepared'].includes(run.status)) throw new BadRequestException('Run cannot be regenerated in its current status');

    const workers = await this.prisma.payrollWorker.findMany({
      where: {
        status: 'active',
        OR: [{ startDate: null }, { startDate: { lte: run.periodEnd } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: run.periodStart } }] }],
        ...(run.organizationId ? { organizationId: run.organizationId } : {}),
      },
      include: this.workerInclude()
    });

    return this.prisma.$transaction(async (tx) => {
      const oldRepayments = await tx.payrollLoanRepayment.findMany({
        where: { runId: id },
      });
      for (const repayment of oldRepayments) {
        await tx.payrollLoan.update({
          where: { id: repayment.loanId },
          data: {
            outstandingAmount: { increment: repayment.amount },
            status: 'active',
          },
        });
      }
      await tx.payrollLoanRepayment.deleteMany({
        where: { runId: id },
      });

      await tx.payrollRunItem.deleteMany({ where: { runId: id } });
      const timesheetAllocations = await tx.payrollRunTimesheetAllocation.findMany({
        where: { runId: id },
        orderBy: [{ workerId: 'asc' }, { sortOrder: 'asc' }]
      });
      const timesheetByWorker = new Map<string, any[]>();
      for (const row of timesheetAllocations) {
        const list = timesheetByWorker.get(row.workerId) || [];
        list.push(row);
        timesheetByWorker.set(row.workerId, list);
      }
      const componentCodes = ['basic_salary', 'paye_tax', 'pension_employee', 'pension_employer', 'withholding_tax', 'employer_paye_cover', 'salary_advance_recovery', 'loan_repayment'];
      const payrollComponents = await this.ensureSystemPayrollComponentsTx(tx, componentCodes);
      const componentMap = new Map(payrollComponents.map((component) => [component.code, component]));
      const componentById = new Map(payrollComponents.map((component) => [component.id, component]));
      const taxTableCache = new Map<string, any | null>();

      for (const worker of workers) {
        const profile = this.pickActiveProfile(worker.profiles, run.periodStart, run.periodEnd);
        const lines: Array<{ componentId: string; lineType: string; amount: Prisma.Decimal; quantity?: Prisma.Decimal | null; rate?: Prisma.Decimal | null; notes?: string | null; affectsNetPay?: boolean }> = [];
        const setting = await this.resolvePayrollSettingTx(tx, worker.organizationId ?? null);
        const config = (setting.config || {}) as Record<string, any>;
        const workerMeta = (worker.metadata || {}) as Record<string, any>;
        const workerTimesheetAllocations = timesheetByWorker.get(worker.id) || [];
        const workerLoans = await tx.payrollLoan.findMany({
          where: {
            workerId: worker.id,
            status: 'active',
            startRecoveryDate: { lte: run.periodEnd },
            outstandingAmount: { gt: 0 },
          },
          orderBy: { issuedDate: 'asc' }
        });
        const payBasis = worker.payBasis || 'monthly_fixed';
        const allocationMode = worker.allocationMode || 'fixed';
        const standardHoursPerDay = Number(worker.standardHoursPerDay || 8) || 8;
        const hybridFixedPercent = Math.max(0, Math.min(100, Number(worker.hybridFixedPercent || 0)));
        const basicSalaryComponent = componentMap.get('basic_salary');
        const totalTimesheetHours = workerTimesheetAllocations.reduce((sum, row) => sum + Number(row.hours || 0), 0);
        let baseEarningsAmount = 0;

        if (profile?.baseAmount && Number(profile.baseAmount) > 0 && basicSalaryComponent && ['monthly_fixed', 'retainer', 'manual'].includes(payBasis)) {
          baseEarningsAmount = Number(profile.baseAmount);
          lines.push({
            componentId: basicSalaryComponent.id,
            lineType: 'earning',
            amount: profile.baseAmount,
            notes: 'Base amount',
            affectsNetPay: true,
          });
        }

        if (profile?.baseAmount && Number(profile.baseAmount) > 0 && basicSalaryComponent && payBasis === 'hourly_timesheet') {
          baseEarningsAmount = Number(profile.baseAmount) * totalTimesheetHours;
          lines.push({
            componentId: basicSalaryComponent.id,
            lineType: 'earning',
            amount: new Prisma.Decimal(baseEarningsAmount),
            quantity: new Prisma.Decimal(totalTimesheetHours),
            rate: new Prisma.Decimal(Number(profile.baseAmount)),
            notes: 'Approved timesheet hours',
            affectsNetPay: true,
          });
        }

        if (profile?.baseAmount && Number(profile.baseAmount) > 0 && basicSalaryComponent && payBasis === 'daily_rate') {
          const workDays = totalTimesheetHours > 0 ? totalTimesheetHours / standardHoursPerDay : 0;
          baseEarningsAmount = Number(profile.baseAmount) * workDays;
          lines.push({
            componentId: basicSalaryComponent.id,
            lineType: 'earning',
            amount: new Prisma.Decimal(baseEarningsAmount),
            quantity: new Prisma.Decimal(workDays),
            rate: new Prisma.Decimal(Number(profile.baseAmount)),
            notes: `Approved workdays at ${standardHoursPerDay}h/day`,
            affectsNetPay: true,
          });
        }

        const componentBaseAmount = baseEarningsAmount || Number(profile?.baseAmount || 0);
        for (const row of profile?.components || []) {
          if (!row.isEnabled) continue;
          const component = row.component;
          const amount = row.amount
            ? Number(row.amount)
            : row.rate && componentBaseAmount
              ? componentBaseAmount * Number(row.rate)
              : 0;
          if (!amount) continue;
          lines.push(...this.expandProfileComponentLines(component, amount, row.rate == null ? null : Number(row.rate), row.formula || null));
        }

        const grossPay = lines.filter((line) => line.lineType === 'earning').reduce((sum, line) => sum + Number(line.amount), 0);

        const employeePensionRate = Number(workerMeta.pension_rate ?? config.employee_pension_rate ?? 0);
        const employerPensionRate = Number(config.employer_pension_rate ?? 0);
        const consultantWithholdingRate = Number(workerMeta.withholding_rate ?? config.consultant_withholding_rate ?? 0);
        const consultantPensionRate = Number(workerMeta.consultant_pension_rate ?? config.consultant_pension_rate ?? 0);
        const applyTax = workerMeta.apply_tax !== false;
        const applyPension = workerMeta.apply_pension !== false;

        if (worker.workerType === 'employee') {
          const employeePensionComponent = componentMap.get('pension_employee');
          if (employeePensionComponent && applyPension && employeePensionRate > 0 && grossPay > 0) {
            lines.push({
              componentId: employeePensionComponent.id,
              lineType: 'deduction',
              amount: new Prisma.Decimal(grossPay * employeePensionRate),
              rate: new Prisma.Decimal(employeePensionRate),
              notes: 'Auto employee pension',
              affectsNetPay: true,
            });
          }
          const taxComponent = componentMap.get('paye_tax');
          const taxTable = await this.resolveEmployeeTaxTableTx(
            tx,
            {
              workerTaxTableId: worker.taxTableId ?? null,
              settingTaxTableId: setting.employeeTaxTableId ?? null,
              organizationId: worker.organizationId ?? null,
            },
            taxTableCache
          );
          const payeResult = this.calculateEmployeePaye({
            grossPay,
            lines,
            componentsById: componentById,
            taxTable,
            fallbackRate: Number(workerMeta.tax_rate ?? config.employee_tax_rate ?? 0),
          });
          if (taxComponent && applyTax && payeResult.taxAmount > 0 && grossPay > 0) {
            if (workerMeta.employer_covers_paye) {
              const employerTaxComponent = componentMap.get('employer_paye_cover') || taxComponent;
              lines.push({
                componentId: taxComponent.id,
                lineType: 'deduction',
                amount: new Prisma.Decimal(payeResult.taxAmount),
                rate: payeResult.appliedRate == null ? null : new Prisma.Decimal(payeResult.appliedRate),
                notes: payeResult.notes || 'PAYE settled by employer',
                affectsNetPay: false,
              });
              lines.push({
                componentId: employerTaxComponent.id,
                lineType: 'employer_cost',
                amount: new Prisma.Decimal(payeResult.taxAmount),
                rate: payeResult.appliedRate == null ? null : new Prisma.Decimal(payeResult.appliedRate),
                notes: 'Employer-covered PAYE',
                affectsNetPay: false,
              });
            } else {
              lines.push({
                componentId: taxComponent.id,
                lineType: 'deduction',
                amount: new Prisma.Decimal(payeResult.taxAmount),
                rate: payeResult.appliedRate == null ? null : new Prisma.Decimal(payeResult.appliedRate),
                notes: payeResult.notes || 'Auto PAYE',
                affectsNetPay: true,
              });
            }
          }
          const employerPensionComponent = componentMap.get('pension_employer');
          if (employerPensionComponent && applyPension && employerPensionRate > 0 && grossPay > 0) {
            lines.push({
              componentId: employerPensionComponent.id,
              lineType: 'employer_cost',
              amount: new Prisma.Decimal(grossPay * employerPensionRate),
              rate: new Prisma.Decimal(employerPensionRate),
              notes: 'Auto employer pension',
              affectsNetPay: false,
            });
          }
        } else if (worker.workerType === 'consultant') {
          const withholdingComponent = componentMap.get('withholding_tax');
          if (withholdingComponent && applyTax && consultantWithholdingRate > 0 && grossPay > 0) {
            lines.push({
              componentId: withholdingComponent.id,
              lineType: 'deduction',
              amount: new Prisma.Decimal(grossPay * consultantWithholdingRate),
              rate: new Prisma.Decimal(consultantWithholdingRate),
              notes: 'Auto consultant withholding tax',
              affectsNetPay: true,
            });
          }
          const consultantPensionComponent = componentMap.get('pension_employee');
          if (consultantPensionComponent && applyPension && consultantPensionRate > 0 && grossPay > 0) {
            lines.push({
              componentId: consultantPensionComponent.id,
              lineType: 'deduction',
              amount: new Prisma.Decimal(grossPay * consultantPensionRate),
              rate: new Prisma.Decimal(consultantPensionRate),
              notes: 'Auto consultant pension',
              affectsNetPay: true,
            });
          }
        }

        for (const loan of workerLoans) {
          const monthlyAmount = loan.monthlyRecoveryAmount == null
            ? (loan.recoveryRate != null ? grossPay * Number(loan.recoveryRate) : 0)
            : Number(loan.monthlyRecoveryAmount);
          const recoveryAmount = Math.min(Number(loan.outstandingAmount || 0), Math.max(0, monthlyAmount));
          if (!recoveryAmount) continue;
          const recoveryCode = loan.loanType === 'salary_advance' ? 'salary_advance_recovery' : 'loan_repayment';
          const recoveryComponent = componentMap.get(recoveryCode);
          if (!recoveryComponent) continue;
          lines.push({
            componentId: recoveryComponent.id,
            lineType: 'deduction',
            amount: new Prisma.Decimal(recoveryAmount),
            notes: `${loan.loanType === 'salary_advance' ? 'Salary advance' : 'Loan'} recovery: ${loan.title}`,
            affectsNetPay: true,
          });
        }

        const totalDeductions = lines.filter((line) => line.lineType === 'deduction' && line.affectsNetPay !== false).reduce((sum, line) => sum + Number(line.amount), 0);
        const employerCostTotal = lines.filter((line) => line.lineType === 'employer_cost').reduce((sum, line) => sum + Number(line.amount), 0);
        const computedNetPay = grossPay - totalDeductions;
        const actualNetPay = computedNetPay;
        const netPay = actualNetPay;

        const runItem = await tx.payrollRunItem.create({
          data: {
            runId: id,
            workerId: worker.id,
            workerType: worker.workerType,
            payBasis,
            allocationSource: this.resolveAllocationSource(allocationMode, workerTimesheetAllocations.length),
            organizationId: worker.organizationId,
            teamId: worker.teamId,
            projectId: worker.projectId,
            fundId: worker.defaultFundId,
            grantId: worker.defaultGrantId,
            grossPay,
            totalDeductions,
            employerCostTotal,
            computedNetPay,
            actualNetPay,
            netAdjustmentAmount: 0,
            netPay,
          }
        });

        if (lines.length) {
          await tx.payrollRunItemLine.createMany({
            data: lines.map((line) => ({
              runItemId: runItem.id,
              componentId: line.componentId,
              lineType: line.lineType,
              amount: line.amount,
              quantity: line.quantity ?? null,
              rate: line.rate ?? null,
              notes: line.notes ?? null,
              metadata: line.affectsNetPay === false ? { affects_net_pay: false } : undefined,
            }))
          });
        }

        for (const loan of workerLoans) {
          const repaymentCode = loan.loanType === 'salary_advance' ? 'salary_advance_recovery' : 'loan_repayment';
          const repaymentLine = lines.find((line) => line.componentId === componentMap.get(repaymentCode)?.id && String(line.notes || '').includes(loan.title));
          if (!repaymentLine) continue;
          await tx.payrollLoanRepayment.create({
            data: {
              loanId: loan.id,
              runId: id,
              runItemId: runItem.id,
              amount: repaymentLine.amount,
              status: 'posted',
              notes: repaymentLine.notes || null,
            }
          });
          await tx.payrollLoan.update({
            where: { id: loan.id },
            data: {
              outstandingAmount: { decrement: repaymentLine.amount },
              status: Number(loan.outstandingAmount || 0) - Number(repaymentLine.amount || 0) <= 0.01 ? 'closed' : loan.status,
            }
          });
        }

        const fixedAllocations = worker.allocations.length
          ? worker.allocations.map((allocation) => ({
              organizationId: allocation.organizationId,
              teamId: allocation.teamId,
              projectId: allocation.projectId,
              fundId: allocation.fundId,
              grantId: allocation.grantId,
              allocationPercent: Number(allocation.allocationPercent || 0),
              allocationAmount: allocation.allocationAmount,
              sortOrder: allocation.sortOrder,
            }))
          : [{
              organizationId: worker.organizationId,
              teamId: worker.teamId,
              projectId: worker.projectId,
              fundId: worker.defaultFundId,
              grantId: worker.defaultGrantId,
              allocationPercent: 100,
              allocationAmount: null,
              sortOrder: 0,
            }];

        const timesheetDerivedAllocations = this.normalizeTimesheetAllocations(workerTimesheetAllocations);
        const allocations = this.resolveAllocations({
          allocationMode,
          hybridFixedPercent,
          fixedAllocations,
          timesheetAllocations: timesheetDerivedAllocations,
        });

        await tx.payrollRunItemAllocation.createMany({
          data: allocations.map((allocation) => ({
            runItemId: runItem.id,
            organizationId: allocation.organizationId ?? null,
            teamId: allocation.teamId ?? null,
            projectId: allocation.projectId ?? null,
            fundId: allocation.fundId ?? null,
            grantId: allocation.grantId ?? null,
            allocationPercent: allocation.allocationPercent,
            allocationAmount: allocation.allocationAmount ?? null,
            sortOrder: allocation.sortOrder,
          }))
        });
      }

      await tx.payrollRun.update({
        where: { id },
        data: { status: 'prepared', preparedById: actorId ? toBigInt(actorId) : run.preparedById }
      });
      await this.recordRunEventTx(tx, id, 'generated', actorId, 'Generated payroll run items', {
        worker_count: workers.length,
      });
    });

    return this.getRun(id);
  }

  async submitRun(id: string, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id }, include: { items: true } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.items.length === 0) {
      throw new BadRequestException(
        'This payroll run has no payroll items to submit. Add eligible payroll workers or pay profiles for this organization and period, then click Generate Items again.'
      );
    }
    if (!['prepared', 'draft'].includes(run.status)) throw new BadRequestException('Run cannot be submitted in its current status');
    await this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'under_review' }
    });
    await this.recordRunEvent(id, 'submitted', actorId, 'Submitted payroll run for review');
    await this.notifyRunStakeholders(id, {
      actorId,
      category: 'approvals',
      type: 'payroll.run.submitted',
      title: `Payroll run submitted`,
      message: `${run.name} is ready for review.`,
      onlyPreparedBy: false,
      link: `/finance/payroll/runs/${id}`,
      includePermissionRecipients: ['payroll.approve'],
      includeRoleRecipients: ['finance_manager', 'accountant'],
    });
    return this.getRun(id);
  }

  async reviewRun(id: string, dto: { note?: string }, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (!['prepared', 'draft', 'rejected'].includes(run.status)) throw new BadRequestException('Run cannot be moved to review in its current status');
    await this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'under_review',
        reviewedById: actorId ? toBigInt(actorId) : null,
        notes: this.appendRunNote(run.notes, 'Review', dto.note, actorId),
      }
    });
    await this.recordRunEvent(id, 'reviewed', actorId, dto.note || 'Moved payroll run to review');
    await this.notifyRunStakeholders(id, {
      actorId,
      category: 'run_updates',
      type: 'payroll.run.reviewed',
      title: `Payroll run in review`,
      message: `${run.name} is now under review.`,
      onlyPreparedBy: true,
    });
    return this.getRun(id);
  }

  async approveRun(id: string, dto: { note?: string }, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (!['under_review', 'prepared'].includes(run.status)) throw new BadRequestException('Run cannot be approved in its current status');
    await this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'approved',
        approvedById: actorId ? toBigInt(actorId) : null,
        notes: this.appendRunNote(run.notes, 'Approved', dto.note, actorId),
      }
    });
    await this.recordRunEvent(id, 'approved', actorId, dto.note || 'Approved payroll run');
    await this.notifyRunStakeholders(id, {
      actorId,
      category: 'approvals',
      type: 'payroll.run.approved',
      title: `Payroll run approved`,
      message: `${run.name} has been approved and is ready for payment.`,
      onlyPreparedBy: true,
      link: `/admin/payroll/authorize/${id}`,
      includePermissionRecipients: ['payroll.authorize'],
      includeRoleRecipients: ['executive_director', 'coo'],
    });
    return this.getRun(id);
  }

  async authorizeRun(id: string, dto: { notes?: string }, userId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'approved') {
      throw new BadRequestException(`Cannot authorize a run with status "${run.status}". Run must be approved first.`);
    }
    await this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'authorized',
        // @ts-ignore prisma client types pending full migration
        authorizedAt: new Date(),
        // @ts-ignore
        authorizedById: userId ? toBigInt(userId) : null,
        notes: this.appendRunNote(run.notes, 'Authorized', dto.notes, userId),
      }
    });
    await this.recordRunEvent(id, 'authorized', userId, dto.notes || 'Authorized payroll run');
    await this.notifyRunStakeholders(id, {
      actorId: userId,
      category: 'approvals',
      type: 'payroll.run.authorized',
      title: `Payroll run authorized`,
      message: `${run.name} has been authorized for payment.`,
      onlyPreparedBy: true,
    });
    return this.getRun(id);
  }

  async rejectRun(id: string, dto: { note?: string }, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (!['under_review', 'approved'].includes(run.status)) throw new BadRequestException('Run cannot be rejected in its current status');
    await this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'rejected',
        notes: this.appendRunNote(run.notes, 'Rejected', dto.note || 'Rejected for correction', actorId),
      }
    });
    await this.recordRunEvent(id, 'rejected', actorId, dto.note || 'Rejected payroll run');
    await this.notifyRunStakeholders(id, {
      actorId,
      category: 'run_updates',
      type: 'payroll.run.rejected',
      title: `Payroll run rejected`,
      message: `${run.name} was rejected and needs correction.`,
      onlyPreparedBy: true,
    });
    return this.getRun(id);
  }

  async reopenRun(id: string, dto: { note?: string }, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id }, include: { postings: true } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (!['rejected', 'approved', 'prepared'].includes(run.status)) throw new BadRequestException('Run cannot be reopened in its current status');
    if (run.postings.length > 0 || run.status === 'paid' || run.status === 'closed') {
      throw new BadRequestException('Posted, paid, or closed payroll runs cannot be reopened');
    }
    await this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'draft',
        notes: this.appendRunNote(run.notes, 'Reopened', dto.note, actorId),
      }
    });
    await this.recordRunEvent(id, 'reopened', actorId, dto.note || 'Reopened payroll run');
    return this.getRun(id);
  }

  async closeRun(id: string, dto: { note?: string }, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'paid') throw new BadRequestException('Only paid payroll runs can be closed');
    await this.prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'closed',
        notes: this.appendRunNote(run.notes, 'Closed', dto.note, actorId),
      }
    });
    await this.recordRunEvent(id, 'closed', actorId, dto.note || 'Closed payroll run');
    await this.notifyRunStakeholders(id, {
      actorId,
      category: 'run_updates',
      type: 'payroll.run.closed',
      title: `Payroll run closed`,
      message: `${run.name} has been closed.`,
      onlyPreparedBy: true,
    });
    return this.getRun(id);
  }

  async payRun(id: string, dto: PayPayrollRunDto, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id }, include: this.runInclude() });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.status !== 'authorized') {
      throw new BadRequestException(`Cannot pay a run with status "${run.status}". Run must be authorized by ED/COO first.`);
    }

    const paidFromAccountId = dto.paid_from_account_id || run.paidFromAccountId;
    if (!paidFromAccountId) throw new BadRequestException('Select the account to pay payroll from');

    await this.prisma.$transaction(async (tx) => {
      await tx.payrollRun.update({
        where: { id },
        data: { status: 'payment_processing', paidFromAccountId }
      });

      const period = await this.ensureReportingPeriodTx(tx, run.periodEnd, actorId);
      const cashChartAccount = await this.resolveCashChartAccountTx(tx, paidFromAccountId, run.items[0]?.organizationId ?? null);
      const setting = await this.resolvePayrollSettingTx(tx, run.items[0]?.organizationId ?? null);
      const lines = this.buildPayrollJournalLines(run, setting.defaultExpenseAccountId, cashChartAccount);
      if (lines.length) {
        const journal = await this.createJournalEntryTx(tx, {
          entryDate: run.periodEnd,
          periodId: period.id,
          sourceType: 'payroll_run',
          sourceId: run.id,
          memo: dto.note || `Payroll ${run.name}`,
          currency: run.currency,
          postedBy: actorId,
          lines,
        });
        await tx.payrollAccountingPosting.create({
          data: {
            runId: run.id,
            journalEntryId: journal.id,
            postedBy: actorId ? toBigInt(actorId) : null,
          }
        });
      }

      await tx.payrollRunItem.updateMany({
        where: { runId: run.id },
        data: { paymentStatus: 'paid' }
      });

      await tx.payrollRun.update({
        where: { id: run.id },
        data: { status: 'paid', paidAt: new Date(), paidFromAccountId }
      });
      await this.recordRunEventTx(tx, run.id, 'paid', actorId, dto.note || 'Marked payroll run as paid', {
        paid_from_account_id: paidFromAccountId,
      });
    });
    await this.notifyRunStakeholders(id, {
      actorId,
      category: 'payments',
      type: 'payroll.run.paid',
      title: `Payroll run paid`,
      message: `${run.name} has been posted as paid.`,
      onlyPreparedBy: true,
    });

    return this.getRun(id);
  }

  async generateRunItemPayslip(runId: string, itemId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        items: {
          where: { id: itemId },
          include: {
            worker: true,
            organization: { select: { id: true, name: true } },
            lines: { include: { component: true }, orderBy: { createdAt: 'asc' } },
          }
        }
      }
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    const item = run.items[0];
    if (!item) throw new NotFoundException('Payroll run item not found');

    const earnings = item.lines.filter((line) => line.lineType === 'earning').map((line) => ({
      label: line.component.name,
      amount: Number(line.amount || 0),
    }));
    const deductions = item.lines.filter((line) => line.lineType === 'deduction').map((line) => ({
      label: line.component.name,
      amount: Number(line.amount || 0),
    }));
    const employerCosts = item.lines.filter((line) => line.lineType === 'employer_cost').map((line) => ({
      label: line.component.name,
      amount: Number(line.amount || 0),
    }));

    return this.generatePayslipTemplate({
      worker_name: item.worker.fullName,
      worker_type: item.workerType,
      organization_name: item.organization?.name || undefined,
      period_label: `${run.name} (${run.month}/${run.year})`,
      currency: run.currency,
      earnings,
      deductions,
      employer_costs: employerCosts,
      note: item.paymentReference ? `Payment reference: ${item.paymentReference}` : undefined,
    });
  }

  async generateBankSchedule(runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        items: {
          include: {
            worker: true,
            organization: { select: { id: true, name: true } },
          },
          orderBy: { worker: { fullName: 'asc' } }
        }
      }
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    const rows = [
      ['Worker Name', 'Worker Type', 'Organization', 'Bank Name', 'Account Name', 'Account Number', 'Net Pay', 'Currency', 'Payment Status', 'Payment Reference'],
      ...run.items.map((item) => [
        item.worker.fullName,
        item.workerType,
        item.organization?.name || '',
        item.worker.bankName || '',
        item.worker.bankAccountName || '',
        item.worker.bankAccountNumber || '',
        Number(item.netPay || 0).toFixed(2),
        run.currency,
        item.paymentStatus,
        item.paymentReference || '',
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    return {
      file_name: `${this.safeFileName(run.name)}-bank-schedule.csv`,
      mime_type: 'text/csv',
      content_base64: Buffer.from(csv, 'utf8').toString('base64'),
    };
  }

  async monthlyBreakdown(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            lines: {
              include: { component: true }
            },
            worker: true
          }
        }
      }
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    const rows = (run.items ?? []).map((item) => {
      const earnings: any[] = [];
      const deductions: any[] = [];
      const employerCosts: any[] = [];
      for (const line of item.lines ?? []) {
        const comp = line.component;
        if (!comp) continue;
        const entry = { label: comp.name, amount: Number(line.amount || 0) };
        if (comp.componentType === 'earning') earnings.push(entry);
        else if (comp.componentType === 'deduction') deductions.push(entry);
        else if (comp.componentType === 'employer_cost') employerCosts.push(entry);
      }
      return {
        worker_name: item.worker?.fullName ?? (item as any).workerName ?? '',
        worker_type: item.workerType ?? '',
        staff_code: item.worker?.staffCode ?? '',
        gross_pay: Number(item.grossPay || 0),
        total_deductions: Number(item.totalDeductions || 0),
        net_pay: Number(item.netPay || 0),
        earnings,
        deductions,
        employer_costs: employerCosts,
      };
    });

    const earningLabels = [...new Set(rows.flatMap(r => r.earnings.map(e => e.label)))];
    const deductionLabels = [...new Set(rows.flatMap(r => r.deductions.map(d => d.label)))];
    const employerCostLabels = [...new Set(rows.flatMap(r => r.employer_costs.map(c => c.label)))];

    const breakdown = rows.map(r => {
      const row: Record<string, any> = {
        name: r.worker_name,
        type: r.worker_type,
        staff_code: r.staff_code,
        gross_pay: r.gross_pay,
        total_deductions: r.total_deductions,
        net_pay: r.net_pay,
      };
      for (const label of earningLabels) row[`earning_${label}`] = r.earnings.find(e => e.label === label)?.amount ?? 0;
      for (const label of deductionLabels) row[`deduction_${label}`] = r.deductions.find(d => d.label === label)?.amount ?? 0;
      for (const label of employerCostLabels) row[`employer_${label}`] = r.employer_costs.find(c => c.label === label)?.amount ?? 0;
      return row;
    });

    const headers = Object.keys(breakdown[0] ?? {});
    const csv = [
      headers.join(','),
      ...breakdown.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');

    const fileName = `payroll-breakdown-${run.year ?? ''}-${String(run.month ?? '').padStart(2, '0')}.csv`;
    return { file_name: fileName, mime_type: 'text/csv', content_base64: Buffer.from(csv).toString('base64') };
  }

  async generateRunPayslipsPackage(runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: this.runInclude()
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    const zip = new JSZip();
    const folder = zip.folder(this.safeFileName(run.name));
    if (!folder) throw new BadRequestException('Unable to initialize payslip package');

    for (const item of run.items || []) {
      const payslip = await this.generateRunItemPayslip(runId, item.id);
      folder.file(payslip.file_name, Buffer.from(payslip.content_base64, 'base64'));
    }

    const bankSchedule = await this.generateBankSchedule(runId);
    folder.file(bankSchedule.file_name, Buffer.from(bankSchedule.content_base64, 'base64'));

    const manifest = [
      `Payroll Run: ${run.name}`,
      `Period: ${run.month}/${run.year}`,
      `Status: ${run.status}`,
      `Workers: ${run.items?.length || 0}`,
      '',
      ...(run.items || []).map((item) => `${item.worker?.fullName || 'Worker'} - ${this.formatCurrency(Number(item.netPay || 0), run.currency)}`)
    ].join('\n');
    folder.file('README.txt', manifest);

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    return {
      file_name: `${this.safeFileName(run.name)}-payslips.zip`,
      mime_type: 'application/zip',
      content_base64: content.toString('base64'),
    };
  }

  async distributeRunPayslips(runId: string, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: this.runInclude()
    });
    if (!run) throw new NotFoundException('Payroll run not found');

    const eligibleStatuses = ['approved', 'paid', 'closed'];
    if (!eligibleStatuses.includes(run.status)) {
      throw new BadRequestException('Only approved, paid, or closed payroll runs can be distributed');
    }
    if (!this.mailService.canSend()) {
      throw new BadRequestException('Email delivery is not configured');
    }

    let sent = 0;
    let skipped = 0;
    const skippedWorkers: string[] = [];
    let failed = 0;
    const failedWorkers: Array<{ worker: string; error: string }> = [];

    for (const item of run.items || []) {
      const workerEmail = item.worker?.email?.trim();
      if (!workerEmail) {
        skipped += 1;
        skippedWorkers.push(item.worker?.fullName || item.id);
        await this.prisma.payrollPayslipDistribution.create({
          data: {
            runId: run.id,
            runItemId: item.id,
            workerId: item.workerId,
            recipientEmail: '',
            status: 'skipped',
            errorMessage: 'Worker has no email address',
            sentBy: actorId ? toBigInt(actorId) : null,
            metadata: { worker_name: item.worker?.fullName || null } as Prisma.InputJsonValue,
          }
        });
        continue;
      }
      try {
        const payslip = await this.generateRunItemPayslip(run.id, item.id);
        await this.mailService.send({
          to: workerEmail,
          subject: `Payslip - ${run.name}`,
          text: `Dear ${item.worker?.fullName || 'Worker'},\n\nYour payslip for ${run.name} is attached.\n\nRegards,\nStanforte Edge Payroll`,
          threadKey: `payroll-run-${run.id}`,
          userId: actorId,
          notifiableType: 'payroll_run',
          notifiableId: run.id,
          attachments: [
            {
              filename: payslip.file_name,
              content: Buffer.from(payslip.content_base64, 'base64'),
              contentType: payslip.mime_type,
            }
          ]
        });
        await this.prisma.payrollPayslipDistribution.create({
          data: {
            runId: run.id,
            runItemId: item.id,
            workerId: item.workerId,
            recipientEmail: workerEmail,
            status: 'sent',
            sentBy: actorId ? toBigInt(actorId) : null,
            sentAt: new Date(),
            metadata: { file_name: payslip.file_name } as Prisma.InputJsonValue,
          }
        });
        if (item.worker?.profileId) {
          await this.createPayrollNotification(item.worker.profileId.toString(), 'payslips', {
            type: 'payroll.payslip.sent',
            title: 'Payslip available',
            message: `Your payslip for ${run.name} is available.`,
            link: `/app/profile/payslips?run_id=${run.id}&item_id=${item.id}`,
            notifiableType: 'payroll_run',
            data: {
              run_id: run.id,
              run_name: run.name,
              item_id: item.id,
            } as Prisma.InputJsonValue,
          });
        }
        sent += 1;
      } catch (error: any) {
        const message = error?.message || 'Unable to send payslip';
        failed += 1;
        failedWorkers.push({ worker: item.worker?.fullName || workerEmail, error: message });
        await this.prisma.payrollPayslipDistribution.create({
          data: {
            runId: run.id,
            runItemId: item.id,
            workerId: item.workerId,
            recipientEmail: workerEmail,
            status: 'failed',
            errorMessage: message,
            sentBy: actorId ? toBigInt(actorId) : null,
            metadata: { worker_name: item.worker?.fullName || null } as Prisma.InputJsonValue,
          }
        });
      }
    }

    const summaryText = `sent=${sent}, skipped=${skipped}, failed=${failed}${skippedWorkers.length ? ` [skipped: ${skippedWorkers.join(', ')}]` : ''}${failedWorkers.length ? ` [failed: ${failedWorkers.map((row) => row.worker).join(', ')}]` : ''}`;
    const note = this.appendRunNote(run.notes, 'Payslips Distributed', summaryText, actorId);
    await this.prisma.payrollRun.update({
      where: { id: run.id },
      data: { notes: note }
    });
    await this.recordRunEvent(run.id, 'payslips_distributed', actorId, summaryText, {
      sent,
      skipped,
      failed,
      skipped_workers: skippedWorkers,
      failed_workers: failedWorkers,
    });
    if (skipped > 0 || failed > 0) {
      await this.notifyRunStakeholders(run.id, {
        actorId,
        category: 'delivery_issues',
        type: 'payroll.payslips.delivery_issue',
        title: `Payslip delivery issues`,
        message: `${run.name} distribution completed with ${failed} failed and ${skipped} skipped.`,
        onlyPreparedBy: true,
        data: {
          sent,
          skipped,
          failed,
          skipped_workers: skippedWorkers,
          failed_workers: failedWorkers,
        },
      });
    }

    return {
      success: true,
      sent,
      skipped,
      failed,
      skipped_workers: skippedWorkers,
      failed_workers: failedWorkers,
    };
  }

  async reportsOverview(query: Record<string, any>) {
    const year = Number(query.year || new Date().getFullYear());
    const orgFilter = query.organization_id ? { organizationId: toBigInt(String(query.organization_id)) } : {};
    const [runs, workers] = await this.prisma.$transaction([
      this.prisma.payrollRun.findMany({
        where: { year, ...orgFilter },
        include: {
          items: {
            include: {
              worker: { select: { workerType: true } },
              organization: { select: { id: true, name: true } },
              fund: { select: { id: true, code: true, name: true } },
              grant: { select: { id: true, code: true, name: true } },
            }
          }
        },
        orderBy: [{ year: 'asc' }, { month: 'asc' }]
      }),
      this.prisma.payrollWorker.findMany({
        where: { status: 'active', ...orgFilter },
        select: { workerType: true, organizationId: true }
      })
    ]);

    const monthly = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      gross: 0,
      deductions: 0,
      net: 0,
      employer_cost: 0,
      worker_count: 0,
    }));
    const workerTypeTotals = new Map<string, { gross: number; net: number; count: number }>();
    const organizationTotals = new Map<string, { label: string; gross: number; net: number }>();
    const fundTotals = new Map<string, { label: string; gross: number; net: number }>();
    const grantTotals = new Map<string, { label: string; gross: number; net: number }>();
    const paymentStatusCounts = new Map<string, number>();

    for (const run of runs) {
      const bucket = monthly[run.month - 1];
      for (const item of run.items || []) {
        const gross = Number(item.grossPay || 0);
        const deductions = Number(item.totalDeductions || 0);
        const net = Number(item.netPay || 0);
        const employerCost = Number(item.employerCostTotal || 0);
        bucket.gross += gross;
        bucket.deductions += deductions;
        bucket.net += net;
        bucket.employer_cost += employerCost;
        bucket.worker_count += 1;

        const workerType = item.worker?.workerType || 'unknown';
        const typeEntry = workerTypeTotals.get(workerType) || { gross: 0, net: 0, count: 0 };
        typeEntry.gross += gross;
        typeEntry.net += net;
        typeEntry.count += 1;
        workerTypeTotals.set(workerType, typeEntry);

        const orgKey = item.organizationId?.toString() || 'unassigned';
        const orgEntry = organizationTotals.get(orgKey) || { label: item.organization?.name || 'Unassigned', gross: 0, net: 0 };
        orgEntry.gross += gross;
        orgEntry.net += net;
        organizationTotals.set(orgKey, orgEntry);

        const fundKey = item.fundId || 'unassigned';
        const fundEntry = fundTotals.get(fundKey) || { label: item.fund?.name || item.fund?.code || 'Unassigned', gross: 0, net: 0 };
        fundEntry.gross += gross;
        fundEntry.net += net;
        fundTotals.set(fundKey, fundEntry);

        const grantKey = item.grantId || 'unassigned';
        const grantEntry = grantTotals.get(grantKey) || { label: item.grant?.name || item.grant?.code || 'Unassigned', gross: 0, net: 0 };
        grantEntry.gross += gross;
        grantEntry.net += net;
        grantTotals.set(grantKey, grantEntry);

        paymentStatusCounts.set(item.paymentStatus, (paymentStatusCounts.get(item.paymentStatus) || 0) + 1);
      }
    }

    const summary = monthly.reduce((acc, row) => {
      acc.gross += row.gross;
      acc.deductions += row.deductions;
      acc.net += row.net;
      acc.employer_cost += row.employer_cost;
      acc.worker_count += row.worker_count;
      return acc;
    }, { gross: 0, deductions: 0, net: 0, employer_cost: 0, worker_count: 0 });

    return {
      summary,
      active_workers: {
        total: workers.length,
        employees: workers.filter((worker) => worker.workerType === 'employee').length,
        consultants: workers.filter((worker) => worker.workerType === 'consultant').length,
      },
      monthly,
      worker_type_totals: Array.from(workerTypeTotals.entries()).map(([worker_type, totals]) => ({ worker_type, ...totals })),
      organization_totals: Array.from(organizationTotals.values()).sort((a, b) => b.net - a.net),
      fund_totals: Array.from(fundTotals.values()).sort((a, b) => b.net - a.net),
      grant_totals: Array.from(grantTotals.values()).sort((a, b) => b.net - a.net),
      payment_status_counts: Array.from(paymentStatusCounts.entries()).map(([status, count]) => ({ status, count })),
      runs: runs.map((run) => this.serializeRunSummary(run)),
    };
  }

  async updateRunItem(runId: string, itemId: string, dto: UpdatePayrollRunItemDto, actorId?: string) {
    const item = await this.prisma.payrollRunItem.findFirst({ where: { id: itemId, runId }, include: { run: { include: { postings: true } } } });
    if (!item) throw new NotFoundException('Payroll run item not found');
    if (['paid', 'closed'].includes(item.run.status) || item.run.postings.length > 0) {
      throw new BadRequestException('Paid, closed, or posted payroll runs cannot be edited');
    }
    const computedNetPay = dto.net_pay ?? Number(item.computedNetPay || item.netPay || 0);
    const actualNetPay = dto.actual_net_pay ?? dto.net_pay ?? Number(item.actualNetPay || item.netPay || 0);
    await this.prisma.payrollRunItem.update({
      where: { id: itemId },
      data: {
        grossPay: dto.gross_pay ?? undefined,
        totalDeductions: dto.total_deductions ?? undefined,
        employerCostTotal: dto.employer_cost_total ?? undefined,
        computedNetPay,
        actualNetPay,
        netAdjustmentAmount: actualNetPay - computedNetPay,
        netAdjustmentReason: dto.net_adjustment_reason ?? undefined,
        netPay: actualNetPay,
        paymentStatus: dto.payment_status ?? undefined,
        paymentReference: dto.payment_reference ?? undefined,
      }
    });
    await this.recordRunEvent(runId, 'item_updated', actorId, `Updated payroll run item ${itemId}`, {
      item_id: itemId,
      payment_status: dto.payment_status ?? null,
      actual_net_pay: actualNetPay,
    });
    return this.getRun(runId);
  }

  async updateRunItemAllocations(runId: string, itemId: string, dto: UpdatePayrollRunAllocationsDto, actorId?: string) {
    const item = await this.prisma.payrollRunItem.findFirst({ where: { id: itemId, runId }, include: { run: { include: { postings: true } } } });
    if (!item) throw new NotFoundException('Payroll run item not found');
    if (['paid', 'closed'].includes(item.run.status) || item.run.postings.length > 0) {
      throw new BadRequestException('Paid, closed, or posted payroll runs cannot be edited');
    }
    const totalPercent = dto.allocations.reduce((sum, row) => sum + Number(row.allocation_percent || 0), 0);
    if (Math.abs(totalPercent - 100) > 0.01) throw new BadRequestException('Allocation percent must total 100');
    await this.prisma.$transaction(async (tx) => {
      await tx.payrollRunItemAllocation.deleteMany({ where: { runItemId: itemId } });
      if (dto.allocations.length) {
        await tx.payrollRunItemAllocation.createMany({
          data: dto.allocations.map((row, index) => ({
            runItemId: itemId,
            organizationId: row.organization_id ? this.parseBigInt(row.organization_id, 'organization id') : null,
            teamId: row.team_id ? this.parseBigInt(row.team_id, 'team id') : null,
            projectId: row.project_id ? this.parseBigInt(row.project_id, 'project id') : null,
            fundId: row.fund_id || null,
            grantId: row.grant_id || null,
            allocationPercent: row.allocation_percent,
            allocationAmount: row.allocation_amount ?? null,
            sortOrder: index,
          }))
        });
      }
      await tx.payrollRunItem.update({
        where: { id: itemId },
        data: { allocationSource: 'manual_override' }
      });
      await this.recordRunEventTx(tx, runId, 'allocations_updated', actorId, `Updated allocations for payroll run item ${itemId}`, {
        item_id: itemId,
        allocation_count: dto.allocations.length,
      });
    });
    return this.getRun(runId);
  }

  async updateRunWorkerTimesheetAllocations(runId: string, workerId: string, dto: UpdatePayrollRunTimesheetAllocationsDto, actorId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId }, include: { postings: true } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (['paid', 'closed'].includes(run.status) || run.postings.length > 0) {
      throw new BadRequestException('Paid, closed, or posted payroll runs cannot be edited');
    }
    const worker = await this.prisma.payrollWorker.findUnique({ where: { id: workerId } });
    if (!worker) throw new NotFoundException('Payroll worker not found');

    const normalized = this.normalizeTimesheetInputRows(dto.allocations);
    await this.prisma.$transaction(async (tx) => {
      await tx.payrollRunTimesheetAllocation.deleteMany({ where: { runId, workerId } });
      if (normalized.length) {
        await tx.payrollRunTimesheetAllocation.createMany({
          data: normalized.map((row, index) => ({
            runId,
            workerId,
            organizationId: row.organization_id ? this.parseBigInt(row.organization_id, 'organization id') : null,
            teamId: row.team_id ? this.parseBigInt(row.team_id, 'team id') : null,
            projectId: row.project_id ? this.parseBigInt(row.project_id, 'project id') : null,
            fundId: row.fund_id || null,
            grantId: row.grant_id || null,
            hours: row.hours ?? 0,
            allocationPercent: row.allocation_percent ?? 0,
            source: row.source || 'manual',
            notes: row.notes || null,
            sortOrder: index,
            approvedAt: new Date(),
          })),
        });
      }
      await this.recordRunEventTx(tx, runId, 'timesheet_allocations_updated', actorId, `Updated timesheet allocations for worker ${worker.fullName}`, {
        worker_id: workerId,
        allocation_count: normalized.length,
      });
    });

    return this.getRun(runId);
  }

  async validateImport(dto: PayrollImportDto) {
    return this.analyzeImport(dto);
  }

  async listImportJobs(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(50, Math.max(1, Number(query.per_page ?? 10)));
    const where: Prisma.PayrollImportJobWhereInput = {};
    if (query.status) where.status = String(query.status);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payrollImportJob.findMany({
        where,
        include: {
          uploadedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          retriedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          retryOfJob: { select: { id: true, fileName: true } },
          _count: { select: { rows: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.payrollImportJob.count({ where }),
    ]);

    return paginatedResponse(rows.map((row) => this.serializeImportJobSummary(row)), { page, per_page: perPage, total });
  }

  async getImportJob(id: string) {
    const job = await this.prisma.payrollImportJob.findUnique({
      where: { id },
      include: {
        uploadedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        retriedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        retryOfJob: { select: { id: true, fileName: true } },
        rows: { orderBy: [{ createdAt: 'asc' }] },
      }
    });
    if (!job) throw new NotFoundException('Payroll import job not found');
    return this.serializeImportJob(job);
  }

  async commitImport(dto: PayrollImportDto, actorId?: string) {
    const analysis = await this.analyzeImport(dto);
    if (analysis.summary.issue_count > 0) {
      throw new BadRequestException('Fix payroll import issues before committing');
    }

    return this.executeImportAnalysis(analysis, dto.update_existing === true, actorId);
  }

  async retryFailedImport(id: string, actorId?: string) {
    const sourceJob = await this.prisma.payrollImportJob.findUnique({
      where: { id },
      include: { rows: { where: { status: 'error' }, orderBy: [{ createdAt: 'asc' }] } }
    });
    if (!sourceJob) throw new NotFoundException('Payroll import job not found');
    if (!sourceJob.rows.length) {
      throw new BadRequestException('There are no failed payroll import rows to retry');
    }

    const payload: PayrollImportDto = { update_existing: true, runs: [], workers: [], lines: [], allocations: [], payments: [] };
    for (const row of sourceJob.rows) {
      const parsed = row.payload as Record<string, any>;
      if (row.sheetName === 'Runs') payload.runs?.push(parsed);
      if (row.sheetName === 'Workers') payload.workers?.push(parsed);
      if (row.sheetName === 'RunItems') {
        const lines = Array.isArray(parsed.lines) ? parsed.lines : [];
        const allocations = Array.isArray(parsed.allocations) ? parsed.allocations : [];
        payload.lines?.push(...lines);
        payload.allocations?.push(...allocations);
      }
      if (row.sheetName === 'Payments') payload.payments?.push(parsed);
    }

    const analysis = await this.analyzeImport(payload);
    if (analysis.summary.issue_count > 0) {
      throw new BadRequestException('Retry payload still has validation issues');
    }
    return this.executeImportAnalysis(analysis, true, actorId, {
      fileName: `${sourceJob.fileName.replace(/\.xlsx?$/i, '')}-retry.xlsx`,
      retryOfJobId: sourceJob.id,
      retriedBy: actorId ? toBigInt(actorId) : null,
    });
  }

  async generatePayslipTemplate(dto: GeneratePayrollPayslipTemplateDto) {
    const currency = dto.currency || 'NGN';
    const earnings = dto.earnings || [];
    const deductions = dto.deductions || [];
    const employerCosts = dto.employer_costs || [];
    const gross = earnings.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const totalDeductions = deductions.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const totalEmployerCost = employerCosts.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const net = gross - totalDeductions;
    const logoDataUri = this.getPdfLogoDataUri();

    const renderRows = (items: Array<{ label: string; amount: number }>) =>
      items
        .map(
          (line, index) =>
            `<tr><td>${index + 1}</td><td>${this.escapeHtml(line.label)}</td><td style="text-align:right;">${this.formatCurrency(line.amount, currency)}</td></tr>`
        )
        .join('');

    const earningsRows = earnings.length
      ? renderRows(earnings)
      : '<tr><td colspan="3" class="muted">No earnings recorded.</td></tr>';
    const deductionRows = deductions.length
      ? renderRows(deductions)
      : '<tr><td colspan="3" class="muted">No deductions recorded.</td></tr>';
    const employerRows = employerCosts.length
      ? renderRows(employerCosts)
      : '<tr><td colspan="3" class="muted">No employer costs recorded.</td></tr>';

    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; }
        .card { border: 1px solid #000; border-radius: 6px; margin-bottom: 14px; }
        .rowpad { padding: 12px; border-bottom: 1px solid #000; }
        .rowpad:last-child { border-bottom: 0; }
        .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-size: 24px; font-weight: 700; text-align: right; }
        .status { font-size: 12px; text-align: right; color: #334155; margin-top: 4px; }
        .two-col { display: table; width: 100%; }
        .two-col > div { display: table-cell; width: 50%; vertical-align: top; padding: 12px; }
        .two-col > div:first-child { border-right: 1px solid #000; }
        .detail-list div { margin-bottom: 5px; }
        .tbl { width: 100%; border-collapse: collapse; }
        .tbl th, .tbl td { border: 1px solid #000; padding: 7px; text-align: left; }
        .tbl th { background: #f3f4f6; }
        .muted { color: #475569; font-size: 11px; }
      </style>
      </head><body>
      <div class="card">
        <div class="rowpad">
          <div class="header-row">
            <div>${logoDataUri ? `<img src="${logoDataUri}" alt="Logo" style="height:42px;" />` : '<strong>Stanforte Edge</strong>'}</div>
            <div>
              <div class="title">Payslip</div>
              <div class="status">${this.escapeHtml(dto.period_label || 'Manual template')}</div>
            </div>
          </div>
        </div>
        <div class="two-col">
          <div>
            <h3 style="margin:0 0 8px;">Employee Details</h3>
            <div class="detail-list">
              <div><strong>Name:</strong> ${this.escapeHtml(dto.worker_name)}</div>
              <div><strong>Role:</strong> ${this.escapeHtml(dto.worker_type || 'Staff')}</div>
              <div><strong>Organization:</strong> ${this.escapeHtml(dto.organization_name || '-')}</div>
            </div>
          </div>
          <div>
            <h3 style="margin:0 0 8px;">Payroll Summary</h3>
            <div class="detail-list">
              <div><strong>Gross Pay:</strong> ${this.formatCurrency(gross, currency)}</div>
              <div><strong>Total Deductions:</strong> ${this.formatCurrency(totalDeductions, currency)}</div>
              <div><strong>Net Pay:</strong> ${this.formatCurrency(net, currency)}</div>
              ${employerCosts.length ? `<div><strong>Employer Cost:</strong> ${this.formatCurrency(totalEmployerCost, currency)}</div>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="rowpad">
          <h3 style="margin:0 0 8px;">Earnings</h3>
          <table class="tbl">
            <thead><tr><th style="width:56px;">S/N</th><th>Component</th><th style="width:160px; text-align:right;">Amount</th></tr></thead>
            <tbody>${earningsRows}</tbody>
          </table>
        </div>
        <div class="rowpad">
          <h3 style="margin:0 0 8px;">Deductions</h3>
          <table class="tbl">
            <thead><tr><th style="width:56px;">S/N</th><th>Component</th><th style="width:160px; text-align:right;">Amount</th></tr></thead>
            <tbody>${deductionRows}</tbody>
          </table>
        </div>
        <div class="rowpad">
          <h3 style="margin:0 0 8px;">Employer Costs</h3>
          <table class="tbl">
            <thead><tr><th style="width:56px;">S/N</th><th>Component</th><th style="width:160px; text-align:right;">Amount</th></tr></thead>
            <tbody>${employerRows}</tbody>
          </table>
        </div>
      </div>
      ${dto.note ? `<div class="card"><div class="rowpad"><strong>Note:</strong> ${this.escapeHtml(dto.note)}</div></div>` : ''}
      </body></html>`;

    const content = await this.pdfService.renderPdfFromHtml(html, [
      'PAYSLIP',
      `Employee: ${dto.worker_name}`,
      `Net Pay: ${this.formatCurrency(net, currency)}`,
    ]);
    return {
      file_name: `${this.safeFileName(dto.worker_name || 'manual')}-payslip-template.pdf`,
      mime_type: 'application/pdf',
      content_base64: Buffer.from(content).toString('base64'),
    };
  }

  async generateSummaryTemplate(dto: GeneratePayrollSummaryTemplateDto) {
    const currency = dto.currency || 'NGN';
    const gross = dto.workers.reduce((sum, worker) => sum + Number(worker.gross_pay || 0), 0);
    const deductions = dto.workers.reduce((sum, worker) => sum + Number(worker.total_deductions || 0), 0);
    const net = dto.workers.reduce((sum, worker) => sum + Number(worker.net_pay || 0), 0);

    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    page.drawText(dto.title || 'Payroll Summary Template', { x: 40, y, size: 20, font: fontBold });
    y -= 20;
    page.drawText(`Period: ${dto.period_label || 'Manual template'}`, { x: 40, y, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
    y -= 28;

    page.drawText('Worker', { x: 40, y, size: 10, font: fontBold });
    page.drawText('Gross', { x: 250, y, size: 10, font: fontBold });
    page.drawText('Deductions', { x: 360, y, size: 10, font: fontBold });
    page.drawText('Net', { x: 490, y, size: 10, font: fontBold });
    y -= 14;

    for (const worker of dto.workers) {
      page.drawText(worker.worker_name, { x: 40, y, size: 9, font });
      page.drawText(this.formatCurrency(worker.gross_pay, currency), { x: 250, y, size: 9, font });
      page.drawText(this.formatCurrency(worker.total_deductions, currency), { x: 360, y, size: 9, font });
      page.drawText(this.formatCurrency(worker.net_pay, currency), { x: 490, y, size: 9, font });
      y -= 14;
      if (y < 80) break;
    }

    y -= 10;
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 18;
    page.drawText(`Gross Total: ${this.formatCurrency(gross, currency)}`, { x: 40, y, size: 11, font: fontBold });
    y -= 16;
    page.drawText(`Deductions Total: ${this.formatCurrency(deductions, currency)}`, { x: 40, y, size: 11, font: fontBold });
    y -= 16;
    page.drawText(`Net Total: ${this.formatCurrency(net, currency)}`, { x: 40, y, size: 12, font: fontBold });

    if (dto.note) {
      y -= 28;
      page.drawText('Note', { x: 40, y, size: 11, font: fontBold });
      y -= 16;
      page.drawText(dto.note, { x: 40, y, size: 10, font, maxWidth: 500, lineHeight: 13 });
    }

    const content = await doc.save();
    return {
      file_name: `${this.safeFileName(dto.title || 'payroll-summary')}.pdf`,
      mime_type: 'application/pdf',
      content_base64: Buffer.from(content).toString('base64'),
    };
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getPdfLogoDataUri(): string | null {
    const explicit = process.env.PDF_LOGO_PATH;
    const candidates = [
      explicit,
      resolve(process.cwd(), 'public/branding/logo.png'),
      resolve(process.cwd(), '../PWA/public/logo/logo.png'),
      resolve(process.cwd(), 'public/logo/logo.png')
    ].filter((v): v is string => Boolean(v));

    for (const path of candidates) {
      if (!existsSync(path)) continue;
      try {
        const ext = extname(path).toLowerCase();
        const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
        const data = readFileSync(path);
        return `data:${mime};base64,${data.toString('base64')}`;
      } catch {
        continue;
      }
    }
    return null;
  }


  private async executeImportAnalysis(
    analysis: Awaited<ReturnType<PayrollService['analyzeImport']>>,
    updateExisting: boolean,
    actorId?: string,
    options?: { fileName?: string; retryOfJobId?: string; retriedBy?: bigint | null }
  ) {
    const fileName = options?.fileName || `payroll-import-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const job = await this.prisma.payrollImportJob.create({
      data: {
        fileName,
        status: 'processing',
        updateExisting,
        uploadedBy: actorId ? toBigInt(actorId) : null,
        retriedBy: options?.retriedBy ?? null,
        retryOfJobId: options?.retryOfJobId ?? null,
        summary: {
          ...analysis.summary,
          status_counts: { pending: analysis.workers.length + analysis.runs.length + analysis.lineGroups.length + analysis.payments.length }
        } as Prisma.InputJsonValue,
      }
    });

    const workerMap = new Map<string, any>();
    const runMap = new Map<string, any>();
    const itemMap = new Map<string, { itemId: string; runId: string }>();
    const rowResults: Array<{ sheetName: string; rowNumber?: number; rowKey: string; action: string; status: string; errorMessage?: string | null; payload: Prisma.InputJsonValue; linkedRunId?: string | null; linkedRunItemId?: string | null }> = [];
    const statusCounts = { success: 0, error: 0, skipped: 0 };

    for (const row of analysis.workers) {
      try {
        const worker = await this.prisma.$transaction((tx) => this.upsertImportedWorkerTx(tx, row));
        workerMap.set(row.worker_ref, worker);
        rowResults.push({ sheetName: 'Workers', rowNumber: row.row_number, rowKey: row.worker_ref, action: 'upsert', status: 'success', payload: row as Prisma.InputJsonValue });
        statusCounts.success += 1;
      } catch (error: any) {
        rowResults.push({ sheetName: 'Workers', rowNumber: row.row_number, rowKey: row.worker_ref, action: 'upsert', status: 'error', errorMessage: error?.message || 'Unable to import worker', payload: row as Prisma.InputJsonValue });
        statusCounts.error += 1;
      }
    }

    for (const row of analysis.runs) {
      try {
        const run = await this.prisma.$transaction((tx) => this.upsertImportedRunTx(tx, row, updateExisting, actorId));
        runMap.set(row.run_name, run);
        rowResults.push({ sheetName: 'Runs', rowNumber: row.row_number, rowKey: row.run_name, action: updateExisting ? 'upsert' : 'create', status: 'success', payload: row as Prisma.InputJsonValue, linkedRunId: run.id });
        statusCounts.success += 1;
      } catch (error: any) {
        rowResults.push({ sheetName: 'Runs', rowNumber: row.row_number, rowKey: row.run_name, action: updateExisting ? 'upsert' : 'create', status: 'error', errorMessage: error?.message || 'Unable to import run', payload: row as Prisma.InputJsonValue });
        statusCounts.error += 1;
      }
    }

    for (const grouped of analysis.lineGroups) {
      const key = `${grouped.run_name}::${grouped.worker_ref}`;
      const run = runMap.get(grouped.run_name) || (await this.prisma.payrollRun.findFirst({ where: { OR: [{ name: grouped.run_name }, { AND: [{ year: analysis.runs.find((row) => row.run_name === grouped.run_name)?.year ?? -1 }, { month: analysis.runs.find((row) => row.run_name === grouped.run_name)?.month ?? -1 }] }] } }));
      const worker = workerMap.get(grouped.worker_ref) || await this.findImportedWorker(grouped.worker_ref, analysis.workers);
      const payload = { run_name: grouped.run_name, worker_ref: grouped.worker_ref, lines: grouped.lines, allocations: analysis.allocationsByKey.get(key) ?? [] } as Prisma.InputJsonValue;
      if (!run || !worker) {
        rowResults.push({ sheetName: 'RunItems', rowNumber: grouped.lines[0]?.row_number, rowKey: key, action: 'upsert', status: 'error', errorMessage: 'Referenced payroll run or worker is unavailable', payload });
        statusCounts.error += 1;
        continue;
      }
      try {
        const allocationRows = analysis.allocationsByKey.get(key) ?? [];
        const item = await this.prisma.$transaction((tx) => this.createImportedRunItemTx(tx, run.id, worker, grouped, allocationRows, updateExisting));
        itemMap.set(key, { itemId: item.id, runId: run.id });
        rowResults.push({ sheetName: 'RunItems', rowNumber: grouped.lines[0]?.row_number, rowKey: key, action: 'upsert', status: 'success', payload, linkedRunId: run.id, linkedRunItemId: item.id });
        statusCounts.success += 1;
      } catch (error: any) {
        rowResults.push({ sheetName: 'RunItems', rowNumber: grouped.lines[0]?.row_number, rowKey: key, action: 'upsert', status: 'error', errorMessage: error?.message || 'Unable to import run item', payload, linkedRunId: run.id });
        statusCounts.error += 1;
      }
    }

    for (const payment of analysis.payments) {
      const key = `${payment.run_name}::${payment.worker_ref}`;
      const target = itemMap.get(key) || await this.findImportedItem(key, analysis, workerMap, runMap);
      if (!target) {
        rowResults.push({ sheetName: 'Payments', rowNumber: payment.row_number, rowKey: key, action: 'update', status: 'error', errorMessage: 'Referenced payroll run item is unavailable', payload: payment as Prisma.InputJsonValue });
        statusCounts.error += 1;
        continue;
      }
      try {
        await this.prisma.payrollRunItem.update({
          where: { id: target.itemId },
          data: {
            paymentStatus: payment.payment_status || 'pending',
            paymentReference: payment.payment_reference || null,
          }
        });
        rowResults.push({ sheetName: 'Payments', rowNumber: payment.row_number, rowKey: key, action: 'update', status: 'success', payload: payment as Prisma.InputJsonValue, linkedRunId: target.runId, linkedRunItemId: target.itemId });
        statusCounts.success += 1;
      } catch (error: any) {
        rowResults.push({ sheetName: 'Payments', rowNumber: payment.row_number, rowKey: key, action: 'update', status: 'error', errorMessage: error?.message || 'Unable to update payment status', payload: payment as Prisma.InputJsonValue, linkedRunId: target.runId, linkedRunItemId: target.itemId });
        statusCounts.error += 1;
      }
    }

    const successfulRunIds = Array.from(new Set(rowResults.filter((row) => row.linkedRunId && row.status === 'success').map((row) => row.linkedRunId!)));
    for (const runId of successfulRunIds) {
      const run = await this.prisma.payrollRun.findUnique({ where: { id: runId }, include: { items: true } });
      if (!run) continue;
      const matchingSource = analysis.runs.find((row) => run.name === row.run_name || (run.year === row.year && run.month === row.month));
      const nextStatus = matchingSource?.status || (run.items.some((item) => item.paymentStatus === 'paid') ? 'paid' : 'prepared');
      await this.prisma.payrollRun.update({ where: { id: runId }, data: { status: nextStatus } });
    }

    if (rowResults.length) {
      await this.prisma.payrollImportRow.createMany({
        data: rowResults.map((row) => ({
          jobId: job.id,
          sheetName: row.sheetName,
          rowNumber: row.rowNumber ?? null,
          rowKey: row.rowKey,
          action: row.action,
          status: row.status,
          errorMessage: row.errorMessage ?? null,
          payload: row.payload,
          linkedRunId: row.linkedRunId ?? null,
          linkedRunItemId: row.linkedRunItemId ?? null,
        }))
      });
    }

    const completedJob = await this.prisma.payrollImportJob.update({
      where: { id: job.id },
      data: {
        status: statusCounts.error > 0 ? (statusCounts.success > 0 ? 'partial' : 'failed') : 'completed',
        completedAt: new Date(),
        summary: {
          ...analysis.summary,
          processed_workers: analysis.workers.length,
          processed_runs: analysis.runs.length,
          processed_run_items: analysis.lineGroups.length,
          processed_payments: analysis.payments.length,
          status_counts: statusCounts,
        } as Prisma.InputJsonValue,
      },
      include: {
        uploadedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        retriedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        retryOfJob: { select: { id: true, fileName: true } },
        rows: { orderBy: [{ createdAt: 'asc' }] },
      }
    });

    if (actorId && ['partial', 'failed'].includes(completedJob.status)) {
      await this.createPayrollNotification(actorId, 'import_issues', {
        type: 'payroll.import.issue',
        title: completedJob.status === 'failed' ? 'Payroll import failed' : 'Payroll import completed with issues',
        message: `${completedJob.fileName} finished with status ${completedJob.status}.`,
        link: `/app/finance/payroll/import?job_id=${completedJob.id}`,
        notifiableType: 'payroll_import_job',
        data: {
          job_id: completedJob.id,
          status: completedJob.status,
          summary: completedJob.summary || {},
        } as Prisma.InputJsonValue,
      });
    }

    return this.serializeImportJob(completedJob);
  }

  private mapWorkerDto(dto: UpsertPayrollWorkerDto): Prisma.PayrollWorkerUncheckedCreateInput {
    return {
      profileId: dto.profile_id ? this.parseBigInt(dto.profile_id, 'profile id') : null,
      organizationId: dto.organization_id ? this.parseBigInt(dto.organization_id, 'organization id') : null,
      teamId: dto.team_id ? this.parseBigInt(dto.team_id, 'team id') : null,
      projectId: dto.project_id ? this.parseBigInt(dto.project_id, 'project id') : null,
      defaultFundId: dto.default_fund_id || null,
      defaultGrantId: dto.default_grant_id || null,
      taxTableId: dto.tax_table_id || null,
      workerType: dto.worker_type,
      payBasis: dto.pay_basis || 'monthly_fixed',
      allocationMode: dto.allocation_mode || 'fixed',
      hybridFixedPercent: dto.hybrid_fixed_percent ?? 0,
      standardHoursPerDay: dto.standard_hours_per_day ?? 8,
      fullName: dto.full_name,
      email: dto.email || null,
      staffCode: dto.staff_code || null,
      currency: dto.currency || 'NGN',
      status: dto.status || 'active',
      bankName: dto.bank_name || null,
      bankAccountName: dto.bank_account_name || null,
      bankAccountNumber: dto.bank_account_number || null,
      taxIdentifier: dto.tax_identifier || null,
      pensionIdentifier: dto.pension_identifier || null,
      startDate: dto.start_date ? new Date(dto.start_date) : null,
      endDate: dto.end_date ? new Date(dto.end_date) : null,
      notes: dto.notes || null,
      metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
    };
  }

  private async syncWorkerChildrenTx(tx: Prisma.TransactionClient, workerId: string, dto: UpsertPayrollWorkerDto) {
    if (dto.profile) {
      const effectiveFrom = new Date(dto.profile.effective_from);
      const existingProfile = await tx.payrollWorkerProfile.findFirst({
        where: { workerId, effectiveFrom },
        orderBy: { createdAt: 'desc' },
      });

      if (existingProfile) {
        await tx.payrollWorkerProfileComponent.deleteMany({ where: { profileId: existingProfile.id } });
        await tx.payrollWorkerProfile.update({
          where: { id: existingProfile.id },
          data: {
            payFrequency: dto.profile.pay_frequency || 'monthly',
            baseAmount: dto.profile.base_amount ?? 0,
            paymentMode: dto.profile.payment_mode || null,
            effectiveFrom,
            effectiveTo: dto.profile.effective_to ? new Date(dto.profile.effective_to) : null,
            components: dto.profile.components?.length
              ? {
                  create: dto.profile.components.map((row) => ({
                    componentId: row.component_id,
                    amount: row.amount ?? null,
                    rate: row.rate ?? null,
                    formula: row.formula || null,
                    isEnabled: row.is_enabled ?? true,
                  }))
                }
              : undefined,
          },
        });
      } else {
        await tx.payrollWorkerProfile.create({
          data: {
            workerId,
            payFrequency: dto.profile.pay_frequency || 'monthly',
            baseAmount: dto.profile.base_amount ?? 0,
            paymentMode: dto.profile.payment_mode || null,
            effectiveFrom,
            effectiveTo: dto.profile.effective_to ? new Date(dto.profile.effective_to) : null,
            components: dto.profile.components?.length
              ? {
                  create: dto.profile.components.map((row) => ({
                    componentId: row.component_id,
                    amount: row.amount ?? null,
                    rate: row.rate ?? null,
                    formula: row.formula || null,
                    isEnabled: row.is_enabled ?? true,
                  }))
                }
              : undefined,
          }
        });
      }
    }

    if (dto.allocations) {
      await tx.payrollWorkerAllocation.deleteMany({ where: { workerId } });
      if (dto.allocations.length) {
        const totalPercent = dto.allocations.reduce((sum, row) => sum + Number(row.allocation_percent ?? 0), 0);
        if (Math.abs(totalPercent - 100) > 0.01) throw new BadRequestException('Worker allocations must total 100');
        await tx.payrollWorkerAllocation.createMany({
          data: dto.allocations.map((row, index) => ({
            workerId,
            organizationId: row.organization_id ? this.parseBigInt(row.organization_id, 'organization id') : null,
            teamId: row.team_id ? this.parseBigInt(row.team_id, 'team id') : null,
            projectId: row.project_id ? this.parseBigInt(row.project_id, 'project id') : null,
            fundId: row.fund_id || null,
            grantId: row.grant_id || null,
            allocationPercent: row.allocation_percent ?? 100,
            allocationAmount: row.allocation_amount ?? null,
            sortOrder: index,
          }))
        });
      }
    }
  }

  private mapComponentDto(dto: UpsertPayrollComponentDto): Prisma.PayrollComponentUncheckedCreateInput {
    return {
      chartAccountId: dto.chart_account_id || null,
      code: dto.code.trim().toLowerCase(),
      name: dto.name,
      componentType: dto.component_type,
      calculationType: dto.calculation_type || 'fixed',
      paidBy: dto.paid_by || 'employee',
      employerSharePercent: dto.employer_share_percent ?? 0,
      isTaxable: dto.is_taxable ?? false,
      affectsNetPay: dto.affects_net_pay ?? true,
      isStatutory: dto.is_statutory ?? false,
      isActive: dto.is_active ?? true,
    };
  }

  private workerInclude() {
    return {
      profile: { select: { id: true, firstName: true, lastName: true, email: true, username: true } },
      organization: { select: { id: true, name: true } },
      defaultFund: { select: { id: true, code: true, name: true } },
      defaultGrant: { select: { id: true, code: true, name: true } },
      taxTable: { include: { bands: { orderBy: { sortOrder: 'asc' } } } },
      profiles: {
        include: {
          components: { include: { component: { include: { chartAccount: { select: { id: true, code: true, name: true } } } } } }
        },
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }]
      },
      allocations: {
        include: {
          organization: { select: { id: true, name: true } },
          fund: { select: { id: true, code: true, name: true } },
          grant: { select: { id: true, code: true, name: true } },
        },
        orderBy: { sortOrder: 'asc' }
      },
      timesheetAllocations: {
        include: {
          organization: { select: { id: true, name: true } },
          fund: { select: { id: true, code: true, name: true } },
          grant: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ approvedAt: 'desc' }, { sortOrder: 'asc' }]
      },
    } satisfies Prisma.PayrollWorkerInclude;
  }

  private runInclude() {
    return {
      organization: { select: { id: true, name: true } },
      paidFromAccount: { select: { id: true, name: true, code: true } },
      preparedBy: { select: { id: true, firstName: true, lastName: true, email: true, username: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true, email: true, username: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true, email: true, username: true } },
      postings: { include: { journalEntry: { select: { id: true, entryNo: true, entryDate: true } } } },
      events: {
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true, username: true } },
        },
        orderBy: { createdAt: 'desc' }
      },
      payslipDistributions: {
        include: {
          worker: { select: { id: true, fullName: true, email: true, workerType: true } },
          sentByUser: { select: { id: true, firstName: true, lastName: true, email: true, username: true } },
          runItem: { select: { id: true, paymentStatus: true } },
        },
        orderBy: { createdAt: 'desc' }
      },
      timesheetAllocations: {
        include: {
          worker: { select: { id: true, fullName: true, workerType: true } },
          organization: { select: { id: true, name: true } },
          fund: { select: { id: true, code: true, name: true } },
          grant: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ workerId: 'asc' }, { sortOrder: 'asc' }]
      },
      items: {
        include: {
          worker: { select: { id: true, profileId: true, fullName: true, workerType: true, email: true, staffCode: true } },
          organization: { select: { id: true, name: true } },
          fund: { select: { id: true, code: true, name: true } },
          grant: { select: { id: true, code: true, name: true } },
          lines: { include: { component: { include: { chartAccount: { select: { id: true, code: true, name: true } } } } } },
          allocations: {
            include: {
              organization: { select: { id: true, name: true } },
              fund: { select: { id: true, code: true, name: true } },
              grant: { select: { id: true, code: true, name: true } },
            },
            orderBy: { sortOrder: 'asc' }
          },
          payslipDistributions: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { worker: { fullName: 'asc' } }
      }
    } satisfies Prisma.PayrollRunInclude;
  }

  private serializeWorker(row: any) {
    return {
      id: row.id,
      profile_id: row.profileId?.toString() ?? null,
      profile: row.profile
        ? {
            id: row.profile.id.toString(),
            full_name: [row.profile.firstName, row.profile.lastName].filter(Boolean).join(' ') || row.profile.username || row.profile.email,
            email: row.profile.email,
          }
        : null,
      organization_id: row.organizationId?.toString() ?? null,
      organization: row.organization ? { id: row.organization.id.toString(), name: row.organization.name } : null,
      team_id: row.teamId?.toString() ?? null,
      project_id: row.projectId?.toString() ?? null,
      default_fund_id: row.defaultFundId ?? null,
      default_fund: row.defaultFund,
      default_grant_id: row.defaultGrantId ?? null,
      default_grant: row.defaultGrant,
      tax_table_id: row.taxTableId ?? null,
      tax_table: row.taxTable ? this.serializeTaxTable(row.taxTable) : null,
      worker_type: row.workerType,
      pay_basis: row.payBasis,
      allocation_mode: row.allocationMode,
      hybrid_fixed_percent: Number(row.hybridFixedPercent || 0),
      standard_hours_per_day: Number(row.standardHoursPerDay || 8),
      full_name: row.fullName,
      email: row.email,
      staff_code: row.staffCode,
      currency: row.currency,
      status: row.status,
      bank_name: row.bankName,
      bank_account_name: row.bankAccountName,
      bank_account_number: row.bankAccountNumber,
      tax_identifier: row.taxIdentifier,
      pension_identifier: row.pensionIdentifier,
      start_date: row.startDate,
      end_date: row.endDate,
      notes: row.notes,
      metadata: row.metadata || {},
      profiles: (row.profiles || []).map((profile: any) => ({
        id: profile.id,
        pay_frequency: profile.payFrequency,
        base_amount: Number(profile.baseAmount || 0),
        payment_mode: profile.paymentMode,
        effective_from: profile.effectiveFrom,
        effective_to: profile.effectiveTo,
        components: (profile.components || []).map((componentRow: any) => ({
          id: componentRow.id,
          component_id: componentRow.componentId,
          component: this.serializeComponent(componentRow.component),
          amount: Number(componentRow.amount || 0),
          rate: componentRow.rate == null ? null : Number(componentRow.rate),
          formula: componentRow.formula,
          is_enabled: componentRow.isEnabled,
        }))
      })),
      allocations: (row.allocations || []).map((allocation: any) => ({
        id: allocation.id,
        organization_id: allocation.organizationId?.toString() ?? null,
        organization: allocation.organization ? { id: allocation.organization.id.toString(), name: allocation.organization.name } : null,
        team_id: allocation.teamId?.toString() ?? null,
        project_id: allocation.projectId?.toString() ?? null,
        fund_id: allocation.fundId ?? null,
        fund: allocation.fund,
        grant_id: allocation.grantId ?? null,
        grant: allocation.grant,
        allocation_percent: Number(allocation.allocationPercent || 0),
        allocation_amount: allocation.allocationAmount == null ? null : Number(allocation.allocationAmount),
      })),
      timesheet_allocations: (row.timesheetAllocations || []).map((allocation: any) => ({
        id: allocation.id,
        organization_id: allocation.organizationId?.toString() ?? null,
        organization: allocation.organization ? { id: allocation.organization.id.toString(), name: allocation.organization.name } : null,
        team_id: allocation.teamId?.toString() ?? null,
        project_id: allocation.projectId?.toString() ?? null,
        fund_id: allocation.fundId ?? null,
        fund: allocation.fund,
        grant_id: allocation.grantId ?? null,
        grant: allocation.grant,
        hours: Number(allocation.hours || 0),
        allocation_percent: Number(allocation.allocationPercent || 0),
        source: allocation.source,
        notes: allocation.notes,
        approved_at: allocation.approvedAt,
      })),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private serializeComponent(row: any) {
    return {
      id: row.id,
      chart_account_id: row.chartAccountId ?? null,
      chart_account: row.chartAccount
        ? { id: row.chartAccount.id, code: row.chartAccount.code, name: row.chartAccount.name }
        : null,
      code: row.code,
      name: row.name,
      component_type: row.componentType,
      calculation_type: row.calculationType,
      paid_by: row.paidBy,
      employer_share_percent: Number(row.employerSharePercent || 0),
      is_taxable: row.isTaxable,
      affects_net_pay: row.affectsNetPay,
      is_statutory: row.isStatutory,
      is_active: row.isActive,
      sort_order: row.sortOrder,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private serializeSetting(row: any) {
    return {
      id: row.id,
      organization_id: row.organizationId?.toString() ?? null,
      organization: row.organization ? { id: row.organization.id.toString(), name: row.organization.name } : null,
      default_expense_account_id: row.defaultExpenseAccountId ?? null,
      default_expense_account: row.defaultExpenseAccount,
      default_cash_account_id: row.defaultCashAccountId ?? null,
      default_cash_account: row.defaultCashAccount,
      employee_tax_table_id: row.employeeTaxTableId ?? null,
      employee_tax_table: row.employeeTaxTable ? this.serializeTaxTable(row.employeeTaxTable) : null,
      config: row.config || {},
      updated_at: row.updatedAt,
    };
  }

  private serializeRunSummary(row: any) {
    const totals = (row.items || []).reduce(
      (acc: any, item: any) => {
        acc.gross += Number(item.grossPay || 0);
        acc.deductions += Number(item.totalDeductions || 0);
        acc.employer_cost += Number(item.employerCostTotal || 0);
        acc.net += Number(item.netPay || 0);
        return acc;
      },
      { gross: 0, deductions: 0, employer_cost: 0, net: 0 }
    );
    return {
      id: row.id,
      name: row.name,
      year: row.year,
      month: row.month,
      period_start: row.periodStart,
      period_end: row.periodEnd,
      status: row.status,
      currency: row.currency,
      organization_id: row.organizationId?.toString() ?? null,
      organization: row.organization ? { id: row.organization.id.toString(), name: row.organization.name } : null,
      paid_from_account: row.paidFromAccount || null,
      prepared_by: row.preparedBy
        ? { id: row.preparedBy.id.toString(), name: [row.preparedBy.firstName, row.preparedBy.lastName].filter(Boolean).join(' ') || row.preparedBy.email }
        : null,
      item_count: row._count?.items ?? row.items?.length ?? 0,
      totals,
      paid_at: row.paidAt,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private serializeRun(row: any) {
    return {
      ...this.serializeRunSummary(row),
      notes: row.notes,
      reviewed_by: row.reviewedBy
        ? { id: row.reviewedBy.id.toString(), name: [row.reviewedBy.firstName, row.reviewedBy.lastName].filter(Boolean).join(' ') || row.reviewedBy.email }
        : null,
      approved_by: row.approvedBy
        ? { id: row.approvedBy.id.toString(), name: [row.approvedBy.firstName, row.approvedBy.lastName].filter(Boolean).join(' ') || row.approvedBy.email }
        : null,
      postings: (row.postings || []).map((posting: any) => ({
        id: posting.id,
        journal_entry: posting.journalEntry,
        posted_at: posting.postedAt,
      })),
      events: (row.events || []).map((event: any) => ({
        id: event.id,
        event_type: event.eventType,
        note: event.note,
        metadata: event.metadata || {},
        created_at: event.createdAt,
        actor: event.actor
          ? {
              id: event.actor.id.toString(),
              name: [event.actor.firstName, event.actor.lastName].filter(Boolean).join(' ') || event.actor.username || event.actor.email,
              email: event.actor.email,
            }
          : null,
      })),
      payslip_distributions: (row.payslipDistributions || []).map((distribution: any) => ({
        id: distribution.id,
        run_item_id: distribution.runItemId ?? null,
        worker_id: distribution.workerId ?? null,
        worker: distribution.worker
          ? {
              id: distribution.worker.id,
              full_name: distribution.worker.fullName,
              email: distribution.worker.email,
              worker_type: distribution.worker.workerType,
            }
          : null,
        recipient_email: distribution.recipientEmail,
        status: distribution.status,
        error_message: distribution.errorMessage,
        sent_at: distribution.sentAt,
        metadata: distribution.metadata || {},
        sent_by: distribution.sentByUser
          ? {
              id: distribution.sentByUser.id.toString(),
              name: [distribution.sentByUser.firstName, distribution.sentByUser.lastName].filter(Boolean).join(' ') || distribution.sentByUser.username || distribution.sentByUser.email,
              email: distribution.sentByUser.email,
            }
          : null,
      })),
      items: (row.items || []).map((item: any) => ({
        id: item.id,
        worker_id: item.workerId,
        worker: item.worker,
        organization_id: item.organizationId?.toString() ?? null,
        organization: item.organization,
        team_id: item.teamId?.toString() ?? null,
        project_id: item.projectId?.toString() ?? null,
        fund_id: item.fundId ?? null,
        fund: item.fund,
        grant_id: item.grantId ?? null,
        grant: item.grant,
        worker_type: item.workerType,
        pay_basis: item.payBasis,
        allocation_source: item.allocationSource,
        gross_pay: Number(item.grossPay || 0),
        total_deductions: Number(item.totalDeductions || 0),
        employer_cost_total: Number(item.employerCostTotal || 0),
        computed_net_pay: Number(item.computedNetPay || 0),
        actual_net_pay: Number(item.actualNetPay || 0),
        net_adjustment_amount: Number(item.netAdjustmentAmount || 0),
        net_adjustment_reason: item.netAdjustmentReason,
        net_pay: Number(item.netPay || 0),
        payment_status: item.paymentStatus,
        payment_reference: item.paymentReference,
        lines: (item.lines || []).map((line: any) => ({
          id: line.id,
          component_id: line.componentId,
          component: this.serializeComponent(line.component),
          line_type: line.lineType,
          amount: Number(line.amount || 0),
          quantity: line.quantity == null ? null : Number(line.quantity),
          rate: line.rate == null ? null : Number(line.rate),
          notes: line.notes,
        })),
        allocations: (item.allocations || []).map((allocation: any) => ({
          id: allocation.id,
          organization_id: allocation.organizationId?.toString() ?? null,
          organization: allocation.organization,
          team_id: allocation.teamId?.toString() ?? null,
          project_id: allocation.projectId?.toString() ?? null,
          fund_id: allocation.fundId ?? null,
          fund: allocation.fund,
          grant_id: allocation.grantId ?? null,
          grant: allocation.grant,
          allocation_percent: Number(allocation.allocationPercent || 0),
          allocation_amount: allocation.allocationAmount == null ? null : Number(allocation.allocationAmount),
        })),
        timesheet_allocations: (row.timesheetAllocations || [])
          .filter((allocation: any) => allocation.workerId === item.workerId)
          .map((allocation: any) => ({
            id: allocation.id,
            organization_id: allocation.organizationId?.toString() ?? null,
            organization: allocation.organization ? { id: allocation.organization.id.toString(), name: allocation.organization.name } : null,
            team_id: allocation.teamId?.toString() ?? null,
            project_id: allocation.projectId?.toString() ?? null,
            fund_id: allocation.fundId ?? null,
            fund: allocation.fund,
            grant_id: allocation.grantId ?? null,
            grant: allocation.grant,
            hours: Number(allocation.hours || 0),
            allocation_percent: Number(allocation.allocationPercent || 0),
            source: allocation.source,
            notes: allocation.notes,
            approved_at: allocation.approvedAt,
          }))
      }))
    };
  }

  private serializeLoan(row: any) {
    return {
      id: row.id,
      worker_id: row.workerId,
      worker: row.worker
        ? { id: row.worker.id, full_name: row.worker.fullName, worker_type: row.worker.workerType, email: row.worker.email }
        : null,
      component_id: row.componentId ?? null,
      component: row.component || null,
      request_id: row.requestId ? String(row.requestId) : null,
      loan_type: row.loanType,
      title: row.title,
      principal_amount: Number(row.principalAmount || 0),
      outstanding_amount: Number(row.outstandingAmount || 0),
      issued_date: row.issuedDate,
      start_recovery_date: row.startRecoveryDate,
      monthly_recovery_amount: row.monthlyRecoveryAmount == null ? null : Number(row.monthlyRecoveryAmount),
      recovery_rate: row.recoveryRate == null ? null : Number(row.recoveryRate),
      status: row.status,
      notes: row.notes,
      repayments: (row.repayments || []).map((repayment: any) => ({
        id: repayment.id,
        run_id: repayment.runId ?? null,
        run_item_id: repayment.runItemId ?? null,
        amount: Number(repayment.amount || 0),
        status: repayment.status,
        notes: repayment.notes,
        created_at: repayment.createdAt,
      })),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private serializeTaxTable(row: any) {
    return {
      id: row.id,
      organization_id: row.organizationId?.toString() ?? null,
      name: row.name,
      code: row.code,
      worker_type: row.workerType,
      periodicity: row.periodicity,
      status: row.status,
      effective_from: row.effectiveFrom,
      effective_to: row.effectiveTo,
      fixed_relief_amount: Number(row.fixedReliefAmount || 0),
      gross_relief_rate: Number(row.grossReliefRate || 0),
      minimum_relief_amount: Number(row.minimumReliefAmount || 0),
      pension_relief_enabled: row.pensionReliefEnabled !== false,
      bands: (row.bands || []).map((band: any) => ({
        id: band.id,
        lower_bound: Number(band.lowerBound || 0),
        upper_bound: band.upperBound == null ? null : Number(band.upperBound),
        rate: Number(band.rate || 0),
        sort_order: band.sortOrder,
      })),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private serializeProjectTimesheet(row: any) {
    return {
      id: row.id,
      worker_id: row.workerId,
      worker: row.worker
        ? { id: row.worker.id, full_name: row.worker.fullName, worker_type: row.worker.workerType, email: row.worker.email }
        : null,
      component_id: row.componentId ?? null,
      component: row.component || null,
      organization_id: row.organizationId?.toString() ?? null,
      organization: row.organization ? { id: row.organization.id.toString(), name: row.organization.name } : null,
      team_id: row.teamId?.toString() ?? null,
      project_id: row.projectId?.toString() ?? null,
      fund_id: row.fundId ?? null,
      fund: row.fund || null,
      grant_id: row.grantId ?? null,
      grant: row.grant || null,
      synced_run_id: row.syncedRunId ?? null,
      synced_run: row.syncedRun || null,
      work_date: row.workDate,
      hours: Number(row.hours || 0),
      description: row.description,
      status: row.status,
      approved_at: row.approvedAt,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private mapTaxTableDto(dto: UpsertPayrollTaxTableDto): Prisma.PayrollTaxTableUncheckedCreateInput {
    return {
      organizationId: dto.organization_id ? this.parseBigInt(dto.organization_id, 'organization id') : null,
      name: dto.name,
      code: dto.code.trim().toLowerCase(),
      workerType: dto.worker_type || 'employee',
      periodicity: dto.periodicity || 'monthly',
      status: dto.status || 'active',
      effectiveFrom: new Date(dto.effective_from),
      effectiveTo: dto.effective_to ? new Date(dto.effective_to) : null,
      fixedReliefAmount: dto.fixed_relief_amount ?? 0,
      grossReliefRate: dto.gross_relief_rate ?? 0,
      minimumReliefAmount: dto.minimum_relief_amount ?? 0,
      pensionReliefEnabled: dto.pension_relief_enabled ?? true,
    };
  }

  private mapTaxBandDtos(rows: Array<{ lower_bound?: number; upper_bound?: number | null; rate: number; sort_order?: number }>) {
    return rows
      .map((row, index) => ({
        lowerBound: row.lower_bound ?? 0,
        upperBound: row.upper_bound == null ? null : row.upper_bound,
        rate: row.rate,
        sortOrder: row.sort_order ?? index,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.lowerBound - b.lowerBound);
  }

  private async resolveWorkerForUser(userId: string) {
    const worker = await this.prisma.payrollWorker.findFirst({
      where: { profileId: toBigInt(userId) },
      select: { id: true, fullName: true, workerType: true },
    });
    if (!worker) throw new NotFoundException('Payroll worker profile not found for this user');
    return worker;
  }

  private async resolveEmployeeTaxTableTx(
    tx: Prisma.TransactionClient,
    input: { workerTaxTableId?: string | null; settingTaxTableId?: string | null; organizationId?: bigint | null },
    cache?: Map<string, any | null>
  ) {
    const lookupById = async (id: string | null | undefined) => {
      if (!id) return null;
      if (cache?.has(id)) return cache.get(id) ?? null;
      const row = await tx.payrollTaxTable.findUnique({
        where: { id },
        include: { bands: { orderBy: { sortOrder: 'asc' } } },
      });
      cache?.set(id, row ?? null);
      return row;
    };

    const direct = (await lookupById(input.workerTaxTableId)) || (await lookupById(input.settingTaxTableId));
    if (direct) return direct;

    const today = new Date();
    const row = await tx.payrollTaxTable.findFirst({
      where: {
        status: 'active',
        workerType: { in: ['employee', 'all'] },
        OR: input.organizationId ? [{ organizationId: input.organizationId }, { organizationId: null }] : [{ organizationId: null }],
        effectiveFrom: { lte: today },
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }] }],
      },
      include: { bands: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ organizationId: 'desc' }, { effectiveFrom: 'desc' }],
    });
    if (row && cache) cache.set(row.id, row);
    return row;
  }

  private calculateEmployeePaye(input: {
    grossPay: number;
    lines: Array<{ componentId: string; lineType: string; amount: Prisma.Decimal; affectsNetPay?: boolean }>;
    componentsById: Map<string, any>;
    taxTable: any | null;
    fallbackRate: number;
  }) {
    const taxableGross = input.lines
      .filter((line) => line.lineType === 'earning' && input.componentsById.get(line.componentId)?.isTaxable !== false)
      .reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const pensionRelief = input.taxTable?.pensionReliefEnabled
      ? input.lines
          .filter((line) => line.lineType === 'deduction' && input.componentsById.get(line.componentId)?.code === 'pension_employee')
          .reduce((sum, line) => sum + Number(line.amount || 0), 0)
      : 0;

    if (input.taxTable?.bands?.length) {
      const periodicityFactor = input.taxTable.periodicity === 'annual' ? 12 : 1;
      const taxableBase = taxableGross * periodicityFactor;
      const fixedRelief = Number(input.taxTable.fixedReliefAmount || 0);
      const percentageRelief = taxableBase * Number(input.taxTable.grossReliefRate || 0);
      const minimumRelief = Number(input.taxTable.minimumReliefAmount || 0);
      const relief = Math.max(minimumRelief, fixedRelief + percentageRelief);
      const chargeableIncome = Math.max(0, taxableBase - relief - pensionRelief * periodicityFactor);
      const taxBase = this.applyProgressiveTax(chargeableIncome, input.taxTable.bands || []);
      const monthlyTax = periodicityFactor === 12 ? taxBase / 12 : taxBase;
      const appliedRate = taxableGross > 0 ? monthlyTax / taxableGross : null;
      return {
        taxAmount: Math.max(0, monthlyTax),
        appliedRate,
        notes: `PAYE via ${input.taxTable.name}`,
      };
    }

    if (input.fallbackRate > 0 && input.grossPay > 0) {
      return {
        taxAmount: input.grossPay * input.fallbackRate,
        appliedRate: input.fallbackRate,
        notes: 'Auto PAYE (legacy rate)',
      };
    }

    return { taxAmount: 0, appliedRate: null, notes: null };
  }

  private applyProgressiveTax(amount: number, bands: Array<{ lowerBound?: Prisma.Decimal | number; upperBound?: Prisma.Decimal | number | null; rate?: Prisma.Decimal | number }>) {
    if (!amount || amount <= 0) return 0;
    let total = 0;
    const normalized = bands
      .map((band) => ({
        lower: Number(band.lowerBound || 0),
        upper: band.upperBound == null ? null : Number(band.upperBound),
        rate: Number(band.rate || 0),
      }))
      .sort((a, b) => a.lower - b.lower);

    for (const band of normalized) {
      if (amount <= band.lower) continue;
      const upper = band.upper ?? amount;
      const taxableInBand = Math.max(0, Math.min(amount, upper) - band.lower);
      if (taxableInBand <= 0) continue;
      total += taxableInBand * band.rate;
      if (band.upper != null && amount <= band.upper) break;
    }

    return total;
  }

  private pickActiveProfile(profiles: any[], periodStart: Date, periodEnd: Date) {
    return profiles.find((profile) => {
      const startsOk = !profile.effectiveFrom || profile.effectiveFrom <= periodEnd;
      const endsOk = !profile.effectiveTo || profile.effectiveTo >= periodStart;
      return startsOk && endsOk;
    }) || null;
  }

  private mapProjectTimesheetDto(dto: any, actorId?: string, preserveCreator = false): Prisma.ProjectTimesheetEntryUncheckedCreateInput {
    return {
      workerId: dto.worker_id,
      componentId: dto.component_id || null,
      organizationId: dto.organization_id ? this.parseBigInt(dto.organization_id, 'organization id') : null,
      teamId: dto.team_id ? this.parseBigInt(dto.team_id, 'team id') : null,
      projectId: dto.project_id ? this.parseBigInt(dto.project_id, 'project id') : null,
      fundId: dto.fund_id || null,
      grantId: dto.grant_id || null,
      workDate: new Date(dto.work_date),
      hours: dto.hours,
      description: dto.description || null,
      status: dto.status || 'draft',
      createdBy: preserveCreator ? undefined : (actorId ? toBigInt(actorId) : undefined),
    };
  }

  private async syncApprovedTimesheetsToPayrollRun(workerId: string, workDate: Date) {
    const month = workDate.getUTCMonth() + 1;
    const year = workDate.getUTCFullYear();
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));
    const run = await this.prisma.payrollRun.findFirst({ where: { year, month } });
    if (!run) return null;
    if (['approved', 'authorized', 'paid', 'closed'].includes(run.status)) return null;
    const approvedRows = await this.prisma.projectTimesheetEntry.findMany({
      where: {
        workerId,
        status: 'approved',
        workDate: { gte: periodStart, lte: periodEnd },
      },
      orderBy: [{ workDate: 'asc' }, { createdAt: 'asc' }]
    });
    const totalHours = approvedRows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.payrollRunTimesheetAllocation.deleteMany({ where: { runId: run.id, workerId } });
      if (approvedRows.length) {
        await tx.payrollRunTimesheetAllocation.createMany({
          data: approvedRows.map((row, index) => ({
            runId: run.id,
            workerId,
            organizationId: row.organizationId,
            teamId: row.teamId,
            projectId: row.projectId,
            fundId: row.fundId,
            grantId: row.grantId,
            hours: row.hours,
            allocationPercent: totalHours > 0 ? (Number(row.hours || 0) / totalHours) * 100 : 0,
            source: 'timesheet',
            notes: row.description,
            sortOrder: index,
            approvedAt: row.approvedAt ?? new Date(),
          }))
        });
      }
      await tx.projectTimesheetEntry.updateMany({
        where: { id: { in: approvedRows.map((row) => row.id) } },
        data: { syncedRunId: run.id }
      });
    });
    return run.id;
  }

  private async resolvePayrollSettingTx(tx: Prisma.TransactionClient, organizationId: bigint | null) {
    return tx.payrollSetting.findFirst({
      where: organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : { organizationId: null },
      orderBy: { organizationId: 'desc' }
    }).then((row) => row || { defaultExpenseAccountId: null, defaultCashAccountId: null, employeeTaxTableId: null, config: {} });
  }

  private async resolveCashChartAccountTx(tx: Prisma.TransactionClient, financeAccountId: string, organizationId: bigint | null) {
    const account = await tx.financeAccount.findUnique({ where: { id: financeAccountId }, include: { chartAccount: true } });
    if (!account?.chartAccount) throw new BadRequestException('Selected payment account has no linked chart account');
    return account.chartAccount.id;
  }

  private buildPayrollJournalLines(run: any, defaultExpenseAccountId: string | null, cashChartAccountId: string) {
    const bucket = new Map<string, { chartAccountId: string; organizationId: bigint | null; teamId: bigint | null; fundId: string | null; grantId: string | null; debit: number; credit: number; description?: string }>();
    const addLine = (line: { chartAccountId: string; organizationId?: bigint | null; teamId?: bigint | null; fundId?: string | null; grantId?: string | null; debit?: number; credit?: number; description?: string }) => {
      const key = [line.chartAccountId, line.organizationId ?? '', line.teamId ?? '', line.fundId ?? '', line.grantId ?? ''].join('|');
      const existing = bucket.get(key) || {
        chartAccountId: line.chartAccountId,
        organizationId: line.organizationId ?? null,
        teamId: line.teamId ?? null,
        fundId: line.fundId ?? null,
        grantId: line.grantId ?? null,
        debit: 0,
        credit: 0,
        description: line.description,
      };
      existing.debit += Number(line.debit || 0);
      existing.credit += Number(line.credit || 0);
      bucket.set(key, existing);
    };

    for (const item of run.items) {
      const allocations = item.allocations?.length ? item.allocations : [{ organizationId: item.organizationId, teamId: item.teamId, fundId: item.fundId, grantId: item.grantId, allocationPercent: new Prisma.Decimal(100) }];
      for (const line of item.lines) {
          const accountId = line.component.chartAccountId || defaultExpenseAccountId;
        if (!accountId) continue;
        for (const allocation of allocations) {
          const factor = Number(allocation.allocationPercent || 0) / 100;
          const amount = Number(line.amount || 0) * factor;
          if (!amount) continue;
          if (line.line_type === 'deduction') {
            addLine({
              chartAccountId: accountId,
              organizationId: allocation.organizationId ?? null,
              teamId: allocation.teamId ?? null,
              fundId: allocation.fundId ?? null,
              grantId: allocation.grantId ?? null,
              credit: amount,
              description: `${run.name} deduction`
            });
          } else {
            addLine({
              chartAccountId: accountId,
              organizationId: allocation.organizationId ?? null,
              teamId: allocation.teamId ?? null,
              fundId: allocation.fundId ?? null,
              grantId: allocation.grantId ?? null,
              debit: amount,
              description: `${run.name} expense`
            });
          }
        }
      }
      for (const allocation of allocations) {
        const factor = Number(allocation.allocationPercent || 0) / 100;
        const amount = Number(item.actualNetPay || item.netPay || 0) * factor;
        if (!amount) continue;
        addLine({
          chartAccountId: cashChartAccountId,
          organizationId: allocation.organizationId ?? null,
          teamId: allocation.teamId ?? null,
          fundId: allocation.fundId ?? null,
          grantId: allocation.grantId ?? null,
          credit: amount,
          description: `${run.name} cash`
        });
      }
    }

    const lines = Array.from(bucket.values()).filter((line) => Math.abs(line.debit) > 0.001 || Math.abs(line.credit) > 0.001);
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Payroll journal is not balanced. Check payroll component account mappings and deductions.');
    }
    return lines;
  }

  private async ensureReportingPeriodTx(tx: Prisma.TransactionClient, date: Date, actorId?: string) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.floor((month - 1) / 3) + 1;
    const existing = await tx.financeReportingPeriod.findFirst({ where: { year, month } });
    if (existing) return existing;
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));
    return tx.financeReportingPeriod.create({
      data: {
        year,
        month,
        quarter,
        label: `${year}-${String(month).padStart(2, '0')}`,
        startDate,
        endDate,
        status: 'open',
        createdBy: actorId ? toBigInt(actorId) : null,
      }
    });
  }

  private async createJournalEntryTx(
    tx: Prisma.TransactionClient,
    input: {
      entryDate: Date;
      periodId: string;
      sourceType: string;
      sourceId: string;
      memo: string;
      currency: string;
      postedBy?: string;
      lines: Array<{ chartAccountId: string; organizationId?: bigint | null; teamId?: bigint | null; fundId?: string | null; grantId?: string | null; debit: number; credit: number; description?: string }>;
    }
  ) {
    const totalDebit = input.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const totalCredit = input.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException('Journal entry is not balanced');
    }
    const entryNo = await this.nextSequenceValueTx(tx, 'JE', input.entryDate);
    return tx.financeJournalEntry.create({
      data: {
        entryNo,
        entryDate: input.entryDate,
        periodId: input.periodId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        memo: input.memo,
        status: 'posted',
        currency: input.currency,
        totalDebit,
        totalCredit,
        postedBy: input.postedBy ? toBigInt(input.postedBy) : null,
        lines: {
          create: input.lines.map((line) => ({
            chartAccountId: line.chartAccountId,
            organizationId: line.organizationId ?? null,
            teamId: line.teamId ?? null,
            fundId: line.fundId ?? null,
            grantId: line.grantId ?? null,
            debit: line.debit,
            credit: line.credit,
            description: line.description ?? null,
          }))
        }
      }
    });
  }

  private async nextSequenceValueTx(tx: Prisma.TransactionClient, prefix: string, date: Date) {
    const year = date.getFullYear();
    const count = await tx.financeJournalEntry.count({ where: { entryNo: { startsWith: `${prefix}/${year}/` } } });
    return `${prefix}/${year}/${String(count + 1).padStart(4, '0')}`;
  }

  private resolveAllocationSource(allocationMode: string, timesheetRowCount: number) {
    if (allocationMode === 'timesheet') return timesheetRowCount > 0 ? 'timesheet' : 'fixed';
    if (allocationMode === 'hybrid') return timesheetRowCount > 0 ? 'hybrid' : 'fixed';
    return 'fixed';
  }

  private async ensureSystemPayrollComponentsTx(tx: Prisma.TransactionClient, codes: string[]) {
    const existing = await tx.payrollComponent.findMany({ where: { code: { in: codes }, isActive: true } });
    const existingCodes = new Set(existing.map((row) => row.code));
    const definitions: Record<string, Partial<Prisma.PayrollComponentUncheckedCreateInput>> = {
      basic_salary: { name: 'Basic Salary', componentType: 'earning', calculationType: 'fixed', paidBy: 'employer', isTaxable: true, affectsNetPay: true, isStatutory: false, isActive: true },
      paye_tax: { name: 'PAYE Tax', componentType: 'deduction', calculationType: 'percentage', paidBy: 'employee', isTaxable: false, affectsNetPay: true, isStatutory: true, isActive: true },
      pension_employee: { name: 'Employee Pension', componentType: 'deduction', calculationType: 'percentage', paidBy: 'employee', isTaxable: false, affectsNetPay: true, isStatutory: true, isActive: true },
      pension_employer: { name: 'Employer Pension', componentType: 'employer_cost', calculationType: 'percentage', paidBy: 'employer', isTaxable: false, affectsNetPay: false, isStatutory: true, isActive: true },
      withholding_tax: { name: 'Withholding Tax', componentType: 'deduction', calculationType: 'percentage', paidBy: 'employee', isTaxable: false, affectsNetPay: true, isStatutory: true, isActive: true },
      employer_paye_cover: { name: 'Employer PAYE Cover', componentType: 'employer_cost', calculationType: 'percentage', paidBy: 'employer', isTaxable: false, affectsNetPay: false, isStatutory: true, isActive: true },
      salary_advance_recovery: { name: 'Salary Advance Recovery', componentType: 'deduction', calculationType: 'fixed', paidBy: 'employee', isTaxable: false, affectsNetPay: true, isStatutory: false, isActive: true },
      loan_repayment: { name: 'Loan Repayment', componentType: 'deduction', calculationType: 'fixed', paidBy: 'employee', isTaxable: false, affectsNetPay: true, isStatutory: false, isActive: true },
    };
    for (const code of codes) {
      if (existingCodes.has(code) || !definitions[code]) continue;
      const created = await tx.payrollComponent.create({
        data: {
          code,
          ...definitions[code],
        } as Prisma.PayrollComponentUncheckedCreateInput
      });
      existing.push(created);
    }
    return existing;
  }

  private expandProfileComponentLines(component: any, amount: number, rate: number | null, notes: string | null) {
    const lineRate = rate == null ? null : new Prisma.Decimal(rate);
    const employerSharePercent = Math.max(0, Math.min(100, Number(component.employerSharePercent || 0)));
    if (component.componentType === 'earning' || component.componentType === 'employer_cost') {
      return [{
        componentId: component.id,
        lineType: component.componentType,
        amount: new Prisma.Decimal(amount),
        rate: lineRate,
        notes,
        affectsNetPay: component.componentType === 'earning' ? true : false,
      }];
    }
    if (component.paidBy === 'employer') {
      return [{
        componentId: component.id,
        lineType: 'employer_cost',
        amount: new Prisma.Decimal(amount),
        rate: lineRate,
        notes,
        affectsNetPay: false,
      }];
    }
    if (component.paidBy === 'shared' && employerSharePercent > 0) {
      const employerAmount = amount * (employerSharePercent / 100);
      const employeeAmount = amount - employerAmount;
      return [
        ...(employeeAmount > 0 ? [{
          componentId: component.id,
          lineType: 'deduction',
          amount: new Prisma.Decimal(employeeAmount),
          rate: lineRate,
          notes: notes || 'Employee share',
          affectsNetPay: true,
        }] : []),
        ...(employerAmount > 0 ? [{
          componentId: component.id,
          lineType: 'employer_cost',
          amount: new Prisma.Decimal(employerAmount),
          rate: lineRate,
          notes: notes || 'Employer share',
          affectsNetPay: false,
        }] : []),
      ];
    }
    return [{
      componentId: component.id,
      lineType: 'deduction',
      amount: new Prisma.Decimal(amount),
      rate: lineRate,
      notes,
      affectsNetPay: component.affectsNetPay !== false,
    }];
  }

  private normalizeTimesheetAllocations(rows: any[]) {
    if (!rows.length) return [];
    const totalPercent = rows.reduce((sum, row) => sum + Number(row.allocationPercent || 0), 0);
    const totalHours = rows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
    return rows
      .map((row) => {
        const percent = totalPercent > 0
          ? Number(row.allocationPercent || 0)
          : totalHours > 0
            ? (Number(row.hours || 0) / totalHours) * 100
            : 0;
        return {
          organizationId: row.organizationId ?? null,
          teamId: row.teamId ?? null,
          projectId: row.projectId ?? null,
          fundId: row.fundId ?? null,
          grantId: row.grantId ?? null,
          allocationPercent: new Prisma.Decimal(percent),
          allocationAmount: null,
          sortOrder: row.sortOrder ?? 0,
          hours: Number(row.hours || 0),
        };
      })
      .filter((row) => Number(row.allocationPercent) > 0);
  }

  private resolveAllocations(input: {
    allocationMode: string;
    hybridFixedPercent: number;
    fixedAllocations: Array<{ organizationId: bigint | null; teamId: bigint | null; projectId: bigint | null; fundId: string | null; grantId: string | null; allocationPercent: number; allocationAmount?: Prisma.Decimal | null; sortOrder: number }>;
    timesheetAllocations: Array<{ organizationId: bigint | null; teamId: bigint | null; projectId: bigint | null; fundId: string | null; grantId: string | null; allocationPercent: Prisma.Decimal; allocationAmount?: Prisma.Decimal | null; sortOrder: number; hours?: number }>;
  }) {
    const timesheetRows = input.timesheetAllocations.length ? input.timesheetAllocations : [];
    if (input.allocationMode === 'timesheet' && timesheetRows.length) {
      return timesheetRows.map((row, index) => ({ ...row, sortOrder: index }));
    }
    if (input.allocationMode !== 'hybrid' || !timesheetRows.length) {
      return input.fixedAllocations.map((row, index) => ({
        ...row,
        allocationPercent: new Prisma.Decimal(Number(row.allocationPercent || 0)),
        sortOrder: index,
      }));
    }

    const fixedWeight = Math.max(0, Math.min(100, input.hybridFixedPercent)) / 100;
    const timesheetWeight = 1 - fixedWeight;
    const bucket = new Map<string, { organizationId: bigint | null; teamId: bigint | null; projectId: bigint | null; fundId: string | null; grantId: string | null; allocationPercent: number }>();
    const add = (row: { organizationId: bigint | null; teamId: bigint | null; projectId: bigint | null; fundId: string | null; grantId: string | null }, percent: number) => {
      const key = [row.organizationId ?? '', row.teamId ?? '', row.projectId ?? '', row.fundId ?? '', row.grantId ?? ''].join('|');
      const existing = bucket.get(key) || { ...row, allocationPercent: 0 };
      existing.allocationPercent += percent;
      bucket.set(key, existing);
    };
    for (const row of input.fixedAllocations) add(row, Number(row.allocationPercent || 0) * fixedWeight);
    for (const row of timesheetRows) add(row, Number(row.allocationPercent || 0) * timesheetWeight);
    return Array.from(bucket.values())
      .filter((row) => row.allocationPercent > 0)
      .map((row, index) => ({
        ...row,
        allocationPercent: new Prisma.Decimal(row.allocationPercent),
        allocationAmount: null,
        sortOrder: index,
      }));
  }

  private normalizeTimesheetInputRows(rows: UpdatePayrollRunTimesheetAllocationsDto['allocations']) {
    const totalPercent = rows.reduce((sum, row) => sum + Number(row.allocation_percent || 0), 0);
    const totalHours = rows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
    return rows.map((row) => ({
      ...row,
      allocation_percent: totalPercent > 0
        ? Number(row.allocation_percent || 0)
        : totalHours > 0
          ? (Number(row.hours || 0) / totalHours) * 100
          : 0,
    })).filter((row) => Number(row.allocation_percent || 0) > 0 || Number(row.hours || 0) > 0);
  }

  private async analyzeImport(dto: PayrollImportDto) {
    const runs = (dto.runs || []).map((row, index) => ({
      ...row,
      row_number: index + 2,
      run_name: String(row.run_name || '').trim(),
      currency: String(row.currency || 'NGN').trim() || 'NGN',
      status: String(row.status || 'prepared').trim() || 'prepared',
    }));
    const workers = (dto.workers || []).map((row, index) => ({
      ...row,
      row_number: index + 2,
      worker_ref: String(row.worker_ref || '').trim(),
      full_name: String(row.full_name || '').trim(),
      worker_type: String(row.worker_type || 'employee').trim() || 'employee',
      email: String(row.email || '').trim(),
      staff_code: String(row.staff_code || '').trim(),
    }));
    const lines = (dto.lines || []).map((row, index) => ({
      ...row,
      row_number: index + 2,
      run_name: String(row.run_name || '').trim(),
      worker_ref: String(row.worker_ref || '').trim(),
      component_code: String(row.component_code || '').trim().toLowerCase(),
      amount: Number(row.amount || 0),
      notes: String(row.notes || '').trim(),
    }));
    const allocations = (dto.allocations || []).map((row, index) => ({
      ...row,
      row_number: index + 2,
      run_name: String(row.run_name || '').trim(),
      worker_ref: String(row.worker_ref || '').trim(),
      allocation_percent: Number(row.allocation_percent || 0),
    }));
    const payments = (dto.payments || []).map((row, index) => ({
      ...row,
      row_number: index + 2,
      run_name: String(row.run_name || '').trim(),
      worker_ref: String(row.worker_ref || '').trim(),
      payment_status: String(row.payment_status || 'pending').trim() || 'pending',
      payment_reference: String(row.payment_reference || '').trim(),
    }));

    const issues: Array<{ sheet: string; row_number: number; key: string; issues: string[] }> = [];
    const runNames = new Set(runs.map((row) => row.run_name).filter(Boolean));
    const workerRefs = new Set(workers.map((row) => row.worker_ref).filter(Boolean));
    const componentCodes = Array.from(new Set(lines.map((row) => row.component_code).filter(Boolean)));

    const components = componentCodes.length
      ? await this.prisma.payrollComponent.findMany({ where: { code: { in: componentCodes } } })
      : [];
    const componentSet = new Set(components.map((row) => row.code));

    const runRows = new Map<string, typeof runs[number]>();
    for (const row of runs) {
      const rowIssues: string[] = [];
      if (!row.run_name) rowIssues.push('run_name is required');
      if (!row.year) rowIssues.push('year is required');
      if (!row.month) rowIssues.push('month is required');
      if (!row.period_start) rowIssues.push('period_start is required');
      if (!row.period_end) rowIssues.push('period_end is required');
      if (runRows.has(row.run_name)) rowIssues.push('run_name must be unique');
      const existing = row.year && row.month ? await this.prisma.payrollRun.findFirst({ where: { year: row.year, month: row.month } }) : null;
      if (existing && dto.update_existing !== true) rowIssues.push(`run already exists for ${row.month}/${row.year}`);
      if (existing && existing.status === 'paid') rowIssues.push('existing paid runs cannot be overwritten');
      if (row.paid_from_account) {
        const account = await this.resolveFinanceAccountLookup(this.prisma, row.paid_from_account);
        if (!account) rowIssues.push(`payment account not found: ${row.paid_from_account}`);
      }
      runRows.set(row.run_name, row);
      if (rowIssues.length) issues.push({ sheet: 'Runs', row_number: row.row_number, key: row.run_name || `row-${row.row_number}`, issues: rowIssues });
    }

    for (const row of workers) {
      const rowIssues: string[] = [];
      if (!row.worker_ref) rowIssues.push('worker_ref is required');
      if (!row.full_name) rowIssues.push('full_name is required');
      if (!['employee', 'consultant'].includes(row.worker_type)) rowIssues.push('worker_type must be employee or consultant');
      if (workerRefs.size !== workers.length) {
        const matches = workers.filter((entry) => entry.worker_ref === row.worker_ref);
        if (matches.length > 1) rowIssues.push('worker_ref must be unique');
      }
      if (row.organization) {
        const orgId = await this.resolveOrganizationLookup(this.prisma, row.organization);
        if (!orgId) rowIssues.push(`organization not found: ${row.organization}`);
      }
      if (row.team) {
        const teamId = await this.resolveTeamLookup(this.prisma, row.team);
        if (!teamId) rowIssues.push(`team not found: ${row.team}`);
      }
      if (row.fund) {
        const fundId = await this.resolveFundLookup(this.prisma, row.fund);
        if (!fundId) rowIssues.push(`fund not found: ${row.fund}`);
      }
      if (row.grant) {
        const grantId = await this.resolveGrantLookup(this.prisma, row.grant);
        if (!grantId) rowIssues.push(`grant not found: ${row.grant}`);
      }
      if (row.profile_id && !await this.prisma.profile.findUnique({ where: { id: this.parseBigInt(row.profile_id, 'profile id') } })) {
        rowIssues.push(`profile not found: ${row.profile_id}`);
      }
      if (rowIssues.length) issues.push({ sheet: 'Workers', row_number: row.row_number, key: row.worker_ref || `row-${row.row_number}`, issues: rowIssues });
    }

    for (const row of lines) {
      const rowIssues: string[] = [];
      if (!row.run_name) rowIssues.push('run_name is required');
      if (!row.worker_ref) rowIssues.push('worker_ref is required');
      if (!row.component_code) rowIssues.push('component_code is required');
      if (!Number.isFinite(row.amount)) rowIssues.push('amount must be numeric');
      if (row.run_name && !runNames.has(row.run_name)) rowIssues.push(`unknown run_name: ${row.run_name}`);
      if (row.worker_ref && !workerRefs.has(row.worker_ref)) rowIssues.push(`unknown worker_ref: ${row.worker_ref}`);
      if (row.component_code && !componentSet.has(row.component_code)) rowIssues.push(`unknown component_code: ${row.component_code}`);
      if (rowIssues.length) issues.push({ sheet: 'Lines', row_number: row.row_number, key: `${row.run_name}/${row.worker_ref}`, issues: rowIssues });
    }

    for (const row of allocations) {
      const rowIssues: string[] = [];
      if (!row.run_name) rowIssues.push('run_name is required');
      if (!row.worker_ref) rowIssues.push('worker_ref is required');
      if (row.run_name && !runNames.has(row.run_name)) rowIssues.push(`unknown run_name: ${row.run_name}`);
      if (row.worker_ref && !workerRefs.has(row.worker_ref)) rowIssues.push(`unknown worker_ref: ${row.worker_ref}`);
      if (row.organization) {
        const orgId = await this.resolveOrganizationLookup(this.prisma, row.organization);
        if (!orgId) rowIssues.push(`organization not found: ${row.organization}`);
      }
      if (row.team) {
        const teamId = await this.resolveTeamLookup(this.prisma, row.team);
        if (!teamId) rowIssues.push(`team not found: ${row.team}`);
      }
      if (row.fund) {
        const fundId = await this.resolveFundLookup(this.prisma, row.fund);
        if (!fundId) rowIssues.push(`fund not found: ${row.fund}`);
      }
      if (row.grant) {
        const grantId = await this.resolveGrantLookup(this.prisma, row.grant);
        if (!grantId) rowIssues.push(`grant not found: ${row.grant}`);
      }
      if (row.allocation_percent <= 0) rowIssues.push('allocation_percent must be greater than zero');
      if (rowIssues.length) issues.push({ sheet: 'Allocations', row_number: row.row_number, key: `${row.run_name}/${row.worker_ref}`, issues: rowIssues });
    }

    const allocationTotals = new Map<string, number>();
    for (const row of allocations) {
      const key = `${row.run_name}::${row.worker_ref}`;
      allocationTotals.set(key, (allocationTotals.get(key) || 0) + Number(row.allocation_percent || 0));
    }
    for (const [key, total] of allocationTotals) {
      if (Math.abs(total - 100) > 0.01) {
        issues.push({ sheet: 'Allocations', row_number: 0, key, issues: ['allocation_percent must total 100 for each run and worker'] });
      }
    }

    for (const row of payments) {
      const rowIssues: string[] = [];
      if (!row.run_name) rowIssues.push('run_name is required');
      if (!row.worker_ref) rowIssues.push('worker_ref is required');
      if (row.run_name && !runNames.has(row.run_name)) rowIssues.push(`unknown run_name: ${row.run_name}`);
      if (row.worker_ref && !workerRefs.has(row.worker_ref)) rowIssues.push(`unknown worker_ref: ${row.worker_ref}`);
      if (rowIssues.length) issues.push({ sheet: 'Payments', row_number: row.row_number, key: `${row.run_name}/${row.worker_ref}`, issues: rowIssues });
    }

    const lineGroups = Array.from(
      lines.reduce((map, row) => {
        const key = `${row.run_name}::${row.worker_ref}`;
        const existing = map.get(key) || { run_name: row.run_name, worker_ref: row.worker_ref, lines: [] as typeof lines };
        existing.lines.push(row);
        map.set(key, existing);
        return map;
      }, new Map<string, { run_name: string; worker_ref: string; lines: typeof lines }>())
    ).map(([, value]) => value);

    const allocationsByKey = allocations.reduce((map, row) => {
      const key = `${row.run_name}::${row.worker_ref}`;
      const existing = map.get(key) || [];
      existing.push(row);
      map.set(key, existing);
      return map;
    }, new Map<string, typeof allocations>());

    return {
      summary: {
        runs: runs.length,
        workers: workers.length,
        lines: lines.length,
        allocations: allocations.length,
        payments: payments.length,
        issue_count: issues.reduce((sum, row) => sum + row.issues.length, 0),
        ready: issues.length === 0,
      },
      issues,
      runs,
      workers,
      lines,
      allocations,
      payments,
      lineGroups,
      allocationsByKey,
    };
  }

  private async upsertImportedWorkerTx(tx: Prisma.TransactionClient, row: any) {
    const profileId = row.profile_id ? this.parseBigInt(row.profile_id, 'profile id') : null;
    const organizationId = row.organization ? await this.resolveOrganizationLookup(tx, row.organization) : null;
    const teamId = row.team ? await this.resolveTeamLookup(tx, row.team) : null;
    const fundId = row.fund ? await this.resolveFundLookup(tx, row.fund) : null;
    const grantId = row.grant ? await this.resolveGrantLookup(tx, row.grant) : null;

    const existing =
      (profileId ? await tx.payrollWorker.findFirst({ where: { profileId } }) : null) ||
      (row.staff_code ? await tx.payrollWorker.findFirst({ where: { staffCode: row.staff_code } }) : null) ||
      (row.email ? await tx.payrollWorker.findFirst({ where: { email: row.email, fullName: row.full_name } }) : null);

    const payload = {
      profileId,
      organizationId,
      teamId,
      projectId: row.project_id ? this.parseBigInt(row.project_id, 'project id') : null,
      defaultFundId: fundId,
      defaultGrantId: grantId,
      workerType: row.worker_type || 'employee',
      fullName: row.full_name,
      email: row.email || null,
      staffCode: row.staff_code || null,
      currency: 'NGN',
      status: 'active',
      bankName: row.bank_name || null,
      bankAccountName: row.bank_account_name || null,
      bankAccountNumber: row.bank_account_number || null,
    };

    const worker = existing
      ? await tx.payrollWorker.update({ where: { id: existing.id }, data: payload })
      : await tx.payrollWorker.create({ data: payload });

    if (row.effective_from || Number(row.base_amount || 0) > 0) {
      await tx.payrollWorkerProfile.create({
        data: {
          workerId: worker.id,
          effectiveFrom: new Date(row.effective_from || new Date().toISOString().slice(0, 10)),
          baseAmount: Number(row.base_amount || 0),
          payFrequency: 'monthly',
          paymentMode: 'bank_transfer',
        }
      });
    }

    return worker;
  }

  private async upsertImportedRunTx(tx: Prisma.TransactionClient, row: any, updateExisting: boolean, actorId?: string) {
    const paidFromAccount = row.paid_from_account ? await this.resolveFinanceAccountLookup(tx, row.paid_from_account) : null;
    const existing = await tx.payrollRun.findFirst({ where: { year: row.year, month: row.month }, include: { postings: true } });
    if (existing) {
      if (!updateExisting) return existing;
      if (existing.postings.length > 0 || existing.status === 'paid') {
        throw new BadRequestException(`Payroll run ${row.run_name} cannot be overwritten because it is already posted or paid`);
      }
      await tx.payrollRunItem.deleteMany({ where: { runId: existing.id } });
      return tx.payrollRun.update({
        where: { id: existing.id },
        data: {
          name: row.run_name,
          periodStart: new Date(row.period_start),
          periodEnd: new Date(row.period_end),
          currency: row.currency || 'NGN',
          status: 'draft',
          notes: row.notes || null,
          paidFromAccountId: paidFromAccount?.id || null,
          preparedById: actorId ? toBigInt(actorId) : existing.preparedById,
        }
      });
    }
    return tx.payrollRun.create({
      data: {
        name: row.run_name,
        year: row.year,
        month: row.month,
        periodStart: new Date(row.period_start),
        periodEnd: new Date(row.period_end),
        currency: row.currency || 'NGN',
        status: 'draft',
        notes: row.notes || null,
        paidFromAccountId: paidFromAccount?.id || null,
        preparedById: actorId ? toBigInt(actorId) : null,
      }
    });
  }

  private async createImportedRunItemTx(
    tx: Prisma.TransactionClient,
    runId: string,
    worker: any,
    grouped: { run_name: string; worker_ref: string; lines: any[] },
    allocationRows: any[],
    updateExisting = false
  ) {
    const componentCodes = grouped.lines.map((line) => line.component_code);
    const components = await tx.payrollComponent.findMany({ where: { code: { in: componentCodes } } });
    const componentMap = new Map(components.map((row) => [row.code, row]));

    const typedLines = grouped.lines.map((line) => {
      const component = componentMap.get(line.component_code);
      return {
        componentId: component!.id,
        lineType: component!.componentType,
        amount: new Prisma.Decimal(Number(line.amount || 0)),
        notes: line.notes || null,
      };
    });

    const grossPay = typedLines.filter((line) => line.lineType === 'earning').reduce((sum, line) => sum + Number(line.amount), 0);
    const totalDeductions = typedLines.filter((line) => line.lineType === 'deduction').reduce((sum, line) => sum + Number(line.amount), 0);
    const employerCostTotal = typedLines.filter((line) => line.lineType === 'employer_cost').reduce((sum, line) => sum + Number(line.amount), 0);
    const netPay = grossPay - totalDeductions;

    const existing = await tx.payrollRunItem.findFirst({ where: { runId, workerId: worker.id } });
    let item;
    if (existing) {
      if (!updateExisting) {
        throw new BadRequestException(`Payroll run item already exists for ${grouped.worker_ref}`);
      }
      await tx.payrollRunItemLine.deleteMany({ where: { runItemId: existing.id } });
      await tx.payrollRunItemAllocation.deleteMany({ where: { runItemId: existing.id } });
      item = await tx.payrollRunItem.update({
        where: { id: existing.id },
        data: {
          workerType: worker.workerType,
          organizationId: worker.organizationId,
          teamId: worker.teamId,
          projectId: worker.projectId,
          fundId: worker.defaultFundId,
          grantId: worker.defaultGrantId,
          grossPay,
          totalDeductions,
          employerCostTotal,
          netPay,
        }
      });
    } else {
      item = await tx.payrollRunItem.create({
        data: {
          runId,
          workerId: worker.id,
          workerType: worker.workerType,
          organizationId: worker.organizationId,
          teamId: worker.teamId,
          projectId: worker.projectId,
          fundId: worker.defaultFundId,
          grantId: worker.defaultGrantId,
          grossPay,
          totalDeductions,
          employerCostTotal,
          netPay,
        }
      });
    }

    if (typedLines.length) {
      await tx.payrollRunItemLine.createMany({
        data: typedLines.map((line) => ({
          runItemId: item.id,
          componentId: line.componentId,
          lineType: line.lineType,
          amount: line.amount,
          notes: line.notes,
        }))
      });
    }

    const normalizedAllocations = allocationRows.length
      ? await Promise.all(
          allocationRows.map(async (row: any, index: number) => ({
            organizationId: row.organization ? await this.resolveOrganizationLookup(tx, row.organization) : null,
            teamId: row.team ? await this.resolveTeamLookup(tx, row.team) : null,
            projectId: row.project_id ? this.parseBigInt(row.project_id, 'project id') : null,
            fundId: row.fund ? await this.resolveFundLookup(tx, row.fund) : null,
            grantId: row.grant ? await this.resolveGrantLookup(tx, row.grant) : null,
            allocationPercent: Number(row.allocation_percent || 0),
            sortOrder: index,
          }))
        )
      : [{
          organizationId: worker.organizationId,
          teamId: worker.teamId,
          projectId: worker.projectId,
          fundId: worker.defaultFundId,
          grantId: worker.defaultGrantId,
          allocationPercent: 100,
          sortOrder: 0,
        }];

    await tx.payrollRunItemAllocation.createMany({
      data: normalizedAllocations.map((allocation) => ({
        runItemId: item.id,
        organizationId: allocation.organizationId,
        teamId: allocation.teamId,
        projectId: allocation.projectId,
        fundId: allocation.fundId,
        grantId: allocation.grantId,
        allocationPercent: allocation.allocationPercent,
        sortOrder: allocation.sortOrder,
      }))
    });

    return item;
  }

  private async findImportedWorker(workerRef: string, workers: any[]) {
    const row = workers.find((entry) => entry.worker_ref === workerRef);
    if (!row) return null;
    const profileId = row.profile_id ? this.parseBigInt(row.profile_id, 'profile id') : null;
    return (
      (profileId ? await this.prisma.payrollWorker.findFirst({ where: { profileId } }) : null) ||
      (row.staff_code ? await this.prisma.payrollWorker.findFirst({ where: { staffCode: row.staff_code } }) : null) ||
      (row.email ? await this.prisma.payrollWorker.findFirst({ where: { email: row.email, fullName: row.full_name } }) : null)
    );
  }

  private async findImportedItem(
    key: string,
    analysis: Awaited<ReturnType<PayrollService['analyzeImport']>>,
    workerMap: Map<string, any>,
    runMap: Map<string, any>
  ) {
    const [runName, workerRef] = key.split('::');
    const run = runMap.get(runName) || await this.prisma.payrollRun.findFirst({ where: { name: runName } });
    const worker = workerMap.get(workerRef) || await this.findImportedWorker(workerRef, analysis.workers);
    if (!run || !worker) return null;
    const item = await this.prisma.payrollRunItem.findFirst({ where: { runId: run.id, workerId: worker.id } });
    return item ? { itemId: item.id, runId: run.id } : null;
  }

  private async resolveOrganizationLookup(client: Prisma.TransactionClient | PrismaService, value: string) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const exact = await client.organization.findUnique({ where: { id: BigInt(trimmed) } });
      if (exact) return exact.id;
    }
    const match = await client.organization.findFirst({ where: { OR: [{ name: { equals: trimmed, mode: 'insensitive' } }, { code: { equals: trimmed, mode: 'insensitive' } }] } });
    return match?.id ?? null;
  }

  private async resolveTeamLookup(client: Prisma.TransactionClient | PrismaService, value: string) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const exact = await client.group.findUnique({ where: { id: BigInt(trimmed) } });
      if (exact) return exact.id;
    }
    const match = await client.group.findFirst({ where: { name: { equals: trimmed, mode: 'insensitive' } } });
    return match?.id ?? null;
  }

  private async resolveFundLookup(client: Prisma.TransactionClient | PrismaService, value: string) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    const match = await client.financeFund.findFirst({
      where: {
        OR: [{ id: trimmed }, { name: { equals: trimmed, mode: 'insensitive' } }, { code: { equals: trimmed, mode: 'insensitive' } }]
      }
    });
    return match?.id ?? null;
  }

  private async resolveGrantLookup(client: Prisma.TransactionClient | PrismaService, value: string) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    const match = await client.financeGrant.findFirst({
      where: {
        OR: [{ id: trimmed }, { name: { equals: trimmed, mode: 'insensitive' } }, { code: { equals: trimmed, mode: 'insensitive' } }]
      }
    });
    return match?.id ?? null;
  }

  private async resolveFinanceAccountLookup(client: Prisma.TransactionClient | PrismaService, value: string) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return null;
    const match = await client.financeAccount.findFirst({
      where: {
        OR: [{ id: trimmed }, { name: { equals: trimmed, mode: 'insensitive' } }, { code: { equals: trimmed, mode: 'insensitive' } }]
      }
    });
    return match;
  }

  private formatCurrency(amount: number, currency: string) {
    return `${currency} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private safeFileName(value: string) {
    return String(value || 'document').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'document';
  }

  private appendRunNote(existing: string | null | undefined, action: string, note?: string, actorId?: string) {
    const stamp = new Date().toISOString();
    const line = `[${stamp}] ${action}${actorId ? ` by ${actorId}` : ''}${note ? `: ${note}` : ''}`;
    return [existing, line].filter(Boolean).join('\n');
  }

  private async notifyRunStakeholders(
    runId: string,
    input: {
      actorId?: string;
      type: string;
      title: string;
      message: string;
      onlyPreparedBy?: boolean;
      category?: string;
      link?: string;
      data?: Record<string, any>;
      includePermissionRecipients?: string[];
      includeRoleRecipients?: string[];
    }
  ) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        name: true,
        preparedById: true,
        reviewedById: true,
        approvedById: true,
      }
    });
    if (!run) return;

    const actor = input.actorId ? toBigInt(input.actorId) : null;
    const recipients = new Set<string>();
    if (run.preparedById) recipients.add(run.preparedById.toString());
    if (!input.onlyPreparedBy) {
      if (run.reviewedById) recipients.add(run.reviewedById.toString());
      if (run.approvedById) recipients.add(run.approvedById.toString());
    }
    if (actor) recipients.delete(actor.toString());

    await Promise.all(
      Array.from(recipients).map((userId) =>
        this.createPayrollNotification(userId, input.category || 'run_updates', {
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link || `/finance/payroll/runs/${run.id}`,
          notifiableType: 'payroll_run',
          data: {
            run_id: run.id,
            run_name: run.name,
            ...(input.data || {}),
          } as Prisma.InputJsonValue,
        })
      )
    );
  }

  private async createPayrollNotification(
    userId: string,
    category: string,
    input: {
      type: string;
      title: string;
      message: string;
      link?: string;
      notifiableType?: string;
      data?: Prisma.InputJsonValue;
    }
  ) {
    const sentVia = await this.resolveNotificationChannels(userId, category);
    if (!sentVia.length) return null;
    return this.notificationsService.create({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      notifiableType: input.notifiableType,
      data: input.data,
      sentVia,
    });
  }

  private async resolveNotificationChannels(userId: string, category: string) {
    const row = await this.prisma.payrollNotificationPreference.findUnique({
      where: { userId: toBigInt(userId) }
    });
    const config = this.normalizeNotificationPreferenceConfig((row?.config || {}) as Record<string, any>);
    const categoryConfig = config[category] || { in_app: true, email: false };
    const sentVia: string[] = [];
    if (categoryConfig.in_app !== false) sentVia.push('in-app');
    if (categoryConfig.email === true) sentVia.push('email');
    return sentVia;
  }

  private normalizeNotificationPreferenceConfig(payload: Record<string, any>) {
    const base = {
      run_updates: { in_app: true, email: false },
      approvals: { in_app: true, email: false },
      payments: { in_app: true, email: false },
      delivery_issues: { in_app: true, email: false },
      import_issues: { in_app: true, email: false },
      payslips: { in_app: true, email: false },
    } as Record<string, { in_app: boolean; email: boolean }>;

    for (const key of Object.keys(base)) {
      const row = payload?.[key] || {};
      base[key] = {
        in_app: row.in_app !== false,
        email: row.email === true,
      };
    }
    return base;
  }

  private serializeNotificationPreferences(row: any) {
    return {
      config: this.normalizeNotificationPreferenceConfig((row?.config || {}) as Record<string, any>),
      updated_at: row?.updatedAt || null,
    };
  }

  private async recordRunEvent(
    runId: string,
    eventType: string,
    actorId?: string,
    note?: string,
    metadata?: Record<string, any>
  ) {
    await this.prisma.payrollRunEvent.create({
      data: {
        runId,
        actorId: actorId ? toBigInt(actorId) : null,
        eventType,
        note: note || null,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      }
    });
  }

  private async recordRunEventTx(
    tx: Prisma.TransactionClient,
    runId: string,
    eventType: string,
    actorId?: string,
    note?: string,
    metadata?: Record<string, any>
  ) {
    await tx.payrollRunEvent.create({
      data: {
        runId,
        actorId: actorId ? toBigInt(actorId) : null,
        eventType,
        note: note || null,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      }
    });
  }

  private serializeImportJobSummary(row: any) {
    return {
      id: row.id,
      file_name: row.fileName,
      status: row.status,
      update_existing: row.updateExisting,
      summary: row.summary || null,
      row_count: row._count?.rows ?? 0,
      created_at: row.createdAt,
      completed_at: row.completedAt,
      uploaded_by: row.uploadedByUser
        ? { id: String(row.uploadedByUser.id), name: [row.uploadedByUser.firstName, row.uploadedByUser.lastName].filter(Boolean).join(' ') || row.uploadedByUser.email, email: row.uploadedByUser.email }
        : null,
      retried_by: row.retriedByUser
        ? { id: String(row.retriedByUser.id), name: [row.retriedByUser.firstName, row.retriedByUser.lastName].filter(Boolean).join(' ') || row.retriedByUser.email, email: row.retriedByUser.email }
        : null,
      retry_of_job: row.retryOfJob ? { id: row.retryOfJob.id, file_name: row.retryOfJob.fileName } : null,
    };
  }

  private serializeImportJob(row: any) {
    return {
      ...this.serializeImportJobSummary(row),
      rows: (row.rows || []).map((jobRow: any) => ({
        id: jobRow.id,
        sheet_name: jobRow.sheetName,
        row_number: jobRow.rowNumber,
        row_key: jobRow.rowKey,
        action: jobRow.action,
        status: jobRow.status,
        error_message: jobRow.errorMessage,
        payload: jobRow.payload,
        linked_run_id: jobRow.linkedRunId,
        linked_run_item_id: jobRow.linkedRunItemId,
        created_at: jobRow.createdAt,
      }))
    };
  }

  private parseBigInt(value: string | number | bigint, label: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}
