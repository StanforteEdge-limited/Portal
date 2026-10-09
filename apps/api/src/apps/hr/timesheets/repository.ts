import type { UpsertTimesheetEntry } from '@stanforte/contract';
import Decimal from 'decimal.js';
import type { SQL } from 'drizzle-orm';
import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { DbService } from '$core/db';
import { TenantContextService } from '$core/auth/tenant-context.service';
import { paginatedResponse } from '$core/pagination';
import { BadRequestException, NotFoundException } from '$core/errors';
import { toBigInt } from '$core/utils';
import { projectTimesheetEntry } from './model';
import { workLog, workItem } from '$apps/hr/tasks/model';
import { payrollComponent, payrollRun, payrollRunTimesheetAllocation, payrollWorker } from '$apps/hr/payroll/model';
import { organization } from '$apps/hr/organizations/model';
import { financeFund, financeGrant } from '$apps/finance/accounting/model';

const LOCKED_RUN_STATUSES = ['approved', 'authorized', 'paid', 'closed'];

/**
 * Owns timesheet entries (`sta_project_timesheet_entries`).
 *
 * Two producers feed this module:
 *  - `$apps/hr/tasks` syncs an approved work log into an entry and calls
 *    `syncFromWorkLog`.
 *  - HR keys entries up by hand through the `/v1/timesheets` routes.
 *
 * On every approval the month is re-projected into the open payroll run's
 * `payrollRunTimesheetAllocation` rows. Payroll reads those rows when it
 * generates a run, but does not own this table.
 */
