import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import Handlebars from 'handlebars';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PdfService } from '$core/pdf';

export type DocumentIds = {
  requestId?: string;
  voucherId?: string;
  invoiceId?: string;
  options?: Record<string, unknown>;
};

export type DocumentOutput = {
  buffer: Buffer;
  mimeType: 'application/pdf' | 'application/zip';
  fileName: string;
  artifactType: string;
};

export type DocumentResponse = {
  file_name: string;
  mime_type: string;
  content_base64: string;
  generated_at: string;
  request_id?: string;
};

export interface Document<TContext> {
  fetchContext(ids: DocumentIds): Promise<TContext>;
  render(ctx: TContext): Promise<DocumentOutput>;
  getTitle?(ctx: TContext): string;
}

export type ThreadEntry = {
  type: 'submission' | 'approval' | 'clearance' | 'rejection' | 'return';
  actor_name: string | null;
  actor_email?: string | null;
  role_label: string;
  comment?: string | null;
  at: Date;
  attachments?: Array<{ id?: string; name: string }>;
};

export type RequestThread = ThreadEntry[];

export type Signatory = {
  name: string;
  title: string;
  signatureDataUri: string | null;
};

export type Signatories = {
  prepared_by: Signatory;
  reviewed_by: Signatory;
  approved_by: Signatory;
};

export type ApprovalSummary = {
  done: Array<{
    action: string;
    step: string;
    performed_by: string | null;
    performed_by_name: string | null;
    performed_by_email: string | null;
    comment: string | null;
    at: Date;
  }>;
  pending: Array<{
    step: string;
    approver_type: string;
    approver_id: string | null;
  }>;
};

export type FullPaymentVoucher = Record<string, any>;

export type RequestRemittanceAllocationSummary = {
  deductionId: string;
  requestNumber: string;
  voucherNumber: string | null;
  deductionTypeName: string;
  deductionTypeCode: string;
  withheldAmount: number;
  allocatedTotal: number;
  remainingBalance: number;
  allocations: Array<{
    allocationId: string;
    remittanceNumber: string;
    remittanceRef: string | null;
    allocatedAmount: number;
    remittedAt: Date | string | null;
  }>;
};

type ApprovalSignatoryInput = {
  isManualImport: boolean;
  workflowStep?: any;
  manual?: Record<string, unknown>;
};

type ApprovalRoleRowInput = {
  roleLabel: string;
  name?: string | null;
  date?: Date | string | null;
  done?: boolean;
};

type VoucherPageHtmlInput = {
  pageBreak?: boolean;
  logoDataUri?: string | null;
  voucherNo: string;
  dateText: string;
  payee: string;
  contact: string;
  itemsHtml: string;
  totalMoney: string;
  purpose: string;
  amountWords: string;
  method?: string | null;
  details?: string | null;
  grantDonorLabel?: string | null;
  preparedBy: string;
  preparedDate: string;
  preparedSignatureDataUri?: string | null;
  cooBy: string;
  cooDate: string;
  cooDone: boolean;
  cooSignatureDataUri?: string | null;
  edBy: string;
  edDate: string;
  edDone: boolean;
  edSignatureDataUri?: string | null;
  remarks?: string | null;
};

export class DocumentGeneratorService {
  private readonly handlebars = Handlebars.create();
  private readonly templateCache = new Map<string, Handlebars.TemplateDelegate>();

  constructor(private readonly pdfService: PdfService) {}

  async generate(document: Document<any>, ids: DocumentIds, userId: string): Promise<DocumentResponse> {
    const generatedAt = new Date();
    const ctx = await document.fetchContext(ids);
    const output = await document.render(ctx);
    await this.afterGenerated(ids, userId, output, generatedAt);
    return this.wrapResponse(output, ids.requestId, generatedAt);
  }

  protected async afterGenerated(_ids: DocumentIds, _userId: string, _output: DocumentOutput, _generatedAt: Date) {
    return;
  }

  protected wrapResponse(output: DocumentOutput, requestId: string | undefined, generatedAt: Date): DocumentResponse {
    return {
      file_name: output.fileName,
      mime_type: output.mimeType,
      content_base64: output.buffer.toString('base64'),
      generated_at: generatedAt.toISOString(),
      ...(requestId ? { request_id: requestId } : {}),
    };
  }

  renderPdfFromHtml(html: string, fallbackLines: string[] = []): Promise<Buffer> {
    return this.pdfService.renderPdfFromHtml(html, fallbackLines);
  }

  renderDocumentTemplate(name: string, ctx: Record<string, unknown>): string {
    return this.loadDocumentTemplate(name)(ctx);
  }

  escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  formatMoney(amount: number, currency = 'NGN'): string {
    const normalized = currency;
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: normalized,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${Number(amount || 0).toLocaleString()}`;
    }
  }

  formatDate(value: Date | string | null | undefined): string {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: '2-digit' });
  }

  formatDateTime(value: Date | string | null | undefined): string {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  compactDate(value: Date): string {
    return value.toISOString().slice(0, 10).replace(/-/g, '');
  }

  zipSafeName(value: unknown): string {
    return String(value ?? 'document')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'document';
  }

  toTitle(value: unknown): string {
    return String(value ?? '')
      .replace(/[_-]+/g, ' ')
      .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  getRequestNumber(prefix: string | null | undefined, year: number, id: string | bigint | number): string {
    return `${prefix || 'REQ'}-${year}-${String(id).padStart(5, '0')}`;
  }

  resolveTotalAmount(request: any): number {
    if (request?.totalAmount !== undefined && request.totalAmount !== null) return Number(request.totalAmount);
    if (request?.amount !== undefined && request.amount !== null) return Number(request.amount);
    if (!Array.isArray(request?.items)) return 0;
    return request.items.reduce((sum: number, item: any) => sum + Number(item.amount || 0) * Number(item.quantity || 1), 0);
  }

  paymentMethodLabel(value: unknown): string {
    const method = String(value ?? '').trim();
    return method ? this.toTitle(method) : '-';
  }

  amountToWords(amount: number): string {
    const whole = Math.floor(Math.abs(Number(amount) || 0));
    if (whole === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const underThousand = (num: number): string => {
      const parts: string[] = [];
      if (num >= 100) {
        parts.push(`${ones[Math.floor(num / 100)]} Hundred`);
        num %= 100;
      }
      if (num >= 20) {
        parts.push(tens[Math.floor(num / 10)]);
        num %= 10;
      }
      if (num >= 10) {
        parts.push(teens[num - 10]);
      } else if (num > 0) {
        parts.push(ones[num]);
      }
      return parts.join(' ');
    };
    const scales: Array<[number, string]> = [[1_000_000_000, 'Billion'], [1_000_000, 'Million'], [1_000, 'Thousand']];
    let remainder = whole;
    const words: string[] = [];
    for (const [scale, label] of scales) {
      if (remainder >= scale) {
        words.push(`${underThousand(Math.floor(remainder / scale))} ${label}`);
        remainder %= scale;
      }
    }
    if (remainder > 0) words.push(underThousand(remainder));
    return words.join(' ');
  }

  getPdfLogoDataUri(): string | null {
    try {
      const logoPath = process.env.PDF_LOGO_PATH || 'public/branding/logo.png';
      if (!existsSync(logoPath)) return null;
      const fileBuffer = readFileSync(logoPath);
      const ext = extname(logoPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : null;
      return mime ? `data:${mime};base64,${fileBuffer.toString('base64')}` : null;
    } catch {
      return null;
    }
  }

  async readAssetFileBuffer(asset: { storagePath?: string | null; publicUrl?: string | null }): Promise<Buffer | null> {
    const storagePath = asset.storagePath || asset.publicUrl || '';
    if (!storagePath) return null;
    const candidates = [storagePath, resolve(process.cwd(), storagePath), resolve(process.cwd(), '..', storagePath), resolve(process.cwd(), 'uploads', storagePath)];
    for (const candidate of candidates) {
      if (!existsSync(candidate)) continue;
      try {
        return await readFile(candidate);
      } catch {
        // try next candidate
      }
    }
    if (/^https?:\/\//i.test(storagePath)) {
      try {
        const response = await fetch(storagePath);
        if (response.ok) return Buffer.from(await response.arrayBuffer());
      } catch {
        // ignore remote read failure
      }
    }
    return null;
  }

  async buildZipPackage(entries: Array<{ path: string; buffer: Buffer }>): Promise<Buffer> {
    const zip = new JSZip();
    for (const entry of entries) zip.file(entry.path, entry.buffer);
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  async buildMergedPdf(): Promise<PDFDocument> {
    return PDFDocument.create();
  }

  async appendPdfBuffer(target: PDFDocument, pdfBuffer: Buffer) {
    const source = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pages = await target.copyPages(source, source.getPageIndices());
    for (const page of pages) target.addPage(page);
  }

  async appendTextPage(target: PDFDocument, title: string, lines: string[]) {
    const page = target.addPage([595.28, 841.89]);
    const font = await target.embedFont(StandardFonts.Helvetica);
    const bold = await target.embedFont(StandardFonts.HelveticaBold);
    page.drawText(title, { x: 40, y: 800, size: 16, font: bold });
    let y = 772;
    for (const line of lines) {
      page.drawText(String(line).slice(0, 110), { x: 40, y, size: 11, font });
      y -= 16;
      if (y < 50) break;
    }
  }

  async appendAssetToPdf(target: PDFDocument, fileBuffer: Buffer | null, fileName: string, mimeType: string | null | undefined, skippedFiles: string[]) {
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

  uniqueFilesFromRequestItem(item: any): any[] {
    const files = [item?.file, ...(item?.files ?? []).map((entry: any) => entry.file)].filter(Boolean);
    return Array.from(new Map(files.map((file: any) => [file.id ?? file.fileName, file])).values());
  }

  resolveApprovalSignatory(input: ApprovalSignatoryInput): { name: string | null; date: Date | string | null; done: boolean } {
    if (input.isManualImport) {
      return {
        name: typeof input.manual?.name === 'string' ? input.manual.name : null,
        date: typeof input.manual?.date === 'string' ? input.manual.date : null,
        done: Boolean(input.manual?.done ?? input.manual?.name ?? input.manual?.date),
      };
    }
    return {
      name: input.workflowStep?.performed_by_name ?? input.workflowStep?.performed_by_email ?? null,
      date: input.workflowStep?.at ?? null,
      done: Boolean(input.workflowStep),
    };
  }

  renderApprovalRoleRow(input: ApprovalRoleRowInput): string {
    const date = input.date ? this.formatDateTime(input.date) : 'Pending';
    return `<div class="approval-row"><div><div class="approval-title">${this.escapeHtml(input.roleLabel)}</div><div class="approval-name">${this.escapeHtml(input.name || 'Pending')}</div></div><div class="approval-right"><div>${input.done ? 'Approved' : 'Pending'}</div><div class="muted">${this.escapeHtml(date)}</div></div></div>`;
  }

  renderVoucherPageHtml(input: VoucherPageHtmlInput): string {
    const signature = (dataUri?: string | null) =>
      dataUri ? `<img src="${this.escapeHtml(dataUri)}" alt="signature" style="height:30px; max-width:120px;" />` : '<div class="sig-line"></div>';
    return `<div class="${input.pageBreak ? 'page-break ' : ''}box">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>${input.logoDataUri ? `<img src="${input.logoDataUri}" alt="Logo" style="height:40px;" />` : '<strong>Stanforte Edge</strong>'}</div>
        <div style="text-align:right;"><div class="title">Payment Voucher</div><div>${this.escapeHtml(input.voucherNo)}</div><div class="muted">${this.escapeHtml(input.dateText)}</div></div>
      </div>
      <div class="two row"><div><strong>Payee</strong><div class="line">${this.escapeHtml(input.payee)}</div></div><div><strong>Contact</strong><div class="line">${this.escapeHtml(input.contact)}</div></div></div>
      <table class="tbl"><thead><tr><th>#</th><th>Description</th><th>Amount</th></tr></thead><tbody>${input.itemsHtml}<tr class="total"><td colspan="2">Total</td><td>${this.escapeHtml(input.totalMoney)}</td></tr></tbody></table>
      <div class="row"><strong>Amount in words:</strong> ${this.escapeHtml(input.amountWords)}</div>
      <div class="two row"><div><strong>Purpose</strong><div class="line">${this.escapeHtml(input.purpose)}</div></div><div><strong>Method</strong><div class="line">${this.escapeHtml(this.paymentMethodLabel(input.method))}</div></div></div>
      <div class="two row"><div><strong>Details</strong><div class="line">${this.escapeHtml(input.details ?? '-')}</div></div><div><strong>Grant/Fund</strong><div class="line">${this.escapeHtml(input.grantDonorLabel ?? '-')}</div></div></div>
      ${input.remarks ? `<div class="row"><strong>Remarks:</strong> ${this.escapeHtml(input.remarks)}</div>` : ''}
      <div class="approvals">
        <div class="approval"><strong>Prepared by</strong><div>${signature(input.preparedSignatureDataUri)}</div><div>${this.escapeHtml(input.preparedBy)}</div><div class="muted">${this.escapeHtml(input.preparedDate)}</div></div>
        <div class="approval"><strong>COO Review</strong><div>${signature(input.cooSignatureDataUri)}</div><div>${this.escapeHtml(input.cooBy)}</div><div class="muted">${input.cooDone ? this.escapeHtml(input.cooDate) : 'Pending'}</div></div>
        <div class="approval"><strong>ED Approval</strong><div>${signature(input.edSignatureDataUri)}</div><div>${this.escapeHtml(input.edBy)}</div><div class="muted">${this.escapeHtml(input.edDate)}</div></div>
      </div>
    </div>`;
  }

  renderThreadHtml(entries: RequestThread): string {
    const typeConfig: Record<string, { label: string; color: string; icon: string }> = {
      submission: { label: 'Submitted', color: '#0f766e', icon: 'IN' },
      approval: { label: 'Approved', color: '#16a34a', icon: 'OK' },
      clearance: { label: 'Cleared', color: '#2563eb', icon: 'OK' },
      rejection: { label: 'Rejected', color: '#dc2626', icon: 'NO' },
      return: { label: 'Returned', color: '#d97706', icon: 'RETURN' },
    };
    const isFinanceRole = (label: string) => {
      const normalized = label.toLowerCase();
      return normalized.includes('accountant') || normalized.includes('finance') || normalized.includes('cleared');
    };
    const rows = entries
      .map((entry, idx) => {
        const effectiveType = entry.type === 'approval' && isFinanceRole(entry.role_label) ? 'clearance' : entry.type;
        const cfg = typeConfig[effectiveType] ?? typeConfig.approval;
        const actorName = entry.actor_name ?? 'System';
        const nameAndEmail = entry.actor_email ? `${this.escapeHtml(actorName)} &lt;${this.escapeHtml(entry.actor_email)}&gt;` : this.escapeHtml(actorName);
        const attachmentList = entry.attachments?.length
          ? `<div style="margin-top:6px; font-size:11px; color:#475569;"><strong>Attached:</strong> ${entry.attachments.map((a) => this.escapeHtml(a.name)).join(', ')}</div>`
          : '';
        const commentBlock = entry.comment
          ? `<div style="font-size:12px; color:#111; line-height:1.7; margin-top:6px; white-space:pre-wrap;">${this.escapeHtml(entry.comment)}</div>`
          : '';
        return `<div style="border-left:3px solid ${cfg.color}; padding:10px 14px; margin-bottom:10px; background:${idx === 0 ? '#f8fafc' : '#fff'}; border-radius:0 6px 6px 0; border:1px solid #f1f5f9; border-left-width:3px;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:4px; margin-bottom:5px;">
            <div><span style="font-weight:700; font-size:12px;">${this.escapeHtml(entry.role_label)}</span><span style="color:#475569; font-size:11px; margin-left:8px;">${nameAndEmail}</span></div>
            <div style="font-size:10px; color:#94a3b8;">${this.formatDateTime(entry.at)}</div>
          </div>
          <span style="display:inline-block; background:${cfg.color}; color:#fff; font-size:10px; font-weight:600; padding:2px 8px; border-radius:9999px; margin-bottom:4px;">${cfg.icon} ${cfg.label}</span>
          ${commentBlock}${attachmentList}
        </div>`;
      })
      .join('');
    return `<div>${rows}</div>`;
  }

  renderCertificateHtml(ctx: Record<string, unknown>): string {
    return this.renderDocumentTemplate('hr-certificate-of-honor', ctx);
  }

  private async appendImagePage(target: PDFDocument, image: { width: number; height: number; scale: (factor: number) => { width: number; height: number } }, label: string) {
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

  private loadDocumentTemplate(name: string): Handlebars.TemplateDelegate {
    const normalized = name.endsWith('.hbs') ? name : `${name}.hbs`;
    const cached = this.templateCache.get(normalized);
    if (cached) return cached;
    const abs = this.resolveTemplatePath(normalized);
    const compiled = this.handlebars.compile(readFileSync(abs, 'utf8'));
    this.templateCache.set(normalized, compiled);
    return compiled;
  }

  private resolveTemplatePath(normalized: string): string {
    const candidates = this.resolveTemplateDirs().map((dir) => join(dir, normalized));
    const match = candidates.find((candidate) => existsSync(candidate));
    if (match) return match;
    return candidates[0] ?? resolve(process.cwd(), 'src/templates/documents', normalized);
  }

  private resolveTemplateDirs(): string[] {
    const candidates = [
      process.env.DOCUMENT_TEMPLATES_DIR,
      join(__dirname, '../templates/documents'),
      resolve(process.cwd(), 'src/templates/documents'),
      resolve(process.cwd(), 'dist/templates/documents'),
    ].filter((path): path is string => Boolean(path));
    return candidates.filter((candidate) => existsSync(candidate));
  }
}
