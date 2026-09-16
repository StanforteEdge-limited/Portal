import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { SQL, and, asc, count, desc, eq, exists, gte, ilike, inArray, isNull, like, lt, lte, or, sql } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { toBigInt } from '$common/utils/ids';
import { UpsertDeductionTypeDto } from '$modules/finance/finance/dto/upsert-deduction-type.dto';
import { ApplyPVDeductionsDto } from '$modules/finance/finance/dto/apply-pv-deductions.dto';
import { CreateWHTRemittanceDto } from '$modules/finance/finance/dto/create-wht-remittance.dto';
import { RequestRemittancesQueryDto, StatutoryDeductionsQueryDto, RemitStatutoryDeductionsDto } from '$modules/finance/finance/dto/statutory-deductions.dto';
import { PdfService } from '$common/pdf/pdf.service';
import { fileAsset } from '$modules/storage/model';
import { profile } from '$modules/identity/users/model';
import { requestInstance } from '$modules/requests/requests/model';
import {
  financeAccount,
  financeChartAccount,
  financeContact,
  financeDeductionType,
  financePaymentVoucher,
  financePVDeduction,
  financeRequestDeduction,
  financeRequestDeductionRemittanceAllocation,
  financeRequestRemittance,
  financeSetting,
  financeVendorWHTAccrual,
  financeWHTRemittance,
} from './model';

@Injectable()
export class DeductionService {
  private readonly logger = new Logger(DeductionService.name);

  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
    private readonly pdfService: PdfService,
  ) {}