export class TimesheetsService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /* -------------------------------------------------------------------- */
  /* Work log sync                                                         */
  /* -------------------------------------------------------------------- */

  /**
   * Mirrors a work log onto a timesheet entry keyed by `sourceWorkLogId`, then
   * re-projects the worker's month into the open payroll run. A no-op when the
   * staff member has no active payroll worker.
   */
  async syncFromWorkLog(workLogId: string, status: 'submitted' | 'approved' | 'rejected', actorId?: bigint) {
    const tid = this.tenantContext.requireTenantId();
    const [log] = await this.db.client.select().from(workLog).where(eq(workLog.id, workLogId)).limit(1);
    if (!log) return null;

    const [item] = await this.db.client.select().from(workItem).where(eq(workItem.id, log.workItemId)).limit(1);
    if (!item) return null;

    const [worker] = await this.db.client
      .select()
      .from(payrollWorker)
      .where(and(eq(payrollWorker.profileId, log.staffId), eq(payrollWorker.status, 'active'), eq(payrollWorker.tenantId, tid)))
      .orderBy(desc(payrollWorker.createdAt))
      .limit(1);
    if (!worker) return null;

    const payload = {
      sourceWorkLogId: log.id,
      workerId: worker.id,
      organizationId: log.organizationId ?? item.organizationId ?? worker.organizationId ?? null,
      teamId: log.teamId ?? item.ownerTeamId ?? worker.teamId ?? null,
      projectId: log.projectId ?? item.projectId ?? worker.projectId ?? null,
      fundId: log.fundId ?? item.fundId ?? worker.defaultFundId ?? null,
      grantId: log.grantId ?? item.grantId ?? worker.defaultGrantId ?? null,
      workDate: log.logDate,
      hours: log.hoursSpent,
      description: log.note || item.title,
      status,
      approvedBy: status === 'approved' ? actorId ?? null : null,
      approvedAt: status === 'approved' ? new Date() : null,
      createdBy: log.staffId,
    };

    const [existing] = await this.db.client
      .select()
      .from(projectTimesheetEntry)
      .where(eq(projectTimesheetEntry.sourceWorkLogId, log.id))
      .limit(1);

    const entry = existing
      ? await this.db.client
          .update(projectTimesheetEntry)
          .set({
            workerId: payload.workerId,
            organizationId: payload.organizationId,
            teamId: payload.teamId,
            projectId: payload.projectId,
            fundId: payload.fundId,
            grantId: payload.grantId,
            workDate: payload.workDate,
            hours: payload.hours,
            description: payload.description,
            status: payload.status,
            approvedBy: payload.approvedBy,
            approvedAt: payload.approvedAt,
          })
          .where(eq(projectTimesheetEntry.id, existing.id))
          .returning()
          .then((rows) => rows[0] ?? null)
      : await this.db.client.insert(projectTimesheetEntry).values(payload).returning().then((rows) => rows[0] ?? null);

    await this.syncApprovedEntriesToPayrollRun(worker.id, log.logDate);
    return entry;
  }

  /**
   * Rewrites the worker's `payrollRunTimesheetAllocation` rows for the month
   * that `workDate` falls in, from every approved entry in that month. Skips
   * runs that have already been locked for payment.
   */
  async syncApprovedEntriesToPayrollRun(workerId: string, workDate: Date) {
    const month = workDate.getUTCMonth() + 1;
    const year = workDate.getUTCFullYear();
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));
    const run = await this.findOpenRun(year, month);
    if (!run) return null;

    const approvedRows = await this.db.client
      .select()
      .from(projectTimesheetEntry)
      .where(and(
        eq(projectTimesheetEntry.workerId, workerId),
        eq(projectTimesheetEntry.status, 'approved'),
        gte(projectTimesheetEntry.workDate, periodStart),
        lte(projectTimesheetEntry.workDate, periodEnd),
      ))
      .orderBy(asc(projectTimesheetEntry.workDate), asc(projectTimesheetEntry.createdAt));

    const totalHours = approvedRows.reduce((sum, row) => sum + Number(row.hours || 0), 0);
    await this.db.client.transaction(async (tx) => {
      await tx
        .delete(payrollRunTimesheetAllocation)
        .where(and(eq(payrollRunTimesheetAllocation.runId, run.id), eq(payrollRunTimesheetAllocation.workerId, workerId)));
      if (approvedRows.length) {
        await tx.insert(payrollRunTimesheetAllocation).values(
          approvedRows.map((row, index) => ({
            runId: run.id,
            workerId,
            organizationId: row.organizationId,
            teamId: row.teamId,
            projectId: row.projectId,
            fundId: row.fundId,
            grantId: row.grantId,
            hours: String(row.hours ?? 0),
            allocationPercent: String(totalHours > 0 ? (Number(row.hours || 0) / totalHours) * 100 : 0),
            source: 'timesheet' as const,
            notes: row.description,
            sortOrder: index,
            approvedAt: row.approvedAt ?? new Date(),
          })),
        );
        await tx
          .update(projectTimesheetEntry)
          .set({ syncedRunId: run.id })
          .where(inArray(projectTimesheetEntry.id, approvedRows.map((row) => row.id)));
      }
    });
    return run.id;
  }

  /* -------------------------------------------------------------------- */
  /* Self service                                                          */
  /* -------------------------------------------------------------------- */

  async listMyEntries(userId: string, query: Record<string, any> = {}) {
    const worker = await this.resolveWorkerForUser(userId);
    return this.listEntries({ ...query, worker_id: worker.id });
  }

  async createMyEntry(userId: string, dto: UpsertTimesheetEntry) {
    const worker = await this.resolveWorkerForUser(userId);
    return this.createEntry({ ...dto, worker_id: worker.id }, userId);
  }

  async updateMyEntry(userId: string, id: string, dto: UpsertTimesheetEntry) {
    const worker = await this.resolveWorkerForUser(userId);
    const row = await this.requireOwnedEntry(worker.id, id, 'edited');
    // A self-service edit never moves the entry through the approval workflow.
    return this.updateEntry(id, { ...dto, worker_id: worker.id }, userId, row.status);
  }

  async submitMyEntry(userId: string, id: string) {
    const worker = await this.resolveWorkerForUser(userId);
    await this.requireOwnedEntry(worker.id, id, 'submitted');
    return this.submitEntry(id);
  }

  /* -------------------------------------------------------------------- */
  /* Admin                                                                  */
  /* -------------------------------------------------------------------- */

  async listEntries(query: Record<string, any> = {}) {
    const rows = await this.db.client.select().from(projectTimesheetEntry)
      .where(this.combine(
        query.worker_id ? eq(projectTimesheetEntry.workerId, String(query.worker_id)) : undefined,
        query.status ? eq(projectTimesheetEntry.status, String(query.status)) : undefined,
        query.project_id ? eq(projectTimesheetEntry.projectId, this.parseBigInt(String(query.project_id), 'project id')) : undefined,
        query.from ? gte(projectTimesheetEntry.workDate, new Date(String(query.from))) : undefined,
        query.to ? lte(projectTimesheetEntry.workDate, new Date(String(query.to))) : undefined,
      ))
      .orderBy(desc(projectTimesheetEntry.workDate), desc(projectTimesheetEntry.createdAt));
    const hydrated = await Promise.all(rows.map((row) => this.hydrate(row)));
    const items = hydrated.map((row) => this.serialize(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async createEntry(dto: UpsertTimesheetEntry, actorId?: string) {
    const created = await this.db.client
      .insert(projectTimesheetEntry)
      .values(this.mapDto(dto, actorId))
      .returning()
      .then((r) => r[0]);
    return this.serialize(await this.hydrate(created));
  }

  /**
   * `statusOverride` pins the lifecycle state. Callers that leave it off keep
   * the stored status rather than resetting to `draft`, so editing an approved
   * entry cannot quietly withdraw it from the payroll run.
   */
  async updateEntry(id: string, dto: UpsertTimesheetEntry, actorId?: string, statusOverride?: string) {
    const [existing] = await this.db.client.select().from(projectTimesheetEntry).where(eq(projectTimesheetEntry.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Timesheet entry not found');
    const updated = await this.db.client
      .update(projectTimesheetEntry)
      .set(this.mapDto(dto, actorId, { preserveCreator: true, status: statusOverride ?? dto.status ?? existing.status }))
      .where(eq(projectTimesheetEntry.id, id))
      .returning()
      .then((r) => r[0]);
    if (updated.status === 'approved') await this.syncApprovedEntriesToPayrollRun(updated.workerId, updated.workDate);
    return this.serialize(await this.hydrate(updated));
  }

  async submitEntry(id: string) {
    const updated = await this.db.client
      .update(projectTimesheetEntry)
      .set({ status: 'submitted' })
      .where(eq(projectTimesheetEntry.id, id))
      .returning()
      .then((r) => r[0]);
    if (!updated) throw new NotFoundException('Timesheet entry not found');
    return this.serialize(await this.hydrate(updated));
  }

  async approveEntry(id: string, actorId?: string) {
    const updated = await this.db.client
      .update(projectTimesheetEntry)
      .set({ status: 'approved', approvedBy: actorId ? toBigInt(actorId) : null, approvedAt: new Date() })
      .where(eq(projectTimesheetEntry.id, id))
      .returning()
      .then((r) => r[0]);
    if (!updated) throw new NotFoundException('Timesheet entry not found');
    await this.syncApprovedEntriesToPayrollRun(updated.workerId, updated.workDate);
    return this.serialize(await this.hydrate(updated));
  }

  async rejectEntry(id: string) {
    const [existing] = await this.db.client.select().from(projectTimesheetEntry).where(eq(projectTimesheetEntry.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Timesheet entry not found');
    const updated = await this.db.client
      .update(projectTimesheetEntry)
      .set({ status: 'rejected' })
      .where(eq(projectTimesheetEntry.id, id))
      .returning()
      .then((r) => r[0]);
    await this.syncApprovedEntriesToPayrollRun(updated.workerId, updated.workDate);
    return this.serialize(await this.hydrate(updated));
  }

  /* -------------------------------------------------------------------- */
  /* Internals                                                              */
  /* -------------------------------------------------------------------- */

  private async findOpenRun(year: number, month: number) {
    const rows = await this.db.client
      .select()
      .from(payrollRun)
      .where(and(eq(payrollRun.year, year), eq(payrollRun.month, month), this.tenantCond(payrollRun.tenantId)))
      .orderBy(desc(payrollRun.createdAt))
      .limit(1);
    const run = rows[0] ?? null;
    if (!run) return null;
    if (LOCKED_RUN_STATUSES.includes(run.status)) return null;
    return run;
  }

  /** Guards ownership and that the entry is still in an editable state. */
  private async requireOwnedEntry(workerId: string, id: string, verb: string) {
    const [row] = await this.db.client.select().from(projectTimesheetEntry).where(eq(projectTimesheetEntry.id, id)).limit(1);
    if (!row || row.workerId !== workerId) throw new NotFoundException('Timesheet entry not found');
    if (row.status !== 'draft' && row.status !== 'rejected') {
      throw new BadRequestException(`Only draft or rejected timesheets can be ${verb}`);
    }
    return row;
  }

  private async resolveWorkerForUser(userId: string) {
    const worker = await this.db.client
      .select({ id: payrollWorker.id, fullName: payrollWorker.fullName, workerType: payrollWorker.workerType })
      .from(payrollWorker)
      .where(eq(payrollWorker.profileId, toBigInt(userId)))
      .limit(1)
      .then((r) => r[0]);
    if (!worker) throw new NotFoundException('Payroll worker profile not found for this user');
    return worker;
  }

  private async hydrate(row: any): Promise<any> {
    if (!row) return row;
    const [workerRow, componentRow, organizationRow, fundRow, grantRow, runRow] = await Promise.all([
      row.workerId
        ? this.db.client.select({ id: payrollWorker.id, fullName: payrollWorker.fullName, workerType: payrollWorker.workerType, email: payrollWorker.email }).from(payrollWorker).where(eq(payrollWorker.id, row.workerId)).limit(1).then((r) => r[0])
        : Promise.resolve(null),
      row.componentId
        ? this.db.client.select({ id: payrollComponent.id, code: payrollComponent.code, name: payrollComponent.name }).from(payrollComponent).where(eq(payrollComponent.id, row.componentId)).limit(1).then((r) => r[0])
        : Promise.resolve(null),
      row.organizationId
        ? this.db.client.select({ id: organization.id, name: organization.name }).from(organization).where(eq(organization.id, row.organizationId)).limit(1).then((r) => r[0])
        : Promise.resolve(null),
      row.fundId
        ? this.db.client.select({ id: financeFund.id, code: financeFund.code, name: financeFund.name }).from(financeFund).where(eq(financeFund.id, row.fundId)).limit(1).then((r) => r[0])
        : Promise.resolve(null),
      row.grantId
        ? this.db.client.select({ id: financeGrant.id, code: financeGrant.code, name: financeGrant.name }).from(financeGrant).where(eq(financeGrant.id, row.grantId)).limit(1).then((r) => r[0])
        : Promise.resolve(null),
      row.syncedRunId
        ? this.db.client.select({ id: payrollRun.id, name: payrollRun.name, year: payrollRun.year, month: payrollRun.month, status: payrollRun.status }).from(payrollRun).where(eq(payrollRun.id, row.syncedRunId)).limit(1).then((r) => r[0])
        : Promise.resolve(null),
    ]);
    return { ...row, worker: workerRow, component: componentRow, organization: organizationRow, fund: fundRow, grant: grantRow, syncedRun: runRow };
  }

  private serialize(row: any) {
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

  private mapDto(
    dto: UpsertTimesheetEntry,
    actorId?: string,
    options: { preserveCreator?: boolean; status?: string } = {},
  ) {
    return {
      workerId: dto.worker_id,
      componentId: dto.component_id || null,
      organizationId: dto.organization_id ? this.parseBigInt(dto.organization_id, 'organization id') : null,
      teamId: dto.team_id ? this.parseBigInt(dto.team_id, 'team id') : null,
      projectId: dto.project_id ? this.parseBigInt(dto.project_id, 'project id') : null,
      fundId: dto.fund_id || null,
      grantId: dto.grant_id || null,
      workDate: new Date(dto.work_date),
      hours: this.toScaleOrZero(dto.hours),
      description: dto.description || null,
      status: options.status || 'draft',
      createdBy: options.preserveCreator ? undefined : (actorId ? toBigInt(actorId) : undefined),
    };
  }

  private toScaleOrZero(value: string | number | Decimal | null | undefined): string {
    if (value === null || value === undefined) return '0';
    return value instanceof Decimal ? value.toString() : String(value);
  }

  private tenantCond(column: any): SQL | undefined {
    const tid = this.tenantContext.currentTenantId();
    return tid ? eq(column, tid) : undefined;
  }

  private combine(...conds: Array<SQL | undefined>): SQL | undefined {
    const present = conds.filter((c): c is SQL => c !== undefined);
    return present.length ? and(...present) : undefined;
  }

  private parseBigInt(value: string | number | bigint, label: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}
