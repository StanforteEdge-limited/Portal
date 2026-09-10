import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { UpsertDeductionTypeDto } from './dto/upsert-deduction-type.dto';
import { ApplyPVDeductionsDto } from './dto/apply-pv-deductions.dto';
import { CreateWHTRemittanceDto } from './dto/create-wht-remittance.dto';
import { RequestRemittancesQueryDto, StatutoryDeductionsQueryDto, RemitStatutoryDeductionsDto } from './dto/statutory-deductions.dto';
import { PdfService } from '../../common/pdf/pdf.service';

@Injectable()
export class DeductionService {
  private readonly logger = new Logger(DeductionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  private sumAllocatedAmount(allocations: Array<{ allocatedAmount: Prisma.Decimal | number | string }>): number {
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

  private async nextRequestRemittanceNumber(remittedAt: Date) {
    const year = remittedAt.getFullYear();
    const count = await this.prisma.financeRequestRemittance.count({
      where: {
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });
    return `TRM/${year}/${String(count + 500).padStart(3, '0')}`;
  }

  private async hydrateEvidenceFiles(fileIds: unknown) {
    const ids = Array.isArray(fileIds) ? fileIds.map(String) : [];
    if (ids.length === 0) return [];
    const files = await this.prisma.fileAsset.findMany({
      where: { id: { in: ids } },
      select: { id: true, fileName: true, publicUrl: true },
    });
    const fileMap = new Map(files.map((file) => [file.id, file]));
    return ids
      .map((id) => fileMap.get(id))
      .filter(Boolean)
      .map((file: any) => ({ id: file.id, file_name: file.fileName, public_url: file.publicUrl ?? null }));
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
    tx: Prisma.TransactionClient,
    deductionId: string,
  ) {
    const deduction = await tx.financeRequestDeduction.findUnique({
      where: { id: deductionId },
      include: {
        remittanceAllocations: {
          include: {
            requestRemittance: true,
          },
          orderBy: [{ requestRemittance: { remittedAt: 'desc' } }, { createdAt: 'desc' }],
        },
      },
    });
    if (!deduction) return;

    const allocations = deduction.remittanceAllocations;
    const allocatedAmount = this.sumAllocatedAmount(allocations);
    const status = this.deriveDeductionStatus(Number(deduction.amount), allocatedAmount);

    await tx.financeRequestDeduction.update({
      where: { id: deductionId },
      data: {
        status,
      },
    });
  }

  // ── PDF Helpers ───────────────────────────────────────────────────────────

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
    const row = await this.prisma.financeSetting.findUnique({ where: { key: 'default' }, select: { config: true } });
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
    const asset = await this.prisma.fileAsset.findUnique({ where: { id: fileId } });
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

  // ── Deduction Types ──────────────────────────────────────────────────────

  async listDeductionTypes(query: Record<string, any>) {
    const where: any = {};
    if (query.organization_id) where.organizationId = toBigInt(query.organization_id);
    if (query.is_active !== undefined) where.isActive = query.is_active === 'true' || query.is_active === true;
    if (query.applies_to) where.appliesTo = String(query.applies_to);

    const rows = await this.prisma.financeDeductionType.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { glAccount: { select: { id: true, name: true, code: true } } },
    });
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
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
        const existing = await this.prisma.financeDeductionType.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Deduction type not found');
        return await this.prisma.financeDeductionType.update({ where: { id }, data });
      }

      if (!dto.name || !dto.code || dto.rate === undefined) {
        throw new BadRequestException('name, code, and rate are required when creating a deduction type');
      }

      return await this.prisma.financeDeductionType.create({
        data: {
          ...data,
          name: dto.name,
          code: dto.code,
          rate: dto.rate,
          appliesTo: dto.applies_to ?? 'vendor',
          isActive: dto.is_active ?? true,
          createdBy: toBigInt(userId),
          organizationId: organizationId ? toBigInt(organizationId) : null,
        },
      });
    } catch (e) {
      this.logger.error(`upsertDeductionType error: ${e instanceof Error ? e.stack : String(e)}`);
      throw e;
    }
  }

  // ── PV Deductions ────────────────────────────────────────────────────────

  async applyPVDeductions(pvId: string, dto: ApplyPVDeductionsDto, userId: number) {
    const pv = await this.prisma.financePaymentVoucher.findUnique({
      where: { id: pvId },
      include: { contact: true },
    });
    if (!pv) throw new NotFoundException('Payment voucher not found');

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const existingPVDeductions = await tx.financePVDeduction.findMany({
        where: { paymentVoucherId: pvId },
        select: { requestDeductionId: true },
      });
      const linkedRequestDeductionIds = existingPVDeductions
        .map((row) => row.requestDeductionId)
        .filter((value): value is string => Boolean(value));

      // Remove any previously applied deductions for this PV
      await tx.financePVDeduction.deleteMany({ where: { paymentVoucherId: pvId } });
      await tx.financeVendorWHTAccrual.deleteMany({ where: { paymentVoucherId: pvId } });
      if (linkedRequestDeductionIds.length > 0) {
        await tx.financeRequestDeduction.deleteMany({ where: { id: { in: linkedRequestDeductionIds } } });
      }

      const createdDeductions = [] as Array<{ id: string; deductionTypeId: string; grossAmount: Prisma.Decimal; deductionAmount: Prisma.Decimal; requestDeductionId: string | null }>;
      for (const line of dto.deductions) {
        const requestDeduction = pv.requestId
          ? await tx.financeRequestDeduction.create({
              data: {
                requestId: pv.requestId,
                deductionTypeId: line.deduction_type_id,
                amount: line.deduction_amount,
                rate: line.rate,
                grossAmount: line.gross_amount,
                status: 'pending',
                createdBy: toBigInt(userId),
                updatedAt: now,
              },
            })
          : null;

        const deduction = await tx.financePVDeduction.create({
          data: {
            paymentVoucherId: pvId,
            deductionTypeId: line.deduction_type_id,
            requestDeductionId: requestDeduction?.id ?? null,
            rate: line.rate,
            grossAmount: line.gross_amount,
            deductionAmount: line.deduction_amount,
            createdBy: toBigInt(userId),
            updatedAt: now,
          },
        });
        createdDeductions.push(deduction);
      }

      // Create accruals for contact-linked PVs
      if (pv.contactId) {
        await Promise.all(
          createdDeductions.map((deduction) =>
            tx.financeVendorWHTAccrual.create({
              data: {
                contactId: pv.contactId!,
                paymentVoucherId: pvId,
                pvDeductionId: deduction.id,
                deductionTypeId: deduction.deductionTypeId,
                periodYear: now.getFullYear(),
                periodMonth: now.getMonth() + 1,
                grossAmount: deduction.grossAmount,
                withheldAmount: deduction.deductionAmount,
                organizationId: null,
                updatedAt: now,
              },
            }),
          ),
        );
      }

      // Update PV net amount
      const totalDeducted = dto.deductions.reduce((sum, d) => sum + d.deduction_amount, 0);
      const grossAmount = dto.deductions[0]?.gross_amount ?? null;
      await tx.financePaymentVoucher.update({
        where: { id: pvId },
        data: {
          grossAmount: grossAmount,
          netAmount: grossAmount !== null ? grossAmount - totalDeducted : null,
        },
      });

      return { deductions: createdDeductions, total_deducted: totalDeducted };
    });
  }

  async listPVDeductions(pvId: string) {
    const rows = await this.prisma.financePVDeduction.findMany({
      where: { paymentVoucherId: pvId },
      include: { deductionType: true, requestDeduction: true },
      orderBy: { createdAt: 'asc' },
    });
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  // ── Vendor WHT Accruals ──────────────────────────────────────────────────

  async listVendorAccruals(vendorId: string, query: Record<string, any>) {
    const where: any = { vendorId };
    if (query.period_year) where.periodYear = Number(query.period_year);
    if (query.period_month) where.periodMonth = Number(query.period_month);
    if (query.unremitted === 'true') where.remittanceId = null;
    if (query.deduction_type_id) where.deductionTypeId = String(query.deduction_type_id);

    const rows = await this.prisma.financeVendorWHTAccrual.findMany({
      where,
      include: {
        deductionType: true,
        paymentVoucher: { select: { id: true, voucherNumber: true, createdAt: true } },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  // ── WHT Remittances ──────────────────────────────────────────────────────

  async createWHTRemittance(dto: CreateWHTRemittanceDto, userId: number, organizationId?: number) {
    if (!dto.accrual_ids || dto.accrual_ids.length === 0) {
      throw new BadRequestException('accrual_ids must not be empty');
    }

    const accruals = await this.prisma.financeVendorWHTAccrual.findMany({
      where: { id: { in: dto.accrual_ids } },
    });

    const alreadyRemitted = accruals.filter((a) => a.remittanceId !== null);
    if (alreadyRemitted.length > 0) {
      throw new BadRequestException(
        `${alreadyRemitted.length} accrual(s) have already been remitted`,
      );
    }

    const year = dto.period_year;
    const month = String(dto.period_month).padStart(2, '0');
    const seq = await this.prisma.financeWHTRemittance.count({
      where: { periodYear: dto.period_year, periodMonth: dto.period_month },
    });
    const remittanceNumber = `WHT-${year}-${month}-${String(seq + 1).padStart(3, '0')}`;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const remittance = await tx.financeWHTRemittance.create({
        data: {
          remittanceNumber,
          deductionTypeId: dto.deduction_type_id,
          periodYear: dto.period_year,
          periodMonth: dto.period_month,
          totalAmount: dto.total_amount,
          paidFromAccountId: dto.paid_from_account_id,
          remittanceDate: new Date(dto.remittance_date),
          reference: dto.reference ?? null,
          receiptFileId: dto.receipt_file_id ?? null,
          notes: dto.notes ?? null,
          status: 'pending',
          organizationId: organizationId ? toBigInt(organizationId) : null,
          createdBy: toBigInt(userId),
          updatedAt: now,
        },
      });

      await tx.financeVendorWHTAccrual.updateMany({
        where: { id: { in: dto.accrual_ids } },
        data: { remittanceId: remittance.id, remittedAt: now, updatedAt: now },
      });

      return remittance;
    });
  }

  async listWHTRemittances(query: Record<string, any>) {
    const where: any = {};
    if (query.period_year) where.periodYear = Number(query.period_year);
    if (query.period_month) where.periodMonth = Number(query.period_month);
    if (query.deduction_type_id) where.deductionTypeId = String(query.deduction_type_id);
    if (query.status) where.status = String(query.status);
    if (query.organization_id) where.organizationId = toBigInt(query.organization_id);

    const rows = await this.prisma.financeWHTRemittance.findMany({
      where,
      include: {
        deductionType: true,
        paidFromAccount: { select: { id: true, name: true } },
        accruals: { include: { contact: { select: { id: true, name: true } } } },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
    return paginatedResponse(rows, { page: 1, per_page: rows.length, total: rows.length });
  }

  async getWHTRemittance(id: string) {
    const remittance = await this.prisma.financeWHTRemittance.findUnique({
      where: { id },
      include: {
        deductionType: true,
        paidFromAccount: { select: { id: true, name: true } },
        accruals: {
          include: {
            contact: { select: { id: true, name: true, taxNumber: true } },
            paymentVoucher: { select: { id: true, voucherNumber: true } },
          },
        },
      },
    });
    if (!remittance) throw new NotFoundException('WHT remittance not found');
    return remittance;
  }

  // ── Request-level Statutory Deductions ──────────────────────────────────

  async listRequestDeductions(query: StatutoryDeductionsQueryDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(200, Math.max(1, Number(query.per_page ?? 50)));
    const skip = (page - 1) * perPage;

    const where: Prisma.FinanceRequestDeductionWhereInput = {};
    if (query.id) where.id = query.id;
    if (query.status) where.status = query.status;
    if (query.deduction_type_id) where.deductionTypeId = query.deduction_type_id;
    if (query.request_id) where.requestId = toBigInt(query.request_id);
    const remittanceAllocationFilters: Prisma.FinanceRequestDeductionRemittanceAllocationWhereInput[] = [];
    if (query.remittance_ref) remittanceAllocationFilters.push({ requestRemittance: { reference: query.remittance_ref } });
    if (query.remittance_number) remittanceAllocationFilters.push({ requestRemittance: { remittanceNumber: query.remittance_number } });
    if (query.payment_voucher_id) remittanceAllocationFilters.push({ requestRemittance: { paymentVoucherId: query.payment_voucher_id } });
    if (remittanceAllocationFilters.length === 1) {
      where.remittanceAllocations = { some: remittanceAllocationFilters[0] };
    } else if (remittanceAllocationFilters.length > 1) {
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, ...remittanceAllocationFilters.map((filter) => ({ remittanceAllocations: { some: filter } }))];
    }
    if (query.search) {
      where.request = { data: { path: ['request_number'], string_contains: query.search } };
    }
    if (query.date_from || query.date_to) {
      where.createdAt = {
        ...(query.date_from ? { gte: new Date(query.date_from) } : {}),
        ...(query.date_to ? { lte: new Date(query.date_to) } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.financeRequestDeduction.findMany({
        where,
        include: {
          deductionType: { select: { id: true, name: true, code: true } },
          request: { select: { id: true, createdAt: true, status: true, data: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
          pvDeduction: {
            select: {
              paymentVoucher: { select: { id: true, voucherNumber: true } },
            },
          },
          remittanceAllocations: {
            include: {
              requestRemittance: {
                include: {
                  remittedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
                  paymentVoucher: { select: { id: true, voucherNumber: true } },
                  paidFromAccount: { select: { id: true, name: true, bankName: true, accountNumber: true } },
                  evidenceFile: { select: { id: true, fileName: true, publicUrl: true } },
                },
              },
            },
            orderBy: [{ requestRemittance: { remittedAt: 'desc' } }, { createdAt: 'desc' }],
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.prisma.financeRequestDeduction.count({ where }),
    ]);

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
      ? await this.prisma.fileAsset.findMany({
          where: { id: { in: extraEvidenceIds } },
          select: { id: true, fileName: true, publicUrl: true },
        })
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

    const where: Prisma.FinanceRequestRemittanceWhereInput = {};
    if (query.id) where.id = query.id;
    if (query.remittance_number) where.remittanceNumber = query.remittance_number;
    if (query.reference) where.reference = query.reference;
    if (query.payment_voucher_id) where.paymentVoucherId = query.payment_voucher_id;
    if (query.search) {
      where.OR = [
        { remittanceNumber: { contains: query.search, mode: 'insensitive' } },
        { reference: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.financeRequestRemittance.findMany({
        where,
        include: {
          paymentVoucher: { select: { id: true, voucherNumber: true } },
          remittedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          paidFromAccount: { select: { id: true, name: true, bankName: true, accountNumber: true } },
          evidenceFile: { select: { id: true, fileName: true, publicUrl: true } },
          allocations: {
            include: {
              requestDeduction: {
                include: {
                  deductionType: { select: { id: true, name: true, code: true } },
                  request: { select: { id: true, data: true } },
                  pvDeduction: {
                    select: {
                      paymentVoucher: { select: { id: true, voucherNumber: true } },
                    },
                  },
                  remittanceAllocations: { select: { allocatedAmount: true } },
                },
              },
            },
            orderBy: [{ createdAt: 'asc' }],
          },
        },
        orderBy: [{ remittedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: perPage,
      }),
      this.prisma.financeRequestRemittance.count({ where }),
    ]);

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

    const existing = await this.prisma.financeRequestDeduction.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, amount: true, remittanceAllocations: { select: { allocatedAmount: true } } },
    });

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

    const created = await this.prisma.$transaction(async (tx) => {
      const remittance = await tx.financeRequestRemittance.create({
        data: {
          remittanceNumber,
          reference: dto.reference,
          totalAmount: remittanceTotalAmount,
          remittedAt: now,
          paymentVoucherId: dto.payment_voucher_id ?? null,
          remittedBy: dto.remitted_by ? toBigInt(dto.remitted_by) : null,
          paidFromAccountId: dto.paid_from_account_id ?? null,
          evidenceFileId: dto.evidence_file_id ?? null,
          evidenceFileIds: dto.evidence_file_ids ? (dto.evidence_file_ids as any) : (dto.evidence_file_id ? [dto.evidence_file_id] as any : null),
          notes: dto.notes ?? null,
          createdBy: toBigInt(userId),
          updatedBy: toBigInt(userId),
        },
      });

      for (const deductionId of ids) {
        const deduction = existing.find((row) => row.id === deductionId);
        const alreadyAllocated = deduction ? this.sumAllocatedAmount(deduction.remittanceAllocations) : 0;
        const remaining = deduction ? Number(deduction.amount) - alreadyAllocated : 0;
        const allocatedAmount = allocationMap.get(deductionId) ?? remaining;
        await tx.financeRequestDeductionRemittanceAllocation.create({
          data: {
            requestDeductionId: deductionId,
            requestRemittanceId: remittance.id,
            allocatedAmount,
            createdBy: toBigInt(userId),
          },
        });
        await this.syncDeductionRemittanceSummary(tx, deductionId);
      }

      return tx.financeRequestRemittance.findUnique({
        where: { id: remittance.id },
        include: {
          paymentVoucher: { select: { id: true, voucherNumber: true } },
          remittedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          paidFromAccount: { select: { id: true, name: true, bankName: true, accountNumber: true } },
          evidenceFile: { select: { id: true, fileName: true, publicUrl: true } },
          allocations: {
            include: {
              requestDeduction: {
                include: {
                  deductionType: { select: { id: true, name: true, code: true } },
                  request: { select: { id: true, data: true } },
                  pvDeduction: {
                    select: {
                      paymentVoucher: { select: { id: true, voucherNumber: true } },
                    },
                  },
                  remittanceAllocations: { select: { allocatedAmount: true } },
                },
              },
            },
          },
        },
      });
    });

    return created ? this.mapRequestRemittance(created) : { updated: ids.length };
  }

  async updatePendingDeduction(id: string, dto: {
    deduction_type_id?: string;
    gross_amount?: number;
    amount?: number;
    rate?: number;
    notes?: string;
  }) {
    const existing = await this.prisma.financeRequestDeduction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Deduction not found');
    if (existing.status !== 'pending') throw new BadRequestException('Only pending deductions can be edited');

    if (dto.deduction_type_id) {
      const dt = await this.prisma.financeDeductionType.findUnique({ where: { id: dto.deduction_type_id } });
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
    if (dto.gross_amount !== undefined) data.grossAmount = dto.gross_amount;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.rate !== undefined) data.rate = dto.rate;
    if (dto.notes !== undefined) data.notes = dto.notes || null;

    return this.prisma.financeRequestDeduction.update({ where: { id }, data });
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
    const existing = await this.prisma.financeRequestRemittance.findUnique({
      where: { id },
      include: { allocations: { include: { requestDeduction: { select: { id: true, amount: true } } } } },
    });
    if (!existing) throw new NotFoundException('Remittance not found');

    return this.prisma.$transaction(async (tx) => {
      const allocations = await tx.financeRequestDeductionRemittanceAllocation.findMany({
        where: { requestRemittanceId: id },
        include: { requestDeduction: { select: { id: true, amount: true, remittanceAllocations: { select: { id: true, allocatedAmount: true } } } } },
        orderBy: [{ createdAt: 'desc' }],
      });
      if (allocations.length === 0) throw new BadRequestException('No remittance allocations found for this remittance');

      const allocationUpdates = dto.allocations ?? [];
      if (allocationUpdates.length > 0) {
        const currentById = new Map(allocations.map((allocation) => [allocation.id, allocation]));
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
            await tx.financeRequestDeductionRemittanceAllocation.update({
              where: { id: entry.id },
              data: { allocatedAmount: entry.allocated_amount },
            });
          }
        }
      }

      const patch: Record<string, any> = {};
      if (dto.remittance_number !== undefined) patch.remittanceNumber = dto.remittance_number || null;
      if (dto.remittance_ref !== undefined) patch.reference = dto.remittance_ref || null;
      if (dto.remitted_at !== undefined) patch.remittedAt = new Date(dto.remitted_at);
      if (dto.remittance_total_amount !== undefined) patch.totalAmount = dto.remittance_total_amount;
      if (dto.paid_from_account_id !== undefined) patch.paidFromAccountId = dto.paid_from_account_id || null;
      if (dto.payment_voucher_id !== undefined) patch.paymentVoucherId = dto.payment_voucher_id || null;
      if (dto.remitted_by !== undefined) patch.remittedBy = dto.remitted_by ? toBigInt(dto.remitted_by) : null;
      if (dto.evidence_file_id !== undefined) patch.evidenceFileId = dto.evidence_file_id || null;
      if (dto.evidence_file_ids !== undefined) patch.evidenceFileIds = dto.evidence_file_ids as any;
      if (dto.notes !== undefined) patch.notes = dto.notes || null;
      patch.updatedBy = existing.updatedBy ?? existing.createdBy;
      if (Object.keys(patch).length > 0) {
        await tx.financeRequestRemittance.update({
          where: { id },
          data: patch,
        });
      }

      for (const allocation of allocations) {
        await this.syncDeductionRemittanceSummary(tx, allocation.requestDeduction.id);
      }
      return tx.financeRequestRemittance.findUnique({
        where: { id },
        include: {
          paymentVoucher: { select: { id: true, voucherNumber: true } },
          remittedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          paidFromAccount: { select: { id: true, name: true, bankName: true, accountNumber: true } },
          evidenceFile: { select: { id: true, fileName: true, publicUrl: true } },
          allocations: {
            include: {
              requestDeduction: {
                include: {
                  deductionType: { select: { id: true, name: true, code: true } },
                  request: { select: { id: true, data: true } },
                  pvDeduction: {
                    select: {
                      paymentVoucher: { select: { id: true, voucherNumber: true } },
                    },
                  },
                  remittanceAllocations: { select: { allocatedAmount: true } },
                },
              },
            },
          },
        },
      });
    });
  }

  async addRemittanceAllocations(id: string, dto: { deduction_ids: string[]; allocations?: Array<{ id?: string; allocated_amount?: number }> }, userId: number) {
    const remittance = await this.prisma.financeRequestRemittance.findUnique({ where: { id } });
    if (!remittance) throw new NotFoundException('Remittance not found');

    const deductions = await this.prisma.financeRequestDeduction.findMany({
      where: { id: { in: dto.deduction_ids } },
      select: { id: true, amount: true, remittanceAllocations: { select: { allocatedAmount: true } } },
    });
    if (deductions.length !== dto.deduction_ids.length) throw new NotFoundException('Some deductions were not found');

    const allocationMap = new Map((dto.allocations ?? []).map((allocation) => [allocation.id, Number(allocation.allocated_amount)]));
    const currentRemittanceAllocated = await this.prisma.financeRequestDeductionRemittanceAllocation.aggregate({
      where: { requestRemittanceId: id },
      _sum: { allocatedAmount: true },
    });
    let newTotal = Number(currentRemittanceAllocated._sum.allocatedAmount ?? 0);

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

    await this.prisma.$transaction(async (tx) => {
      for (const deduction of deductions) {
        const alreadyAllocated = this.sumAllocatedAmount(deduction.remittanceAllocations);
        const remaining = Number(deduction.amount) - alreadyAllocated;
        const allocatedAmount = allocationMap.get(deduction.id) ?? remaining;
        await tx.financeRequestDeductionRemittanceAllocation.create({
          data: {
            requestDeductionId: deduction.id,
            requestRemittanceId: id,
            allocatedAmount,
            createdBy: toBigInt(userId),
          },
        });
        await this.syncDeductionRemittanceSummary(tx, deduction.id);
      }
    });

    return this.listRequestRemittances({ id, page: '1', per_page: '1' }).then((res: any) => res.data.items[0]);
  }

  // ── TRM Slip PDF ──────────────────────────────────────────────────────────

  async listRemittedDeductionsForRequest(requestId: string) {
    return this.prisma.financeRequestRemittance.findMany({
      where: { allocations: { some: { requestDeduction: { requestId: toBigInt(requestId) } } } },
      select: { id: true, remittanceNumber: true },
      orderBy: [{ remittedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async generateTrmSlipPdf(id: string) {
    const { buffer, fileName } = await this.buildTrmSlipPdf(id);
    return { file_name: fileName, mime_type: 'application/pdf', content_base64: buffer.toString('base64') };
  }

  async buildTrmSlipPdf(id: string): Promise<{ buffer: Buffer; fileName: string }> {
    const remittance = await this.prisma.financeRequestRemittance.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        remittedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        paymentVoucher: { select: { id: true, voucherNumber: true } },
        paidFromAccount: { select: { id: true, name: true, bankName: true, accountNumber: true } },
        evidenceFile: { select: { id: true, fileName: true, publicUrl: true } },
        allocations: {
          include: {
            requestDeduction: {
                include: {
                  deductionType: true,
                  request: { select: { id: true, status: true, data: true, createdAt: true, creator: { select: { firstName: true, lastName: true, email: true, username: true } } } },
                  pvDeduction: {
                    select: {
                      paymentVoucher: { select: { id: true, voucherNumber: true } },
                    },
                  },
                },
            },
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
    if (!remittance) throw new NotFoundException('Remittance not found');
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
    const evidenceFiles = evidenceIds.length > 0
      ? await this.prisma.fileAsset.findMany({
          where: { id: { in: evidenceIds } },
          select: { id: true, fileName: true },
        })
      : [];

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
      const asset = await this.prisma.fileAsset.findUnique({ where: { id: file.id }, select: { id: true, fileName: true, mimeType: true, publicUrl: true, storagePath: true } });
      if (!asset) {
        skippedFiles.push(`${file.fileName} (missing metadata)`);
        continue;
      }
      const buffer = await this.readAssetFileBuffer(asset);
      await this.appendAssetToPdf(mergedPdf, buffer, asset.fileName ?? file.fileName, asset.mimeType ?? null, skippedFiles);
    }
    if (skippedFiles.length > 0) {
      await this.appendTextPage(mergedPdf, 'Skipped Evidence Files', skippedFiles);
    }
    const buffer = Buffer.from(await mergedPdf.save());
    const fileName = `TRM-${(remittance.remittanceNumber ?? id).replace(/\//g, '-')}.pdf`;
    return { buffer, fileName };
  }

  // ── WHT Certificate PDF ───────────────────────────────────────────────────

  async generateWhtCertificatePdf(pvDeductionId: string) {
    const pvd = await this.prisma.financePVDeduction.findUnique({
      where: { id: pvDeductionId },
      include: {
        deductionType: true,
        paymentVoucher: {
          include: {
            request: { select: { id: true, data: true, createdAt: true, creator: { select: { firstName: true, lastName: true, email: true } } } },
            contact: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        requestDeduction: {
          select: {
            remittanceAllocations: {
              include: {
                requestRemittance: {
                  select: {
                    remittanceNumber: true,
                    remittedAt: true,
                    reference: true,
                  },
                },
              },
              orderBy: [{ requestRemittance: { remittedAt: 'desc' } }, { createdAt: 'desc' }],
              take: 1,
            },
          },
        },
      },
    });
    if (!pvd) throw new NotFoundException('PV deduction not found');

    let certificateNumber = pvd.certificateNumber;
    if (!certificateNumber) {
      const year = new Date().getFullYear();
      const startsWith = `WHT/${year}/`;
      const count = await this.prisma.financePVDeduction.count({
        where: { certificateNumber: { startsWith } },
      });
      certificateNumber = `WHT/${year}/${String(count + 1).padStart(3, '0')}`;
      await this.prisma.financePVDeduction.update({
        where: { id: pvd.id },
        data: { certificateNumber },
      });
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