private sumAllocatedAmount(allocations: Array<{ allocatedAmount: Decimal | number | string }>): number {
    return allocations.reduce((sum, allocation) => sum + Number(allocation.allocatedAmount ?? 0), 0);
  }

  private deriveDeductionStatus(amount: number, allocatedAmount: number): 'pending' | 'partially_remitted' | 'remitted' {
    if (allocatedAmount <= 0) return 'pending';
    if (allocatedAmount + 0.0001 >= amount) return 'remitted';
    return 'partially_remitted';
  }

  private formatProfileName(user?: { firstName?: string | null; lastName?: string | null; email?: string | null; username?: string | null; id?: bigint | number | string | null } | null) {
    if (!user) return null;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || '';
    return {
      id: user.id != null ? String(user.id) : '',
      name,
    };
  }

  private async fetchProfileRows(ids: Array<bigint | null | undefined>): Promise<Map<string, any>> {
    const profileIds = Array.from(new Set(ids.filter((id): id is bigint => id != null)));
    if (profileIds.length === 0) return new Map();
    const rows = await this.db.client
      .select({ id: profile.id, firstName: profile.firstName, lastName: profile.lastName, email: profile.email, username: profile.username })
      .from(profile)
      .where(inArray(profile.id, profileIds));
    return new Map(rows.map((row) => [row.id.toString(), row]));
  }

  private async fileAssetsByIds(ids: Array<string | null | undefined>): Promise<any[]> {
    const fileIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
    if (fileIds.length === 0) return [];
    const tid = this.tenantContext.currentTenantId();
    return this.db.client
      .select()
      .from(fileAsset)
      .where(and(inArray(fileAsset.id, fileIds), tid ? eq(fileAsset.tenantId, tid) : undefined));
  }

  private async fetchPaymentVouchers(voucherIds: Array<string | null | undefined>): Promise<Map<string, any>> {
    const ids = Array.from(new Set(voucherIds.filter((id): id is string => Boolean(id))));
    if (ids.length === 0) return new Map();
    const rows = await this.db.client
      .select({
        id: financePaymentVoucher.id,
        voucherNumber: financePaymentVoucher.voucherNumber,
        createdAt: financePaymentVoucher.createdAt,
        disbursedAt: financePaymentVoucher.disbursedAt,
      })
      .from(financePaymentVoucher)
      .where(inArray(financePaymentVoucher.id, ids));
    return new Map(rows.map((row) => [row.id, row]));
  }

  private async fetchFinanceAccounts(accountIds: Array<string | null | undefined>): Promise<Map<string, any>> {
    const ids = Array.from(new Set(accountIds.filter((id): id is string => Boolean(id))));
    if (ids.length === 0) return new Map();
    const tid = this.tenantContext.currentTenantId();
    const rows = await this.db.client
      .select({
        id: financeAccount.id,
        name: financeAccount.name,
        bankName: financeAccount.bankName,
        accountNumber: financeAccount.accountNumber,
      })
      .from(financeAccount)
      .where(and(inArray(financeAccount.id, ids), tid ? eq(financeAccount.tenantId, tid) : undefined));
    return new Map(rows.map((row) => [row.id, row]));
  }

  private async nextRequestRemittanceNumber(remittedAt: Date) {
    const year = remittedAt.getFullYear();
    const [countRow] = await this.db.client
      .select({ value: count() })
      .from(financeRequestRemittance)
      .where(
        and(
          gte(financeRequestRemittance.createdAt, new Date(year, 0, 1)),
          lt(financeRequestRemittance.createdAt, new Date(year + 1, 0, 1)),
        ),
      );
    const countValue = Number(countRow?.value ?? 0);
    return `TRM/${year}/${String(countValue + 500).padStart(3, '0')}`;
  }

  private async hydrateEvidenceFiles(fileIds: unknown) {
    const ids = Array.isArray(fileIds) ? fileIds.map(String) : [];
    if (ids.length === 0) return [];
    const files = await this.fileAssetsByIds(ids);
    const fileMap = new Map(files.map((file) => [file.id, file]));
    return ids
      .map((id) => fileMap.get(id))
      .filter(Boolean)
      .map((file: any) => ({ id: file.id, file_name: file.fileName, public_url: file.publicUrl ?? null }));
  }

  private async fillDeductionRels(deductions: any[], opts: { allocations?: 'none' | 'shallow' | 'deep'; request?: 'minimal' | 'list' | 'pdf'; createdByUser?: boolean; deductionType?: 'basic' | 'full' } = {}) {
    if (deductions.length === 0) return;
    const deductionIds = deductions.map((d) => d.id);
    const tid = this.tenantContext.currentTenantId();

    const [typeRows, requestRows, profileRows, pvDeductionRows]: [any[], any[], Map<string, any>, any[]] = await Promise.all([
      this.db.client.select().from(financeDeductionType).where(inArray(financeDeductionType.id, deductionIds)),
      this.db.client
        .select({ id: requestInstance.id, createdBy: requestInstance.createdBy, status: requestInstance.status, data: requestInstance.data, createdAt: requestInstance.createdAt })
        .from(requestInstance)
        .where(
          and(
            inArray(requestInstance.id, Array.from(new Set(deductions.map((d) => d.requestId)))),
            tid ? eq(requestInstance.tenantId, tid) : undefined,
          ),
        ),
      opts.createdByUser
        ? this.fetchProfileRows(deductions.map((d) => d.createdBy))
        : Promise.resolve(new Map<string, any>()),
      this.db.client.select().from(financePVDeduction).where(inArray(financePVDeduction.requestDeductionId, deductionIds)),
    ]);

    let requestCreatorMap = new Map<string, any>();
    if (opts.request === 'pdf') {
      requestCreatorMap = await this.fetchProfileRows(requestRows.map((r) => r.createdBy));
    }

    const typeMap = new Map(typeRows.map((row) => [row.id, row]));
    const requestMap = new Map(requestRows.map((row) => [row.id, row]));
    const pvdByRequest = new Map(pvDeductionRows.map((row) => [row.requestDeductionId, row]));

    const voucherMap = await this.fetchPaymentVouchers(pvDeductionRows.map((row) => row.paymentVoucherId));
    for (const pvd of pvDeductionRows) {
      pvd.paymentVoucher = voucherMap.get(pvd.paymentVoucherId) ?? null;
    }

    for (const deduction of deductions) {
      const type = typeMap.get(deduction.deductionTypeId);
      deduction.deductionType = opts.deductionType === 'full' ? (type ?? null) : (type ? { id: type.id, name: type.name, code: type.code } : null);

      const requestRow = requestMap.get(deduction.requestId);
      if (requestRow && opts.request === 'minimal') {
        deduction.request = { id: requestRow.id, data: requestRow.data };
      } else if (requestRow && opts.request === 'list') {
        deduction.request = { id: requestRow.id, createdAt: requestRow.createdAt, status: requestRow.status, data: requestRow.data };
      } else if (requestRow && opts.request === 'pdf') {
        deduction.request = {
          id: requestRow.id,
          status: requestRow.status,
          data: requestRow.data,
          createdAt: requestRow.createdAt,
          creator: requestCreatorMap.get(requestRow.createdBy?.toString() ?? '') ?? null,
        };
      } else {
        deduction.request = requestRow ?? null;
      }

      deduction.createdByUser = opts.createdByUser
        ? (() => {
            const p = profileRows.get(deduction.createdBy?.toString() ?? '');
            return p ? { id: p.id, firstName: p.firstName, lastName: p.lastName } : null;
          })()
        : null;

      deduction.pvDeduction = pvdByRequest.get(deduction.id) ?? null;
    }

    if (opts.allocations && opts.allocations !== 'none') {
      const allocRows = await this.db.client
        .select()
        .from(financeRequestDeductionRemittanceAllocation)
        .where(inArray(financeRequestDeductionRemittanceAllocation.requestDeductionId, deductionIds))
        .orderBy(desc(financeRequestDeductionRemittanceAllocation.createdAt));

      if (opts.allocations === 'shallow') {
        const byDeduction = new Map<string, any[]>();
        for (const alloc of allocRows) {
          const list = byDeduction.get(alloc.requestDeductionId) ?? [];
          list.push({ id: alloc.id, allocatedAmount: alloc.allocatedAmount });
          byDeduction.set(alloc.requestDeductionId, list);
        }
        for (const deduction of deductions) {
          deduction.remittanceAllocations = byDeduction.get(deduction.id) ?? [];
        }
      } else {
        const remittanceIds = Array.from(new Set(allocRows.map((a) => a.requestRemittanceId)));
        const remittanceRows = remittanceIds.length
          ? await this.db.client.select().from(financeRequestRemittance).where(inArray(financeRequestRemittance.id, remittanceIds))
          : [];
        await this.fillRemittanceRels(remittanceRows);
        const remMap = new Map(remittanceRows.map((r) => [r.id, r]));
        const byDeduction = new Map<string, any[]>();
        for (const alloc of allocRows) {
          const withRemittance = { ...alloc, requestRemittance: remMap.get(alloc.requestRemittanceId) ?? null };
          const list = byDeduction.get(alloc.requestDeductionId) ?? [];
          list.push(withRemittance);
          byDeduction.set(alloc.requestDeductionId, list);
        }
        for (const deduction of deductions) {
          deduction.remittanceAllocations = byDeduction.get(deduction.id) ?? [];
        }
      }
    }
  }

  private async fillRemittanceRels(remittances: any[], opts: { deductions?: 'map' | 'pdf' } = {}) {
    if (remittances.length === 0) return remittances;
    const remittanceIds = remittances.map((r) => r.id);

    const [voucherMap, remitterMap, creatorMap, accountMap, allocRows]: [
      Map<string, any>,
      Map<string, any>,
      Map<string, any>,
      Map<string, any>,
      any[],
    ] = await Promise.all([
      this.fetchPaymentVouchers(remittances.map((r) => r.paymentVoucherId)),
      this.fetchProfileRows(remittances.map((r) => r.remittedBy)),
      this.fetchProfileRows(remittances.map((r) => r.createdBy)),
      this.fetchFinanceAccounts(remittances.map((r) => r.paidFromAccountId)),
      opts.deductions
        ? this.db.client
            .select()
            .from(financeRequestDeductionRemittanceAllocation)
            .where(inArray(financeRequestDeductionRemittanceAllocation.requestRemittanceId, remittanceIds))
            .orderBy(asc(financeRequestDeductionRemittanceAllocation.createdAt))
        : Promise.resolve([] as any[]),
    ]);
    const fileRows = await this.fileAssetsByIds(remittances.map((r) => r.evidenceFileId));
    const evidenceMap = new Map(fileRows.map((file: any) => [file.id, file]));

    for (const rem of remittances) {
      rem.paymentVoucher = voucherMap.get(rem.paymentVoucherId) ?? null;
      rem.remittedByUser = rem.remittedBy != null ? (remitterMap.get(rem.remittedBy.toString()) ?? null) : null;
      rem.createdByUser = rem.createdBy != null ? (creatorMap.get(rem.createdBy.toString()) ?? null) : null;
      rem.paidFromAccount = accountMap.get(rem.paidFromAccountId) ?? null;
      rem.evidenceFile = rem.evidenceFileId ? (evidenceMap.get(rem.evidenceFileId) ?? null) : null;
      rem.allocations = [];
    }

    if (opts.deductions && allocRows.length) {
      const dedIds = Array.from(new Set(allocRows.map((a) => a.requestDeductionId)));
      const deductionRows = dedIds.length
        ? await this.db.client.select().from(financeRequestDeduction).where(inArray(financeRequestDeduction.id, dedIds))
        : [];
      const dedMap = new Map(deductionRows.map((d) => [d.id, d]));
      for (const alloc of allocRows) {
        alloc.requestDeduction = dedMap.get(alloc.requestDeductionId) ?? null;
      }
      await this.fillDeductionRels(
        deductionRows,
        opts.deductions === 'pdf'
          ? { allocations: 'none', request: 'pdf', deductionType: 'full' }
          : { allocations: 'shallow', request: 'minimal', deductionType: 'basic' },
      );
      for (const rem of remittances) {
        rem.allocations = allocRows.filter((a) => a.requestRemittanceId === rem.id);
      }
    }

    return remittances;
  }

  private async mapRequestRemittance(remittance: any) {
    const evidenceFiles = await this.hydrateEvidenceFiles(remittance.evidenceFileIds);
    return {
      id: remittance.id,
      remittance_number: remittance.remittanceNumber,
      reference: remittance.reference ?? null,
      remitted_at: remittance.remittedAt?.toISOString() ?? null,
      total_amount: Number(remittance.totalAmount ?? 0),
      allocated_amount: this.sumAllocatedAmount(remittance.allocations ?? []),
      unallocated_amount: Math.max(0, Number(remittance.totalAmount ?? 0) - this.sumAllocatedAmount(remittance.allocations ?? [])),
      remitted_by: this.formatProfileName(remittance.remittedByUser),
      created_by: this.formatProfileName(remittance.createdByUser),
      payment_voucher: remittance.paymentVoucher
        ? { id: remittance.paymentVoucher.id, voucher_number: remittance.paymentVoucher.voucherNumber }
        : null,
      paid_from_account: remittance.paidFromAccount
        ? {
            id: remittance.paidFromAccount.id,
            name: remittance.paidFromAccount.name,
            bank_name: remittance.paidFromAccount.bankName ?? null,
            account_number: remittance.paidFromAccount.accountNumber ?? null,
          }
        : null,
      evidence_file: remittance.evidenceFile
        ? {
            id: remittance.evidenceFile.id,
            file_name: remittance.evidenceFile.fileName,
            public_url: remittance.evidenceFile.publicUrl ?? null,
          }
        : null,
      evidence_files: evidenceFiles,
      notes: remittance.notes ?? null,
      deductions: (remittance.allocations ?? []).map((allocation: any) => {
        const deduction = allocation.requestDeduction;
        const allocatedAmount = Number(allocation.allocatedAmount ?? 0);
        const totalAllocated = this.sumAllocatedAmount(deduction?.remittanceAllocations ?? []);
        return {
          allocation_id: allocation.id,
          deduction_id: deduction.id,
          request_id: String(deduction.requestId),
          request_number: (deduction.request?.data as any)?.request_number ?? String(deduction.requestId),
          deduction_type_id: deduction.deductionTypeId,
          deduction_type_name: deduction.deductionType?.name ?? '',
          deduction_type_code: deduction.deductionType?.code ?? '',
          amount: Number(deduction.amount),
          allocated_amount: allocatedAmount,
          total_allocated_amount: totalAllocated,
          remaining_amount: Math.max(0, Number(deduction.amount) - totalAllocated),
          status: deduction.status,
          payment_voucher: deduction.pvDeduction?.paymentVoucher
            ? { id: deduction.pvDeduction.paymentVoucher.id, voucher_number: deduction.pvDeduction.paymentVoucher.voucherNumber }
            : null,
        };
      }),
      created_at: remittance.createdAt.toISOString(),
      updated_at: remittance.updatedAt.toISOString(),
    };
  }

  private async syncDeductionRemittanceSummary(
    tx: any,
    deductionId: string,
  ) {
    const [deduction] = await tx.select().from(financeRequestDeduction).where(eq(financeRequestDeduction.id, deductionId)).limit(1);
    if (!deduction) return;

    const allocations = await tx
      .select({ allocatedAmount: financeRequestDeductionRemittanceAllocation.allocatedAmount })
      .from(financeRequestDeductionRemittanceAllocation)
      .where(eq(financeRequestDeductionRemittanceAllocation.requestDeductionId, deductionId));
    const allocatedAmount = this.sumAllocatedAmount(allocations);
    const status = this.deriveDeductionStatus(Number(deduction.amount), allocatedAmount);

    await tx.update(financeRequestDeduction).set({ status }).where(eq(financeRequestDeduction.id, deductionId));
  }

  private fmtMoney(amount: any, currency = 'NGN'): string {
    const n = Number(amount ?? 0);
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
  }

  private fmtDate(d: Date | string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private esc(s: string | null | undefined): string {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private async fetchOrgSettings(): Promise<{
    org_name: string;
    prepared_by: string;
    prepared_title: string;
    prepared_signature: string | null;
    approved_by: string;
    approved_title: string;
    approved_signature: string | null;
  }> {
    const [row] = await this.db.client
      .select({ config: financeSetting.config })
      .from(financeSetting)
      .where(eq(financeSetting.key, 'default'))
      .limit(1);
    const cfg: any = (row?.config && typeof row.config === 'object' && !Array.isArray(row.config)) ? row.config : {};
    const [prepared_signature, approved_signature] = await Promise.all([
      this.resolveSignatureDataUri(cfg?.prepared_by?.signature_file_id),
      this.resolveSignatureDataUri(cfg?.approved_by?.signature_file_id),
    ]);
    return {
      org_name: cfg?.org_name ?? cfg?.organization_name ?? 'The Organisation',
      prepared_by: cfg?.prepared_by?.name ?? '',
      prepared_title: cfg?.prepared_by?.title ?? 'Accountant',
      prepared_signature,
      approved_by: cfg?.approved_by?.name ?? '',
      approved_title: cfg?.approved_by?.title ?? 'Executive Director',
      approved_signature,
    };
  }

  private async resolveSignatureDataUri(fileId: unknown): Promise<string | null> {
    if (typeof fileId !== 'string' || !fileId) return null;
    const assets = await this.fileAssetsByIds([fileId]);
    const asset = assets[0] ?? null;
    if (!asset) return null;
    const storagePath = asset.storagePath || asset.publicUrl || '';
    if (!storagePath) return null;
    const candidates = [
      storagePath,
      resolve(process.cwd(), storagePath),
      resolve(process.cwd(), '..', storagePath),
      resolve(process.cwd(), 'uploads', storagePath),
    ];
    let buf: Buffer | null = null;
    for (const candidate of candidates) {
      if (candidate && existsSync(candidate)) {
        try {
          buf = await readFile(candidate);
          break;
        } catch {
          // continue
        }
      }
    }
    if (!buf) return null;
    const ext = (asset.fileName ?? '').split('.').pop()?.toLowerCase() ?? 'png';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  }

  private getPdfLogoDataUri(): string | null {
    try {
      const logoPath = process.env.PDF_LOGO_PATH || 'public/branding/logo.png';
      if (require('fs').existsSync(logoPath)) {
        const fileBuffer = require('fs').readFileSync(logoPath);
        const ext = require('path').extname(logoPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : null;
        if (mime) {
          return `data:${mime};base64,${fileBuffer.toString('base64')}`;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async readAssetFileBuffer(asset: {
    storagePath?: string | null;
    publicUrl?: string | null;
    fileName?: string | null;
  }): Promise<Buffer | null> {
    const storagePath = asset.storagePath || asset.publicUrl || '';
    if (!storagePath) return null;
    const candidates = [
      storagePath,
      resolve(process.cwd(), storagePath),
      resolve(process.cwd(), '..', storagePath),
      resolve(process.cwd(), 'uploads', storagePath),
    ];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (existsSync(candidate)) {
        try {
          return await readFile(candidate);
        } catch {
          // continue
        }
      }
    }
    if (/^https?:\/\//i.test(storagePath)) {
      try {
        const res = await fetch(storagePath);
        if (res.ok) return Buffer.from(await res.arrayBuffer());
      } catch {
        // ignore
      }
    }
    return null;
  }

  private async appendPdfBuffer(target: PDFDocument, pdfBuffer: Buffer) {
    const source = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pages = await target.copyPages(source, source.getPageIndices());
    for (const page of pages) target.addPage(page);
  }

  private async appendImagePage(
    target: PDFDocument,
    image: { width: number; height: number; scale: (f: number) => { width: number; height: number } },
    label: string,
  ) {
    const page = target.addPage([595.28, 841.89]);
    const margin = 36;
    const headerSpace = 32;
    const availableWidth = page.getWidth() - margin * 2;
    const availableHeight = page.getHeight() - margin * 2 - headerSpace;
    const ratio = Math.min(availableWidth / image.width, availableHeight / image.height, 1);
    const dims = image.scale(ratio);
    page.drawImage(image as any, {
      x: (page.getWidth() - dims.width) / 2,
      y: margin,
      width: dims.width,
      height: dims.height,
    });
    const font = await target.embedFont(StandardFonts.Helvetica);
    page.drawText(label, { x: margin, y: page.getHeight() - margin + 4, size: 10, font });
  }

  private async appendTextPage(target: PDFDocument, title: string, lines: string[]) {
    const page = target.addPage([595.28, 841.89]);
    const font = await target.embedFont(StandardFonts.Helvetica);
    const bold = await target.embedFont(StandardFonts.HelveticaBold);
    page.drawText(title, { x: 40, y: 800, size: 16, font: bold });
    let y = 772;
    for (const line of lines) {
      page.drawText(line, { x: 40, y, size: 11, font });
      y -= 16;
      if (y < 50) break;
    }
  }

  private async appendAssetToPdf(target: PDFDocument, fileBuffer: Buffer | null, fileName: string, mimeType: string | null | undefined, skippedFiles: string[]) {
    if (!fileBuffer) {
      skippedFiles.push(`${fileName} (missing file)`);
      return;
    }
    const mime = String(mimeType || '').toLowerCase();
    const ext = extname(fileName).toLowerCase();
    if (mime === 'application/pdf' || ext === '.pdf') {
      await this.appendPdfBuffer(target, fileBuffer);
      return;
    }
    if (mime === 'image/png' || ext === '.png') {
      const image = await target.embedPng(fileBuffer);
      await this.appendImagePage(target, image, fileName);
      return;
    }
    if (['image/jpeg', 'image/jpg'].includes(mime) || ['.jpg', '.jpeg'].includes(ext)) {
      const image = await target.embedJpg(fileBuffer);
      await this.appendImagePage(target, image, fileName);
      return;
    }
    skippedFiles.push(fileName);
  }

  private pdfDocStyle(): string {
    return `
      @page { size: A4; margin: 10mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; }
      .card { border: 1px solid #000; border-radius: 6px; margin-bottom: 14px; }
      .rowpad { padding: 12px; border-bottom: 1px solid #000; }
      .rowpad:last-child { border-bottom: 0; }
      .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
      .doc-title { font-size: 18px; font-weight: 700; text-align: right; text-decoration: underline; text-transform: uppercase; letter-spacing: 1px; }
      .doc-subtitle { font-size: 11px; color: #475569; text-align: right; margin-top: 4px; }
      .ref-badge { display: inline-block; background: #000; color: #fff; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 4px; letter-spacing: 1px; }
      .two-col { display: table; width: 100%; }
      .two-col > div { display: table-cell; width: 50%; vertical-align: top; padding: 12px; }
      .two-col > div:first-child { border-right: 1px solid #000; }
      .detail-list div { margin-bottom: 5px; }
      .muted { color: #475569; font-size: 11px; }
      .section-title { font-weight: 700; margin-bottom: 6px; font-size: 12px; }
      .tbl { width: 100%; border-collapse: collapse; }
      .tbl th, .tbl td { border: 1px solid #000; padding: 7px; text-align: left; }
      .tbl th { background: #f3f4f6; }
      .amount-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 6px; padding: 10px 14px; margin: 16px 0; text-align: center; }
      .amount-box .label { font-size: 10px; text-transform: uppercase; color: #15803d; font-weight: 600; }
      .amount-box .value { font-size: 22px; font-weight: 700; color: #15803d; }
      .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 10px; }
      .sig-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-bottom: 4px; margin-top: 8px; }
      .sig-line { border-bottom: 1.5px solid #111; height: 36px; margin-bottom: 4px; }
      .sig-name { font-size: 12px; font-weight: 600; }
      .footer-note { font-size: 10px; color: #475569; text-align: center; margin-top: 20px; }
    `;
  }

  async listDeductionTypes(query: Record<string, any>) {
    const conditions: SQL[] = [];
    if (query.organization_id) conditions.push(eq(financeDeductionType.organizationId, toBigInt(query.organization_id)));
    if (query.is_active !== undefined) conditions.push(eq(financeDeductionType.isActive, query.is_active === 'true' || query.is_active === true));
    if (query.applies_to) conditions.push(eq(financeDeductionType.appliesTo, String(query.applies_to)));

    const rows = await this.db.client
      .select()
      .from(financeDeductionType)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(financeDeductionType.name));

    const glAccountIds = Array.from(new Set(rows.map((row) => row.glAccountId).filter((id): id is string => Boolean(id))));
    let glAccountMap = new Map<string, any>();
    if (glAccountIds.length > 0) {
      const glRows = await this.db.client
        .select({ id: financeChartAccount.id, name: financeChartAccount.name, code: financeChartAccount.code })
        .from(financeChartAccount)
        .where(inArray(financeChartAccount.id, glAccountIds));
      glAccountMap = new Map(glRows.map((row) => [row.id, row]));
    }
    const resultRows = rows.map((row) => ({ ...row, glAccount: row.glAccountId ? (glAccountMap.get(row.glAccountId) ?? null) : null }));
    return paginatedResponse(resultRows, { page: 1, per_page: rows.length, total: rows.length });
  }

  async upsertDeductionType(
    id: string | undefined,
    dto: UpsertDeductionTypeDto,
    userId: number,
    organizationId?: number,
  ) {
    try {
      const data: any = {
        updatedBy: toBigInt(userId),
        updatedAt: new Date(),
      };

      if (dto.name !== undefined) data.name = dto.name;
      if (dto.code !== undefined) data.code = dto.code;
      if (dto.rate !== undefined) data.rate = dto.rate;
      if (dto.applies_to !== undefined) data.appliesTo = dto.applies_to;
      if (dto.is_active !== undefined) data.isActive = dto.is_active;
      if (dto.gl_account_id !== undefined) data.glAccountId = dto.gl_account_id ?? null;

      if (id) {
        const [existing] = await this.db.client.select().from(financeDeductionType).where(eq(financeDeductionType.id, id)).limit(1);
        if (!existing) throw new NotFoundException('Deduction type not found');
        const updated = await this.db.client.update(financeDeductionType).set(data).where(eq(financeDeductionType.id, id)).returning();
        return updated[0];
      }

      if (!dto.name || !dto.code || dto.rate === undefined) {
        throw new BadRequestException('name, code, and rate are required when creating a deduction type');
      }

      const created = await this.db.client.insert(financeDeductionType).values({
        ...data,
        name: dto.name,
        code: dto.code,
        rate: dto.rate,
        appliesTo: dto.applies_to ?? 'vendor',
        isActive: dto.is_active ?? true,
        createdBy: toBigInt(userId),
        organizationId: organizationId ? toBigInt(organizationId) : null,
      }).returning();
      return created[0];
    } catch (e) {
      this.logger.error(`upsertDeductionType error: ${e instanceof Error ? e.stack : String(e)}`);
      throw e;
    }
  }

  async applyPVDeductions(pvId: string, dto: ApplyPVDeductionsDto, userId: number) {
    const [pv] = await this.db.client.select().from(financePaymentVoucher).where(eq(financePaymentVoucher.id, pvId)).limit(1);
    if (!pv) throw new NotFoundException('Payment voucher not found');

    const now = new Date();

    return this.db.client.transaction(async (tx) => {
      const existingPVDeductions = await tx
        .select({ requestDeductionId: financePVDeduction.requestDeductionId })
        .from(financePVDeduction)
        .where(eq(financePVDeduction.paymentVoucherId, pvId));
      const linkedRequestDeductionIds = existingPVDeductions
        .map((row) => row.requestDeductionId)
        .filter((value): value is string => Boolean(value));

      await tx.delete(financePVDeduction).where(eq(financePVDeduction.paymentVoucherId, pvId));
      await tx.delete(financeVendorWHTAccrual).where(eq(financeVendorWHTAccrual.paymentVoucherId, pvId));
      if (linkedRequestDeductionIds.length > 0) {
        await tx.delete(financeRequestDeduction).where(inArray(financeRequestDeduction.id, linkedRequestDeductionIds));
      }

      const createdDeductions = [] as Array<{ id: string; deductionTypeId: string; grossAmount: Decimal | number | string; deductionAmount: Decimal | number | string; requestDeductionId: string | null }>;
      for (const line of dto.deductions) {
        const requestDeduction = pv.requestId
          ? (await tx.insert(financeRequestDeduction).values({
              requestId: pv.requestId,
              deductionTypeId: line.deduction_type_id,
              amount: line.deduction_amount as any,
              rate: line.rate as any,
              grossAmount: line.gross_amount as any,
              status: 'pending',
              createdBy: toBigInt(userId),
              updatedAt: now,
            }).returning())[0]
          : null;

        const deduction = (await tx.insert(financePVDeduction).values({
          paymentVoucherId: pvId,
          deductionTypeId: line.deduction_type_id,
          requestDeductionId: requestDeduction?.id ?? null,
          rate: line.rate as any,
          grossAmount: line.gross_amount as any,
          deductionAmount: line.deduction_amount as any,
          createdBy: toBigInt(userId),
          updatedAt: now,
        }).returning())[0];
        createdDeductions.push(deduction);
      }

      if (pv.contactId) {
        await Promise.all(
          createdDeductions.map((deduction) =>
            tx.insert(financeVendorWHTAccrual).values({
              contactId: pv.contactId!,
              paymentVoucherId: pvId,
              pvDeductionId: deduction.id,
              deductionTypeId: deduction.deductionTypeId,
              periodYear: now.getFullYear(),
              periodMonth: now.getMonth() + 1,
              grossAmount: String(deduction.grossAmount),
              withheldAmount: String(deduction.deductionAmount),
              organizationId: null,
              updatedAt: now,
            } as any),
          ),
        );
      }

      const totalDeducted = dto.deductions.reduce((sum, d) => sum + d.deduction_amount, 0);
      const grossAmount = dto.deductions[0]?.gross_amount ?? null;
      await tx
        .update(financePaymentVoucher)
        .set({
          grossAmount: grossAmount === null ? null : String(grossAmount),
          netAmount: grossAmount !== null ? String(grossAmount - totalDeducted) : null,
        })
        .where(eq(financePaymentVoucher.id, pvId));

      return { deductions: createdDeductions, total_deducted: totalDeducted };
    });
  }

  async listPVDeductions(pvId: string) {
    const rows = await this.db.client
      .select()
      .from(financePVDeduction)
      .where(eq(financePVDeduction.paymentVoucherId, pvId))
      .orderBy(asc(financePVDeduction.createdAt)) as any[];

    const deductionTypeIds = Array.from(new Set(rows.map((row) => row.deductionTypeId)));
    const requestDeductionIds = Array.from(new Set(rows.map((row) => row.requestDeductionId).filter((id): id is string => Boolean(id))));
    const [typeRows, deductionRows] = await Promise.all([
      deductionTypeIds.length ? this.db.client.select().from(financeDeductionType).where(inArray(financeDeductionType.id, deductionTypeIds)) : [],
      requestDeductionIds.length ? this.db.client.select().from(financeRequestDeduction).where(inArray(financeRequestDeduction.id, requestDeductionIds)) : [],
    ]);
    const typeMap = new Map(typeRows.map((row) => [row.id, row] as const));
    const deductionMap = new Map(deductionRows.map((row) => [row.id, row] as const));
    for (const row of rows) {
      row.deductionType = typeMap.get(row.deductionTypeId) ?? null;
      row.requestDeduction = row.requestDeductionId ? (deductionMap.get(row.requestDeductionId) ?? null) : null;
    }
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  async listVendorAccruals(vendorId: string, query: Record<string, any>) {
    const conditions: SQL[] = [eq(financeVendorWHTAccrual.contactId, vendorId)];
    if (query.period_year) conditions.push(eq(financeVendorWHTAccrual.periodYear, Number(query.period_year)));
    if (query.period_month) conditions.push(eq(financeVendorWHTAccrual.periodMonth, Number(query.period_month)));
    if (query.unremitted === 'true') conditions.push(isNull(financeVendorWHTAccrual.remittanceId));
    if (query.deduction_type_id) conditions.push(eq(financeVendorWHTAccrual.deductionTypeId, String(query.deduction_type_id)));

    const rows = await this.db.client
      .select()
      .from(financeVendorWHTAccrual)
      .where(and(...conditions))
      .orderBy(desc(financeVendorWHTAccrual.periodYear), desc(financeVendorWHTAccrual.periodMonth)) as any[];

    const [typeRows, voucherRows] = await Promise.all([
      this.db.client.select().from(financeDeductionType).where(inArray(financeDeductionType.id, Array.from(new Set(rows.map((row) => row.deductionTypeId))))),
      this.db.client
        .select({ id: financePaymentVoucher.id, voucherNumber: financePaymentVoucher.voucherNumber, createdAt: financePaymentVoucher.createdAt })
        .from(financePaymentVoucher)
        .where(inArray(financePaymentVoucher.id, Array.from(new Set(rows.map((row) => row.paymentVoucherId))))),
    ]);
    const typeMap = new Map(typeRows.map((row) => [row.id, row] as const));
    const voucherMap = new Map(voucherRows.map((row) => [row.id, row] as const));
    for (const row of rows) {
      row.deductionType = typeMap.get(row.deductionTypeId) ?? null;
      row.paymentVoucher = voucherMap.get(row.paymentVoucherId) ?? null;
    }
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  private async hydrateWhtRemittances(remittances: any[], opts: { contactTaxNumber?: boolean; paymentVoucher?: boolean } = {}) {
    if (remittances.length === 0) return;
    const typeIds = Array.from(new Set(remittances.map((r) => r.deductionTypeId)));
    const accountIds = Array.from(new Set(remittances.map((r) => r.paidFromAccountId)));

    const [typeRows, accountRows, accrualRows] = await Promise.all([
      this.db.client.select().from(financeDeductionType).where(inArray(financeDeductionType.id, typeIds)),
      this.db.client.select({ id: financeAccount.id, name: financeAccount.name }).from(financeAccount).where(inArray(financeAccount.id, accountIds)),
      this.db.client.select().from(financeVendorWHTAccrual).where(inArray(financeVendorWHTAccrual.remittanceId, remittances.map((r) => r.id))) as any,
    ]);
    const typeMap = new Map(typeRows.map((row) => [row.id, row] as const));
    const accountMap = new Map(accountRows.map((row) => [row.id, row] as const));
    const accrualsByRemittance = new Map<string, any[]>();
    for (const accrual of accrualRows) {
      const list = accrualsByRemittance.get(accrual.remittanceId) ?? [];
      list.push(accrual);
      accrualsByRemittance.set(accrual.remittanceId, list);
    }
    for (const rem of remittances) {
      rem.deductionType = typeMap.get(rem.deductionTypeId) ?? null;
      rem.paidFromAccount = accountMap.get(rem.paidFromAccountId) ?? null;
      rem.accruals = accrualsByRemittance.get(rem.id) ?? [];
    }

    const contactIds = Array.from(new Set(accrualRows.map((a: any) => a.contactId).filter((id: any): id is string => Boolean(id)))) as string[];
    const contactSelection: Record<string, any> = { id: financeContact.id, name: financeContact.name };
    if (opts.contactTaxNumber) contactSelection.taxNumber = financeContact.taxNumber;
    const contactRows = contactIds.length
      ? await this.db.client.select(contactSelection as any).from(financeContact).where(inArray(financeContact.id, contactIds))
      : [];
    const contactMap = new Map((contactRows as any[]).map((row) => [row.id, row] as const));
    const voucherMap = opts.paymentVoucher
      ? await this.fetchPaymentVouchers(accrualRows.map((a) => a.paymentVoucherId))
      : new Map<string, any>();
    for (const accrual of accrualRows) {
      accrual.contact = contactMap.get(accrual.contactId) ?? null;
      accrual.paymentVoucher = voucherMap.get(accrual.paymentVoucherId) ?? null;
    }
  }

  async createWHTRemittance(dto: CreateWHTRemittanceDto, userId: number, organizationId?: number) {
    if (!dto.accrual_ids || dto.accrual_ids.length === 0) {
      throw new BadRequestException('accrual_ids must not be empty');
    }

    const accruals = await this.db.client.select().from(financeVendorWHTAccrual).where(inArray(financeVendorWHTAccrual.id, dto.accrual_ids));

    const alreadyRemitted = accruals.filter((a) => a.remittanceId !== null);
    if (alreadyRemitted.length > 0) {
      throw new BadRequestException(
        `${alreadyRemitted.length} accrual(s) have already been remitted`,
      );
    }

    const year = dto.period_year;
    const month = String(dto.period_month).padStart(2, '0');
    const [seqRow] = await this.db.client
      .select({ value: count() })
      .from(financeWHTRemittance)
      .where(and(eq(financeWHTRemittance.periodYear, dto.period_year), eq(financeWHTRemittance.periodMonth, dto.period_month)));
    const seq = Number(seqRow?.value ?? 0);
    const remittanceNumber = `WHT-${year}-${month}-${String(seq + 1).padStart(3, '0')}`;
    const now = new Date();

    return this.db.client.transaction(async (tx) => {
      const remittance = (await tx.insert(financeWHTRemittance).values({
        remittanceNumber,
        deductionTypeId: dto.deduction_type_id,
        periodYear: dto.period_year,
        periodMonth: dto.period_month,
        totalAmount: String(dto.total_amount),
        paidFromAccountId: dto.paid_from_account_id,
        remittanceDate: new Date(dto.remittance_date),
        reference: dto.reference ?? null,
        receiptFileId: dto.receipt_file_id ?? null,
        notes: dto.notes ?? null,
        status: 'pending',
        organizationId: organizationId ? toBigInt(organizationId) : null,
        createdBy: toBigInt(userId),
        updatedAt: now,
      } as any).returning())[0];

      await tx
        .update(financeVendorWHTAccrual)
        .set({ remittanceId: remittance.id, remittedAt: now, updatedAt: now })
        .where(inArray(financeVendorWHTAccrual.id, dto.accrual_ids));

      return remittance;
    });
  }

  async listWHTRemittances(query: Record<string, any>) {
    const conditions: SQL[] = [];
    if (query.period_year) conditions.push(eq(financeWHTRemittance.periodYear, Number(query.period_year)));
    if (query.period_month) conditions.push(eq(financeWHTRemittance.periodMonth, Number(query.period_month)));
    if (query.deduction_type_id) conditions.push(eq(financeWHTRemittance.deductionTypeId, String(query.deduction_type_id)));
    if (query.status) conditions.push(eq(financeWHTRemittance.status, String(query.status)));
    if (query.organization_id) conditions.push(eq(financeWHTRemittance.organizationId, toBigInt(query.organization_id)));

    const rows = await this.db.client
      .select()
      .from(financeWHTRemittance)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(financeWHTRemittance.periodYear), desc(financeWHTRemittance.periodMonth));

    await this.hydrateWhtRemittances(rows);
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  async getWHTRemittance(id: string) {
    const [remittance] = await this.db.client.select().from(financeWHTRemittance).where(eq(financeWHTRemittance.id, id)).limit(1);
    if (!remittance) throw new NotFoundException('WHT remittance not found');
    await this.hydrateWhtRemittances([remittance], { contactTaxNumber: true, paymentVoucher: true });
    return remittance;
  }

  async listRequestDeductions(query: StatutoryDeductionsQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(200, Math.max(1, Number(query.per_page ?? 50)));
    const skip = (page - 1) * perPage;

    const conditions: SQL[] = [];
    if (query.id) conditions.push(eq(financeRequestDeduction.id, query.id));
    if (query.status) conditions.push(eq(financeRequestDeduction.status, query.status));
    if (query.deduction_type_id) conditions.push(eq(financeRequestDeduction.deductionTypeId, query.deduction_type_id));
    if (query.request_id) conditions.push(eq(financeRequestDeduction.requestId, toBigInt(query.request_id)));
    if (query.date_from) conditions.push(gte(financeRequestDeduction.createdAt, new Date(query.date_from)));
    if (query.date_to) conditions.push(lte(financeRequestDeduction.createdAt, new Date(query.date_to)));

    const remittanceFilter = (filter: SQL): SQL =>
      exists(
        this.db.client
          .select({ id: financeRequestDeductionRemittanceAllocation.id })
          .from(financeRequestDeductionRemittanceAllocation)
          .innerJoin(financeRequestRemittance, eq(financeRequestDeductionRemittanceAllocation.requestRemittanceId, financeRequestRemittance.id))
          .where(and(eq(financeRequestDeductionRemittanceAllocation.requestDeductionId, financeRequestDeduction.id), filter)),
      );

    if (query.remittance_ref) conditions.push(remittanceFilter(eq(financeRequestRemittance.reference, query.remittance_ref)));
    if (query.remittance_number) conditions.push(remittanceFilter(eq(financeRequestRemittance.remittanceNumber, query.remittance_number)));
    if (query.payment_voucher_id) conditions.push(remittanceFilter(eq(financeRequestRemittance.paymentVoucherId, query.payment_voucher_id)));
    if (query.search) {
      const tid = this.tenantContext.currentTenantId();
      conditions.push(
        exists(
          this.db.client
            .select({ id: requestInstance.id })
            .from(requestInstance)
            .where(
              and(
                eq(requestInstance.id, financeRequestDeduction.requestId),
                ilike(sql`${requestInstance.data}->>'request_number'`, `%${String(query.search)}%`),
                tid ? eq(requestInstance.tenantId, tid) : undefined,
              ),
            ),
        ),
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRow] = await Promise.all([
      this.db.client
        .select()
        .from(financeRequestDeduction)
        .where(where)
        .orderBy(desc(financeRequestDeduction.createdAt))
        .offset(skip)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(financeRequestDeduction).where(where),
    ]);
    const total = Number(totalRow[0]?.value ?? 0);

    await this.fillDeductionRels(rows, { allocations: 'deep', request: 'list', createdByUser: true, deductionType: 'basic' });

    const extraEvidenceIds = Array.from(
      new Set(
        rows.flatMap((row: any) =>
          (row.remittanceAllocations ?? []).flatMap((allocation: any) =>
            Array.isArray(allocation.requestRemittance?.evidenceFileIds)
              ? allocation.requestRemittance.evidenceFileIds.map(String)
              : [],
          ),
        ),
      ),
    );
    const extraEvidenceFiles = extraEvidenceIds.length > 0
      ? await this.fileAssetsByIds(extraEvidenceIds)
      : [];
    const extraEvidenceMap = new Map(extraEvidenceFiles.map((file) => [file.id, file]));

    return {
      data: {
        items: rows.map((d: any) => {
          const allocated_amount = this.sumAllocatedAmount(d.remittanceAllocations ?? []);
          const remaining_amount = Math.max(0, Number(d.amount) - allocated_amount);
          const latestAllocation = (d.remittanceAllocations ?? [])[0] ?? null;
          const latestRemittance = latestAllocation?.requestRemittance ?? null;
          return ({
          id: d.id,
          request_id: String(d.requestId),
          request_number: (d.request?.data as any)?.request_number ?? String(d.requestId),
          deduction_type_id: d.deductionTypeId,
          deduction_type_name: d.deductionType?.name ?? '',
          deduction_type_code: d.deductionType?.code ?? '',
          amount: Number(d.amount),
          rate: Number(d.rate),
          gross_amount: Number(d.grossAmount),
          status: d.status,
          allocated_amount,
          remaining_amount,
          remittance_number: latestRemittance?.remittanceNumber ?? null,
          remitted_at: latestRemittance?.remittedAt?.toISOString() ?? null,
          remittance_ref: latestRemittance?.reference ?? null,
          remittance_id: latestRemittance?.id ?? null,
          remitted_by: this.formatProfileName(latestRemittance?.remittedByUser),
          payment_voucher: latestRemittance?.paymentVoucher ? { id: latestRemittance.paymentVoucher.id, voucher_number: latestRemittance.paymentVoucher.voucherNumber } : null,
          evidence_files: Array.isArray(latestRemittance?.evidenceFileIds)
            ? (latestRemittance.evidenceFileIds as string[])
                .map((id) => extraEvidenceMap.get(String(id)))
                .filter(Boolean)
                .map((file: any) => ({ id: file.id, file_name: file.fileName, public_url: file.publicUrl ?? null }))
            : [],
          paid_from_account: latestRemittance?.paidFromAccount ? {
            id: latestRemittance.paidFromAccount.id,
            name: latestRemittance.paidFromAccount.name,
            bank_name: latestRemittance.paidFromAccount.bankName ?? null,
            account_number: latestRemittance.paidFromAccount.accountNumber ?? null,
          } : null,
          evidence_file: latestRemittance?.evidenceFile ? {
            id: latestRemittance.evidenceFile.id,
            file_name: latestRemittance.evidenceFile.fileName,
            public_url: latestRemittance.evidenceFile.publicUrl ?? null,
          } : null,
          notes: latestRemittance?.notes ?? null,
          remittance_allocations: (d.remittanceAllocations ?? []).map((allocation: any) => ({
            id: allocation.id,
            remittance_id: allocation.requestRemittance?.id ?? null,
            remittance_number: allocation.requestRemittance?.remittanceNumber ?? null,
            remittance_ref: allocation.requestRemittance?.reference ?? null,
            remittance_total_amount: allocation.requestRemittance?.totalAmount ? Number(allocation.requestRemittance.totalAmount) : null,
            allocated_amount: Number(allocation.allocatedAmount),
            remitted_at: allocation.requestRemittance?.remittedAt?.toISOString() ?? null,
            remitted_by: this.formatProfileName(allocation.requestRemittance?.remittedByUser),
            payment_voucher: allocation.requestRemittance?.paymentVoucher ? { id: allocation.requestRemittance.paymentVoucher.id, voucher_number: allocation.requestRemittance.paymentVoucher.voucherNumber } : null,
            paid_from_account: allocation.requestRemittance?.paidFromAccount ? {
              id: allocation.requestRemittance.paidFromAccount.id,
              name: allocation.requestRemittance.paidFromAccount.name,
              bank_name: allocation.requestRemittance.paidFromAccount.bankName ?? null,
              account_number: allocation.requestRemittance.paidFromAccount.accountNumber ?? null,
            } : null,
            evidence_file_ids: Array.isArray(allocation.requestRemittance?.evidenceFileIds) ? allocation.requestRemittance.evidenceFileIds.map(String) : [],
            notes: allocation.requestRemittance?.notes ?? null,
          })),
          created_by_name: d.createdByUser
            ? `${d.createdByUser.firstName || ''} ${d.createdByUser.lastName || ''}`.trim()
            : '',
          created_at: d.createdAt.toISOString(),
        });
        }),
        pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
      },
    };
  }

  async listRequestRemittances(query: RequestRemittancesQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(200, Math.max(1, Number(query.per_page ?? 50)));
    const skip = (page - 1) * perPage;

    const conditions: SQL[] = [];
    if (query.id) conditions.push(eq(financeRequestRemittance.id, query.id));
    if (query.remittance_number) conditions.push(eq(financeRequestRemittance.remittanceNumber, query.remittance_number));
    if (query.reference) conditions.push(eq(financeRequestRemittance.reference, query.reference));
    if (query.payment_voucher_id) conditions.push(eq(financeRequestRemittance.paymentVoucherId, query.payment_voucher_id));
    if (query.search) {
      const search = `%${String(query.search)}%`;
      const searchFilter = or(
        ilike(financeRequestRemittance.remittanceNumber, search),
        ilike(financeRequestRemittance.reference, search),
      );
      if (searchFilter) conditions.push(searchFilter as SQL);
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, totalRow] = await Promise.all([
      this.db.client
        .select()
        .from(financeRequestRemittance)
        .where(where)
        .orderBy(desc(financeRequestRemittance.remittedAt), desc(financeRequestRemittance.createdAt))
        .offset(skip)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(financeRequestRemittance).where(where),
    ]);
    const total = Number(totalRow[0]?.value ?? 0);

    await this.fillRemittanceRels(rows, { deductions: 'map' });

    const items = await Promise.all(rows.map((row) => this.mapRequestRemittance(row)));
    return {
      data: {
        items,
        pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) },
      },
    };
  }

  async batchRemitDeductions(dto: RemitStatutoryDeductionsDto, userId: number) {
    const ids = dto.deduction_ids;
    const now = dto.remitted_at ? new Date(dto.remitted_at) : new Date();
    const year = now.getFullYear();

    const existingRows = await this.db.client.select().from(financeRequestDeduction).where(inArray(financeRequestDeduction.id, ids));
    const allocationRows = existingRows.length > 0
      ? await this.db.client
          .select({ requestDeductionId: financeRequestDeductionRemittanceAllocation.requestDeductionId, allocatedAmount: financeRequestDeductionRemittanceAllocation.allocatedAmount })
          .from(financeRequestDeductionRemittanceAllocation)
          .where(inArray(financeRequestDeductionRemittanceAllocation.requestDeductionId, existingRows.map((row) => row.id)))
      : [];
    const allocationsByDeduction = new Map<string, any[]>();
    for (const allocation of allocationRows) {
      const list = allocationsByDeduction.get(allocation.requestDeductionId) ?? [];
      list.push(allocation);
      allocationsByDeduction.set(allocation.requestDeductionId, list);
    }
    const existing = existingRows.map((row) => ({ ...row, remittanceAllocations: allocationsByDeduction.get(row.id) ?? [] }));

    if (existing.length !== ids.length) {
      throw new NotFoundException('Some deductions were not found');
    }
    const allocationMap = new Map((dto.allocations ?? []).map((allocation) => [allocation.deduction_id, Number(allocation.allocated_amount)]));
    for (const deduction of existing) {
      const alreadyAllocated = this.sumAllocatedAmount(deduction.remittanceAllocations);
      const remaining = Number(deduction.amount) - alreadyAllocated;
      const nextAllocated = allocationMap.get(deduction.id) ?? remaining;
      if (nextAllocated <= 0) throw new BadRequestException('allocated_amount must be greater than zero');
      if (nextAllocated - remaining > 0.0001) {
        throw new BadRequestException(`Allocation for deduction ${deduction.id} exceeds remaining balance`);
      }
    }
    if (allocationMap.size > 0 && allocationMap.size !== ids.length) {
      throw new BadRequestException('allocations must cover every selected deduction');
    }
    const remittanceTotalAmount = dto.remittance_total_amount !== undefined ? Number(dto.remittance_total_amount) : ids.reduce((sum, id) => sum + (allocationMap.get(id) ?? 0), 0);
    const requestedTotal = ids.reduce((sum, id) => sum + (allocationMap.get(id) ?? 0), 0);
    if (requestedTotal - remittanceTotalAmount > 0.0001) {
      throw new BadRequestException('Allocated deductions exceed remittance total amount');
    }

    const remittanceNumber = dto.remittance_number?.trim() || await this.nextRequestRemittanceNumber(now);

    const created = await this.db.client.transaction(async (tx) => {
      const remittance = (await tx.insert(financeRequestRemittance).values({
        remittanceNumber,
        reference: dto.reference,
        totalAmount: String(remittanceTotalAmount),
        remittedAt: now,
        paymentVoucherId: dto.payment_voucher_id ?? null,
        remittedBy: dto.remitted_by ? toBigInt(dto.remitted_by) : null,
        paidFromAccountId: dto.paid_from_account_id ?? null,
        evidenceFileId: dto.evidence_file_id ?? null,
        evidenceFileIds: dto.evidence_file_ids ? (dto.evidence_file_ids as any) : (dto.evidence_file_id ? [dto.evidence_file_id] as any : null),
        notes: dto.notes ?? null,
        createdBy: toBigInt(userId),
        updatedBy: toBigInt(userId),
      } as any).returning())[0];

      for (const deductionId of ids) {
        const deduction = existing.find((row) => row.id === deductionId);
        const alreadyAllocated = deduction ? this.sumAllocatedAmount(deduction.remittanceAllocations) : 0;
        const remaining = deduction ? Number(deduction.amount) - alreadyAllocated : 0;
        const allocatedAmount = allocationMap.get(deductionId) ?? remaining;
        await tx.insert(financeRequestDeductionRemittanceAllocation).values({
          requestDeductionId: deductionId,
          requestRemittanceId: remittance.id,
          allocatedAmount: String(allocatedAmount),
          createdBy: toBigInt(userId),
        });
        await this.syncDeductionRemittanceSummary(tx, deductionId);
      }

      const [final] = await tx.select().from(financeRequestRemittance).where(eq(financeRequestRemittance.id, remittance.id)).limit(1);
      return final;
    });

    if (!created) return { updated: ids.length };
    const enriched = await this.fillRemittanceRels([created], { deductions: 'map' });
    return this.mapRequestRemittance(enriched[0]);
  }

  async updatePendingDeduction(id: string, dto: {
    deduction_type_id?: string;
    gross_amount?: number;
    amount?: number;
    rate?: number;
    notes?: string;
  }) {
    const [existing] = await this.db.client.select().from(financeRequestDeduction).where(eq(financeRequestDeduction.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Deduction not found');
    if (existing.status !== 'pending') throw new BadRequestException('Only pending deductions can be edited');

    if (dto.deduction_type_id) {
      const [dt] = await this.db.client.select().from(financeDeductionType).where(eq(financeDeductionType.id, dto.deduction_type_id)).limit(1);
      if (!dt) throw new BadRequestException('Invalid deduction_type_id');
    }

    if (dto.gross_amount !== undefined && dto.gross_amount <= 0) {
      throw new BadRequestException('gross_amount must be positive');
    }
    if (dto.amount !== undefined && dto.amount <= 0) {
      throw new BadRequestException('amount must be positive');
    }

    const data: Record<string, any> = {};
    if (dto.deduction_type_id !== undefined) data.deductionTypeId = dto.deduction_type_id;
    if (dto.gross_amount !== undefined) data.grossAmount = String(dto.gross_amount);
    if (dto.amount !== undefined) data.amount = String(dto.amount);
    if (dto.rate !== undefined) data.rate = String(dto.rate);
    if (dto.notes !== undefined) data.notes = dto.notes || null;

    const updated = await this.db.client.update(financeRequestDeduction).set(data).where(eq(financeRequestDeduction.id, id)).returning();
    return updated[0];
  }

  async updateRemittanceRecord(id: string, dto: {
    remittance_number?: string;
    remittance_ref?: string;
    remitted_at?: string;
    remittance_total_amount?: number;
    paid_from_account_id?: string;
    payment_voucher_id?: string;
    remitted_by?: string;
    evidence_file_id?: string;
    evidence_file_ids?: string[];
    notes?: string;
    allocations?: Array<{ id?: string; allocated_amount?: number }>;
  }) {
    const [existing] = await this.db.client.select().from(financeRequestRemittance).where(eq(financeRequestRemittance.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Remittance not found');

    const remittance = await this.db.client.transaction(async (tx) => {
      const allocations = await tx
        .select()
        .from(financeRequestDeductionRemittanceAllocation)
        .where(eq(financeRequestDeductionRemittanceAllocation.requestRemittanceId, id))
        .orderBy(desc(financeRequestDeductionRemittanceAllocation.createdAt)) as any[];
      if (allocations.length === 0) throw new BadRequestException('No remittance allocations found for this remittance');

      const deductionIds = Array.from(new Set(allocations.map((allocation) => allocation.requestDeductionId)));
      const [deductionRows, sumRows] = await Promise.all([
        deductionIds.length ? tx.select().from(financeRequestDeduction).where(inArray(financeRequestDeduction.id, deductionIds)) : [],
        deductionIds.length
          ? tx
              .select({
                id: financeRequestDeductionRemittanceAllocation.id,
                requestDeductionId: financeRequestDeductionRemittanceAllocation.requestDeductionId,
                allocatedAmount: financeRequestDeductionRemittanceAllocation.allocatedAmount,
              })
              .from(financeRequestDeductionRemittanceAllocation)
              .where(inArray(financeRequestDeductionRemittanceAllocation.requestDeductionId, deductionIds))
              .orderBy(desc(financeRequestDeductionRemittanceAllocation.createdAt))
          : [],
      ]);
      const sumsByDeduction = new Map<string, any[]>();
      for (const row of sumRows) {
        const list = sumsByDeduction.get(row.requestDeductionId) ?? [];
        list.push(row);
        sumsByDeduction.set(row.requestDeductionId, list);
      }
      const deductionMap = new Map(deductionRows.map((row) => [row.id, row] as const));
      for (const allocation of allocations) {
        const deduction = deductionMap.get(allocation.requestDeductionId) ?? null;
        if (deduction) deduction.remittanceAllocations = sumsByDeduction.get(deduction.id) ?? [];
        allocation.requestDeduction = deduction;
      }

      const allocationUpdates = dto.allocations ?? [];
      if (allocationUpdates.length > 0) {
      const currentById = new Map(allocations.map((allocation) => [allocation.id, allocation] as const));
        let nextTotal = 0;
        for (const allocation of allocations) {
          const override = allocationUpdates.find((entry) => entry.id === allocation.id);
          const nextAllocated = override?.allocated_amount ?? Number(allocation.allocatedAmount);
          const otherAllocated = this.sumAllocatedAmount(
            (allocation.requestDeduction.remittanceAllocations ?? []).filter((entry: any) => entry.id !== allocation.id),
          );
          if (nextAllocated + otherAllocated - Number(allocation.requestDeduction.amount) > 0.0001) {
            throw new BadRequestException(`Updated allocation exceeds deduction amount for ${allocation.requestDeduction.id}`);
          }
          nextTotal += nextAllocated;
        }
        if (dto.remittance_total_amount !== undefined && nextTotal - Number(dto.remittance_total_amount) > 0.0001) {
          throw new BadRequestException('Updated allocations exceed remittance total amount');
        }
        for (const entry of allocationUpdates) {
          if (!entry.id) continue;
          if (!currentById.has(entry.id)) throw new BadRequestException(`Allocation ${entry.id} not found on deduction`);
          if (entry.allocated_amount !== undefined) {
            await tx
              .update(financeRequestDeductionRemittanceAllocation)
              .set({ allocatedAmount: String(entry.allocated_amount) })
              .where(eq(financeRequestDeductionRemittanceAllocation.id, entry.id));
          }
        }
      }

      const patch: Record<string, any> = {};
      if (dto.remittance_number !== undefined) patch.remittanceNumber = dto.remittance_number || null;
      if (dto.remittance_ref !== undefined) patch.reference = dto.remittance_ref || null;
      if (dto.remitted_at !== undefined) patch.remittedAt = new Date(dto.remitted_at);
      if (dto.remittance_total_amount !== undefined) patch.totalAmount = String(dto.remittance_total_amount);
      if (dto.paid_from_account_id !== undefined) patch.paidFromAccountId = dto.paid_from_account_id || null;
      if (dto.payment_voucher_id !== undefined) patch.paymentVoucherId = dto.payment_voucher_id || null;
      if (dto.remitted_by !== undefined) patch.remittedBy = dto.remitted_by ? toBigInt(dto.remitted_by) : null;
      if (dto.evidence_file_id !== undefined) patch.evidenceFileId = dto.evidence_file_id || null;
      if (dto.evidence_file_ids !== undefined) patch.evidenceFileIds = dto.evidence_file_ids as any;
      if (dto.notes !== undefined) patch.notes = dto.notes || null;
      patch.updatedBy = existing.updatedBy ?? existing.createdBy;
      if (Object.keys(patch).length > 0) {
        await tx.update(financeRequestRemittance).set(patch).where(eq(financeRequestRemittance.id, id));
      }

      for (const allocation of allocations) {
        if (allocation.requestDeduction) {
          await this.syncDeductionRemittanceSummary(tx, allocation.requestDeduction.id);
        }
      }
      const [final] = await tx.select().from(financeRequestRemittance).where(eq(financeRequestRemittance.id, id)).limit(1);
      return final;
    });

    const enriched = await this.fillRemittanceRels([remittance], { deductions: 'map' });
    return this.mapRequestRemittance(enriched[0]);
  }

  async addRemittanceAllocations(id: string, dto: { deduction_ids: string[]; allocations?: Array<{ id?: string; allocated_amount?: number }> }, userId: number) {
    const [remittance] = (await this.db.client.select().from(financeRequestRemittance).where(eq(financeRequestRemittance.id, id)).limit(1)) as any[];
    if (!remittance) throw new NotFoundException('Remittance not found');

    const deductionRows = await this.db.client.select().from(financeRequestDeduction).where(inArray(financeRequestDeduction.id, dto.deduction_ids));
    const allocationRows = deductionRows.length > 0
      ? await this.db.client
          .select({ requestDeductionId: financeRequestDeductionRemittanceAllocation.requestDeductionId, allocatedAmount: financeRequestDeductionRemittanceAllocation.allocatedAmount })
          .from(financeRequestDeductionRemittanceAllocation)
          .where(inArray(financeRequestDeductionRemittanceAllocation.requestDeductionId, deductionRows.map((row) => row.id)))
      : [];
    const allocationsByDeduction = new Map<string, any[]>();
    for (const allocation of allocationRows) {
      const list = allocationsByDeduction.get(allocation.requestDeductionId) ?? [];
      list.push(allocation);
      allocationsByDeduction.set(allocation.requestDeductionId, list);
    }
    const deductions = deductionRows.map((row) => ({ ...row, remittanceAllocations: allocationsByDeduction.get(row.id) ?? [] }));
    if (deductions.length !== dto.deduction_ids.length) throw new NotFoundException('Some deductions were not found');

    const allocationMap = new Map((dto.allocations ?? []).map((allocation) => [allocation.id, Number(allocation.allocated_amount)]));
    const [aggRow] = await this.db.client
      .select({ value: sql<string>`coalesce(sum(${financeRequestDeductionRemittanceAllocation.allocatedAmount}), 0)` })
      .from(financeRequestDeductionRemittanceAllocation)
      .where(eq(financeRequestDeductionRemittanceAllocation.requestRemittanceId, id));
    let newTotal = Number(aggRow?.value ?? 0);

    for (const deduction of deductions) {
      const alreadyAllocated = this.sumAllocatedAmount(deduction.remittanceAllocations);
      const remaining = Number(deduction.amount) - alreadyAllocated;
      const allocatedAmount = allocationMap.get(deduction.id) ?? remaining;
      if (allocatedAmount <= 0) throw new BadRequestException('allocated_amount must be greater than zero');
      if (allocatedAmount - remaining > 0.0001) throw new BadRequestException(`Allocation for deduction ${deduction.id} exceeds remaining balance`);
      newTotal += allocatedAmount;
    }

    if (newTotal - Number(remittance.totalAmount) > 0.0001) {
      throw new BadRequestException('Allocations exceed remittance total amount');
    }

    await this.db.client.transaction(async (tx) => {
      for (const deduction of deductions) {
        const alreadyAllocated = this.sumAllocatedAmount(deduction.remittanceAllocations);
        const remaining = Number(deduction.amount) - alreadyAllocated;
        const allocatedAmount = allocationMap.get(deduction.id) ?? remaining;
        await tx.insert(financeRequestDeductionRemittanceAllocation).values({
          requestDeductionId: deduction.id,
          requestRemittanceId: id,
          allocatedAmount: String(allocatedAmount),
          createdBy: toBigInt(userId),
        });
        await this.syncDeductionRemittanceSummary(tx, deduction.id);
      }
    });

    return this.listRequestRemittances({ id, page: '1', per_page: '1' }).then((res: any) => res.data.items[0]);
  }

  async listRemittedDeductionsForRequest(requestId: string) {
    return this.db.client
      .select({ id: financeRequestRemittance.id, remittanceNumber: financeRequestRemittance.remittanceNumber })
      .from(financeRequestRemittance)
      .where(
        exists(
          this.db.client
            .select({ id: financeRequestDeductionRemittanceAllocation.id })
            .from(financeRequestDeductionRemittanceAllocation)
            .innerJoin(financeRequestDeduction, eq(financeRequestDeductionRemittanceAllocation.requestDeductionId, financeRequestDeduction.id))
            .where(
              and(
                eq(financeRequestDeductionRemittanceAllocation.requestRemittanceId, financeRequestRemittance.id),
                eq(financeRequestDeduction.requestId, toBigInt(requestId)),
              ),
            ),
        ),
      )
      .orderBy(asc(financeRequestRemittance.remittedAt), asc(financeRequestRemittance.createdAt));
  }

  async generateTrmSlipPdf(id: string) {
    const { buffer, fileName } = await this.buildTrmSlipPdf(id);
    return { file_name: fileName, mime_type: 'application/pdf', content_base64: buffer.toString('base64') };
  }

  async buildTrmSlipPdf(id: string): Promise<{ buffer: Buffer; fileName: string }> {
    const [remittance] = (await this.db.client.select().from(financeRequestRemittance).where(eq(financeRequestRemittance.id, id)).limit(1)) as any[];
    if (!remittance) throw new NotFoundException('Remittance not found');
    await this.fillRemittanceRels([remittance], { deductions: 'pdf' });
    if ((remittance.allocations ?? []).length === 0) throw new BadRequestException('Remittance has no allocated deductions');

    const org = await this.fetchOrgSettings();
    const primaryAllocation = remittance.allocations[0];
    const primaryRequest = primaryAllocation.requestDeduction.request;
    const requestNumber = (primaryRequest?.data as any)?.request_number ?? String(primaryAllocation.requestDeduction.requestId);
    const creatorName = primaryRequest?.creator
      ? `${primaryRequest.creator.firstName ?? ''} ${primaryRequest.creator.lastName ?? ''}`.trim() || primaryRequest.creator.username || primaryRequest.creator.email || '—'
      : '—';
    const remittedByName = remittance.remittedByUser
      ? `${remittance.remittedByUser.firstName ?? ''} ${remittance.remittedByUser.lastName ?? ''}`.trim() || remittance.remittedByUser.email
      : '—';
    const totalAllocatedAmount = this.sumAllocatedAmount(remittance.allocations);
    const evidenceIds = Array.isArray(remittance.evidenceFileIds) ? remittance.evidenceFileIds.map(String) : [];
    const evidenceFiles = evidenceIds.length > 0 ? await this.fileAssetsByIds(evidenceIds) : [];

    const logoDataUri = this.getPdfLogoDataUri();

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>${this.pdfDocStyle()}</style>
</head>
<body>
  <div class="card">
    <div class="rowpad">
      <div class="header-row">
        <div>${logoDataUri ? `<img src="${logoDataUri}" alt="Logo" style="height:42px;" />` : `<strong>${this.esc(org.org_name)}</strong>`}</div>
        <div>
          <div class="doc-title">Tax Remittance Slip</div>
          <div class="doc-subtitle" style="text-align:right; margin-top:4px;">
            <span class="ref-badge">${this.esc(remittance.remittanceNumber ?? '—')}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="two-col">
      <div>
        <h3 style="margin:0 0 8px;">Remittance Details</h3>
        <div class="detail-list">
          <div><strong>Remittance Date:</strong> ${this.fmtDate(remittance.remittedAt)}</div>
          <div><strong>Reference Number:</strong> ${this.esc(remittance.remittanceNumber ?? '—')}</div>
          <div><strong>Payment Reference:</strong> ${this.esc(remittance.reference ?? '—')}</div>
          <div><strong>Created / Remitted By:</strong> ${this.esc(remittedByName)}</div>
          <div><strong>Paid From:</strong> ${remittance.paidFromAccount ? `${this.esc(remittance.paidFromAccount.name)}${remittance.paidFromAccount.bankName ? ` — ${this.esc(remittance.paidFromAccount.bankName)}` : ''}` : '—'}</div>
          <div><strong>Payment Voucher:</strong> ${this.esc(remittance.paymentVoucher?.voucherNumber ?? '—')}</div>
        </div>
      </div>
      <div>
        <h3 style="margin:0 0 8px;">Source Transaction</h3>
        <div class="detail-list">
          <div><strong>Request Number:</strong> ${this.esc(requestNumber)}</div>
          <div><strong>Created By:</strong> ${this.esc(creatorName)}</div>
          <div><strong>Remittance Created:</strong> ${this.fmtDate(remittance.createdAt)}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="rowpad">
      <h3 style="margin:0 0 8px;">Deduction Detail</h3>
      <table class="tbl">
        <thead>
          <tr>
            <th>Request</th>
            <th>Deduction Type</th>
            <th>Gross Invoice Amount</th>
            <th>Amount Withheld</th>
            <th>Allocated</th>
          </tr>
        </thead>
        <tbody>
          ${remittance.allocations.map((allocation) => `<tr><td>${this.esc((allocation.requestDeduction.request?.data as any)?.request_number ?? String(allocation.requestDeduction.requestId))}</td><td>${this.esc(allocation.requestDeduction.deductionType.name)} (${this.esc(allocation.requestDeduction.deductionType.code)})</td><td>${this.fmtMoney(allocation.requestDeduction.grossAmount)}</td><td><strong>${this.fmtMoney(allocation.requestDeduction.amount)}</strong></td><td><strong>${this.fmtMoney(allocation.allocatedAmount)}</strong></td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="amount-box">
    <div class="label">Total Remitted</div>
    <div class="value">${this.fmtMoney(totalAllocatedAmount)}</div>
  </div>

  ${remittance.allocations.length > 0 ? `
  <div class="card">
    <div class="rowpad">
      <h3 style="margin:0 0 8px;">Allocation History</h3>
      <table class="tbl">
        <thead>
          <tr>
            <th>TRM Number</th>
            <th>Reference</th>
            <th>Date</th>
            <th>Allocated</th>
          </tr>
        </thead>
        <tbody>
          ${remittance.allocations.map((allocation) => `<tr><td>${this.esc(remittance.remittanceNumber)}</td><td>${this.esc(remittance.reference ?? '—')}</td><td>${this.fmtDate(remittance.remittedAt)}</td><td>${this.fmtMoney(allocation.allocatedAmount)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>` : ''}

  ${(remittance.notes || evidenceFiles.length > 0) ? `
  <div class="card">
    <div class="rowpad">
      ${remittance.notes ? `<h3 style="margin:0 0 6px;">Notes</h3><p style="margin:0; line-height:1.6;">${this.esc(remittance.notes)}</p>` : ''}
      ${evidenceFiles.length > 0 ? `<h3 style="margin:${remittance.notes ? '14px' : '0'} 0 6px;">Evidence Files</h3><ul>${evidenceFiles.map((file) => `<li>${this.esc(file.fileName)}</li>`).join('')}</ul>` : ''}
    </div>
  </div>` : ''}

  <div class="card">
    <div class="rowpad">
      <strong>Signatures</strong>
      <div class="sig-grid" style="margin-top:10px;">
        <div>
          <div class="sig-label">Prepared By</div>
          ${org.prepared_signature ? `<img src="${org.prepared_signature}" alt="Signature" style="height:36px; display:block; margin-bottom:4px;" />` : '<div class="sig-line"></div>'}
          <div class="sig-name">${org.prepared_by ? this.esc(org.prepared_by) : '____________________'}</div>
          <div class="muted">${this.esc(org.prepared_title)}</div>
        </div>
        <div>
          <div class="sig-label">Date</div>
          <div class="sig-line"></div>
          <div class="sig-name">${this.fmtDate(remittance.remittedAt)}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-note">
    This document was generated on ${this.fmtDate(new Date())}. TRM Reference: ${this.esc(remittance.remittanceNumber ?? '—')}
  </div>
</body>
</html>`;

    const slipBuffer = await this.pdfService.renderPdfFromHtml(html, [
      'TAX REMITTANCE SLIP',
      `Reference: ${remittance.remittanceNumber ?? '—'}`,
       `Amount: ${this.fmtMoney(totalAllocatedAmount)}`,
      `Remitted: ${this.fmtDate(remittance.remittedAt)}`,
      `Remitted By: ${remittedByName}`,
      `Payment Voucher: ${remittance.paymentVoucher?.voucherNumber ?? '—'}`,
      ...(evidenceFiles.length > 0 ? [`Evidence: ${evidenceFiles.map((file) => file.fileName).join(', ')}`] : []),
    ]);
    const mergedPdf = await PDFDocument.create();
    await this.appendPdfBuffer(mergedPdf, slipBuffer);
    const skippedFiles: string[] = [];
    for (const file of evidenceFiles) {
      if (!file) {
        skippedFiles.push('Evidence file (missing metadata)');
        continue;
      }
      const buffer = await this.readAssetFileBuffer(file);
      await this.appendAssetToPdf(mergedPdf, buffer, file.fileName ?? file.fileName, file.mimeType ?? null, skippedFiles);
    }
    if (skippedFiles.length > 0) {
      await this.appendTextPage(mergedPdf, 'Skipped Evidence Files', skippedFiles);
    }
    const buffer = Buffer.from(await mergedPdf.save());
    const fileName = `TRM-${(remittance.remittanceNumber ?? id).replace(/\//g, '-')}.pdf`;
    return { buffer, fileName };
  }

  async generateWhtCertificatePdf(pvDeductionId: string) {
    const [pvd] = (await this.db.client.select().from(financePVDeduction).where(eq(financePVDeduction.id, pvDeductionId)).limit(1)) as any[];
    if (!pvd) throw new NotFoundException('PV deduction not found');

    const [deductionType] = await this.db.client.select().from(financeDeductionType).where(eq(financeDeductionType.id, pvd.deductionTypeId)).limit(1);
    pvd.deductionType = deductionType ?? null;

    const [paymentVoucherRow] = (await this.db.client.select().from(financePaymentVoucher).where(eq(financePaymentVoucher.id, pvd.paymentVoucherId)).limit(1)) as any[];
    pvd.paymentVoucher = paymentVoucherRow ?? null;

    if (paymentVoucherRow) {
      const tid = this.tenantContext.currentTenantId();
      const [request] = await this.db.client
        .select({ id: requestInstance.id, createdBy: requestInstance.createdBy, data: requestInstance.data, createdAt: requestInstance.createdAt })
        .from(requestInstance)
        .where(and(eq(requestInstance.id, paymentVoucherRow.requestId), tid ? eq(requestInstance.tenantId, tid) : undefined))
        .limit(1);
      if (request) {
        const [creator] = await this.db.client
          .select({ id: profile.id, firstName: profile.firstName, lastName: profile.lastName, email: profile.email })
          .from(profile)
          .where(eq(profile.id, request.createdBy))
          .limit(1);
        paymentVoucherRow.request = {
          id: request.id,
          data: request.data,
          createdAt: request.createdAt,
          creator: creator ?? null,
        };
      } else {
        paymentVoucherRow.request = null;
      }
      const [contact] = paymentVoucherRow.contactId
        ? await this.db.client
            .select({ id: financeContact.id, name: financeContact.name, email: financeContact.email, phone: financeContact.phone })
            .from(financeContact)
            .where(eq(financeContact.id, paymentVoucherRow.contactId))
            .limit(1)
        : [null];
      paymentVoucherRow.contact = contact ?? null;
    }

    if (pvd.requestDeductionId) {
      const [requestDeduction] = (await this.db.client.select().from(financeRequestDeduction).where(eq(financeRequestDeduction.id, pvd.requestDeductionId)).limit(1)) as any[];
      pvd.requestDeduction = requestDeduction ?? null;
      if (requestDeduction) {
        const latest = ((await this.db.client
          .select()
          .from(financeRequestDeductionRemittanceAllocation)
          .where(eq(financeRequestDeductionRemittanceAllocation.requestDeductionId, requestDeduction.id))
          .orderBy(desc(financeRequestDeductionRemittanceAllocation.createdAt))
          .limit(1)) as any[])[0] ?? null;
        if (latest) {
          const [remittance] = (await this.db.client
            .select({ id: financeRequestRemittance.id, remittanceNumber: financeRequestRemittance.remittanceNumber, remittedAt: financeRequestRemittance.remittedAt, reference: financeRequestRemittance.reference })
            .from(financeRequestRemittance)
            .where(eq(financeRequestRemittance.id, latest.requestRemittanceId))
            .limit(1)) as any[];
          latest.requestRemittance = remittance ?? null;
          requestDeduction.remittanceAllocations = [latest];
        } else {
          requestDeduction.remittanceAllocations = [];
        }
      }
    } else {
      pvd.requestDeduction = null;
    }

    let certificateNumber = pvd.certificateNumber;
    if (!certificateNumber) {
      const year = new Date().getFullYear();
      const startsWith = `WHT/${year}/`;
      const [countRow] = await this.db.client
        .select({ value: count() })
        .from(financePVDeduction)
        .where(like(financePVDeduction.certificateNumber, `${startsWith}%`));
      certificateNumber = `WHT/${year}/${String(Number(countRow?.value ?? 0) + 1).padStart(3, '0')}`;
      await this.db.client.update(financePVDeduction).set({ certificateNumber }).where(eq(financePVDeduction.id, pvd.id));
    }

    const pv = pvd.paymentVoucher;
    const request = pv.request;
    const requestNumber = (request?.data as any)?.request_number ?? String(pv.requestId);
    const org = await this.fetchOrgSettings();

    const trmRecord = pvd.requestDeduction?.remittanceAllocations?.[0]?.requestRemittance ?? null;

    const vendorName = pv.contact?.name ?? (request?.creator ? `${request.creator.firstName ?? ''} ${request.creator.lastName ?? ''}`.trim() : '—');
    const vendorEmail = pv.contact?.email ?? request?.creator?.email ?? '';

    const pvDate = this.fmtDate(pv.disbursedAt);
    const certDate = trmRecord?.remittedAt ? this.fmtDate(trmRecord.remittedAt) : this.fmtDate(new Date());

    const logoDataUri = this.getPdfLogoDataUri();

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>${this.pdfDocStyle()}</style>
</head>
<body>
  <div class="card">
    <div class="rowpad">
      <div class="header-row">
        <div>${logoDataUri ? `<img src="${logoDataUri}" alt="Logo" style="height:42px;" />` : `<strong>${this.esc(org.org_name)}</strong>`}</div>
        <div>
          <div class="doc-title">Withholding Tax Certificate</div>
          <div class="doc-subtitle" style="text-align:right; margin-top:4px;">
            <span class="ref-badge">${this.esc(certificateNumber)}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="rowpad" style="background:#fafafa; font-size:11px; color:#475569; line-height:1.6;">
      This certificate confirms that ${this.esc(org.org_name)} has withheld and remitted
      <strong>${this.esc(pvd.deductionType.name)}</strong> on payment made to the party named below, in accordance with applicable tax regulations.
    </div>

    <div class="two-col">
      <div>
        <h3 style="margin:0 0 8px;">Vendor / Payee</h3>
        <div class="detail-list">
          <div><strong>Name:</strong> <strong>${this.esc(vendorName)}</strong></div>
          ${vendorEmail ? `<div><strong>Email:</strong> ${this.esc(vendorEmail)}</div>` : ''}
          ${pv.contact?.phone ? `<div><strong>Phone:</strong> ${this.esc(pv.contact.phone)}</div>` : ''}
        </div>
      </div>
      <div>
        <h3 style="margin:0 0 8px;">Payment Details</h3>
        <div class="detail-list">
          <div><strong>Certificate No:</strong> ${this.esc(certificateNumber)}</div>
          <div><strong>Request Number:</strong> ${this.esc(requestNumber)}</div>
          <div><strong>Payment Voucher:</strong> ${this.esc(pv.voucherNumber)}</div>
          <div><strong>Payment Date:</strong> ${pvDate}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="rowpad">
      <h3 style="margin:0 0 8px;">Tax Deduction</h3>
      <table class="tbl">
        <thead>
          <tr>
            <th>Deduction Type</th>
            <th>Rate</th>
            <th>Gross Invoice Amount</th>
            <th>Amount Withheld</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${this.esc(pvd.deductionType.name)} (${this.esc(pvd.deductionType.code)})</td>
            <td>${(Number(pvd.rate) * 100).toFixed(1)}%</td>
            <td>${this.fmtMoney(pvd.grossAmount)}</td>
            <td><strong>${this.fmtMoney(pvd.deductionAmount)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="amount-box">
    <div class="label">Tax Withheld &amp; Remitted</div>
    <div class="value">${this.fmtMoney(pvd.deductionAmount)}</div>
  </div>

  <div class="card">
    <div class="rowpad">
      <h3 style="margin:0 0 8px;">Remittance Confirmation</h3>
      ${trmRecord ? `
      <table class="tbl">
        <thead>
          <tr>
            <th>TRM Reference</th>
            <th>Remittance Reference</th>
            <th>Remitted On</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${this.esc(trmRecord.remittanceNumber ?? '—')}</strong></td>
            <td>${this.esc(trmRecord.reference ?? '—')}</td>
            <td>${this.fmtDate(trmRecord.remittedAt)}</td>
          </tr>
        </tbody>
      </table>
      ` : '<p style="color:#b45309; font-size:11px; margin:0;">Note: Remittance to tax authority is pending.</p>'}
    </div>
  </div>

  <div class="card">
    <div class="rowpad">
      <strong>Signatures</strong>
      <div class="sig-grid" style="margin-top:10px;">
        <div>
          <div class="sig-label">Prepared By</div>
          ${org.prepared_signature ? `<img src="${org.prepared_signature}" alt="Signature" style="height:36px; display:block; margin-bottom:4px;" />` : '<div class="sig-line"></div>'}
          <div class="sig-name">${org.prepared_by ? this.esc(org.prepared_by) : '____________________'}</div>
          <div class="muted">${this.esc(org.prepared_title)}</div>
          <div class="muted">Date: ${certDate}</div>
        </div>
        <div>
          <div class="sig-label">Authorised Signatory</div>
          ${org.approved_signature ? `<img src="${org.approved_signature}" alt="Signature" style="height:36px; display:block; margin-bottom:4px;" />` : '<div class="sig-line"></div>'}
          <div class="sig-name">${org.approved_by ? this.esc(org.approved_by) : '____________________'}</div>
          <div class="muted">${this.esc(org.approved_title)}</div>
          <div class="muted">Date: _______________</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer-note">
    This certificate is issued for tax credit purposes. Certificate No: ${this.esc(certificateNumber)}${trmRecord?.remittanceNumber ? ` — TRM Ref: ${this.esc(trmRecord.remittanceNumber)}` : ''} — ${this.fmtDate(new Date())}
  </div>
</body>
</html>`;

    const buffer = await this.pdfService.renderPdfFromHtml(html, [
      'WITHHOLDING TAX CERTIFICATE',
      `Certificate No: ${certificateNumber}`,
      `Payment Voucher: ${pv.voucherNumber}`,
      `Vendor: ${vendorName}`,
      `Amount Withheld: ${this.fmtMoney(pvd.deductionAmount)}`,
    ]);
    const fileName = `WHT-Certificate-${certificateNumber.replace(/\//g, '-')}.pdf`;
    return { file_name: fileName, mime_type: 'application/pdf', content_base64: buffer.toString('base64') };
  }
}
