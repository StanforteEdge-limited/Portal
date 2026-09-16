import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PdfService } from '$common/pdf/pdf.service';
import { MailQueueService } from '$common/mail/mail-queue.service';
import { toBigInt } from '$common/utils/ids';
import {
  Document,
  DocumentIds,
  DocumentOutput,
  ThreadEntry,
  DocumentResponse,
  EmailDeliveryResponse,
} from './document.types';

@Injectable()
export class DocumentGeneratorService {
  constructor(
    private readonly pdfService: PdfService,
    private readonly mailQueue: MailQueueService,
  ) {}
  // ── Orchestration ─────────────────────────────────────────────────────────

  async generate(
    document: Document<any>,
    ids: DocumentIds,
    userId: string,
  ): Promise<DocumentResponse> {
    const generatedAt = new Date();
    const ctx = await document.fetchContext(ids);
    const output = await document.render(ctx);
    await this.afterGenerated(ids, userId, output, generatedAt);
    return this.wrapResponse(output, ids.requestId, generatedAt);
  }

  async generateWithEmailDelivery(
    document: Document<any>,
    ids: DocumentIds,
    userId: string,
    delivery: {
      mode: "email" | "download";
      email_to?: string;
      requestNumber: string;
      creatorEmail: string;
    },
  ): Promise<DocumentResponse | EmailDeliveryResponse> {
    const generatedAt = new Date();
    const ctx = await document.fetchContext(ids);
    const output = await document.render(ctx);
    await this.afterGenerated(ids, userId, output, generatedAt);
    if (delivery.mode === "email") {
      const recipient = delivery.email_to?.trim() || delivery.creatorEmail;
      if (!recipient)
        throw new BadRequestException(
          "No recipient email available for package delivery",
        );
      await this.mailQueue.enqueue({
        to: recipient,
        subject: `Full Request Package - ${delivery.requestNumber}`,
        text: `Attached is the full request package for ${delivery.requestNumber}.`,
        threadKey: `request-${ids.requestId}-full-package`,
        userId,
        notifiableType: "request",
        notifiableId: ids.requestId ? toBigInt(ids.requestId) : undefined,
        attachments: [
          {
            filename: output.fileName,
            content: output.buffer,
            contentType: output.mimeType,
          },
        ],
      });
      return {
        success: true,
        delivery: "email",
        email_to: recipient,
        file_name: output.fileName,
        request_id: ids.requestId,
      };
    }
    return this.wrapResponse(output, ids.requestId, generatedAt);
  }

  protected async afterGenerated(
    _ids: DocumentIds,
    _userId: string,
    _output: DocumentOutput,
    _generatedAt: Date,
  ): Promise<void> {}
  wrapResponse(
    output: DocumentOutput,
    requestId: string | undefined,
    generatedAt: Date,
  ): DocumentResponse {
    return {
      file_name: output.fileName,
      mime_type: output.mimeType,
      content_base64: output.buffer.toString("base64"),
      generated_at: generatedAt.toISOString(),
      ...(requestId ? { request_id: requestId } : {}),
    };
  }


  async readAssetFileBuffer(asset: {
    storagePath?: string | null;
    publicUrl?: string | null;
    fileName?: string | null;
  }): Promise<Buffer | null> {
    const storagePath = asset.storagePath || asset.publicUrl || "";
    if (!storagePath) return null;
    const candidates = [
      storagePath,
      resolve(process.cwd(), storagePath),
      resolve(process.cwd(), "..", storagePath),
      resolve(process.cwd(), "uploads", storagePath),
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

  // ── PDF / ZIP Rendering ───────────────────────────────────────────────────

  async renderPdfFromHtml(
    html: string,
    fallbackLines: string[],
  ): Promise<Buffer> {
    return this.pdfService.renderPdfFromHtml(html, fallbackLines);
  }

  async buildZipPackage(
    entries: Array<{ path: string; buffer: Buffer }>,
  ): Promise<Buffer> {
    const zip = new JSZip();
    for (const entry of entries) zip.file(entry.path, entry.buffer);
    return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  }

  async buildMergedPdf(): Promise<PDFDocument> {
    return PDFDocument.create();
  }

  async appendPdfBuffer(target: PDFDocument, pdfBuffer: Buffer) {
    const source = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
    });
    const pages = await target.copyPages(source, source.getPageIndices());
    for (const page of pages) target.addPage(page);
  }

  async appendAssetToPdf(
    target: PDFDocument,
    fileBuffer: Buffer | null,
    fileName: string,
    mimeType: string | null | undefined,
    skippedFiles: string[],
  ) {
    if (!fileBuffer) {
      skippedFiles.push(`${fileName} (missing file)`);
      return;
    }
    const mime = String(mimeType || "").toLowerCase();
    const ext = extname(fileName).toLowerCase();
    if (mime === "application/pdf" || ext === ".pdf") {
      await this.appendPdfBuffer(target, fileBuffer);
      return;
    }
    if (mime === "image/png" || ext === ".png") {
      const image = await target.embedPng(fileBuffer);
      await this.appendImagePage(target, image, fileName);
      return;
    }
    if (
      ["image/jpeg", "image/jpg"].includes(mime) ||
      [".jpg", ".jpeg"].includes(ext)
    ) {
      const image = await target.embedJpg(fileBuffer);
      await this.appendImagePage(target, image, fileName);
      return;
    }
    skippedFiles.push(fileName);
  }

  async appendImagePage(
    target: PDFDocument,
    image: {
      width: number;
      height: number;
      scale: (f: number) => { width: number; height: number };
    },
    label: string,
  ) {
    const page = target.addPage([595.28, 841.89]);
    const margin = 36;
    const headerSpace = 32;
    const availableWidth = page.getWidth() - margin * 2;
    const availableHeight = page.getHeight() - margin * 2 - headerSpace;
    const ratio = Math.min(
      availableWidth / image.width,
      availableHeight / image.height,
      1,
    );
    const dims = image.scale(ratio);
    page.drawImage(image as any, {
      x: (page.getWidth() - dims.width) / 2,
      y: margin,
      width: dims.width,
      height: dims.height,
    });
    const font = await target.embedFont(StandardFonts.Helvetica);
    page.drawText(label, {
      x: margin,
      y: page.getHeight() - margin + 4,
      size: 10,
      font,
    });
  }

  async appendTextPage(target: PDFDocument, title: string, lines: string[]) {
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

  uniqueFilesFromRequestItem(item: { files?: Array<{ file?: any | null }> | null; file?: any | null }): any[] {
    return Array.from(
      new Map(
        [
          ...(item.files ?? []).map((attachment: any) => attachment.file).filter(Boolean),
          item.file ?? null,
        ]
          .filter(Boolean)
          .map((file: any) => [file.id, file]),
      ).values(),
    );
  }

  // ── Formatting Utilities ──────────────────────────────────────────────────

  formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  formatDate(value: Date | string | null): string {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  }

  formatDateTime(value: Date | string | null): string {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  compactDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
  }

  escapeHtml(value: unknown): string {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  toTitle(input: string): string {
    return input.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }

  paymentMethodLabel(method: string | null): string {
    return method ? this.toTitle(method) : "-";
  }

  zipSafeName(value: string): string {
    return String(value || "")
      .replace(/[\\/]+/g, "-")
      .replace(/[-]+/g, "")
      .trim();
  }

  getRequestNumber(
    codePrefix: string | undefined,
    year: number,
    requestId: bigint,
  ): string {
    const rawPrefix = (codePrefix || "REQ").toUpperCase();
    const prefix = rawPrefix.includes("PC")
      ? "PC"
      : rawPrefix.includes("OP")
        ? "OP"
        : rawPrefix;
    return `${prefix}/${year}/${requestId.toString()}`;
  }

  resolveTotalAmount(request: {
    totalAmount: any;
    items: Array<{ amount: any; quantity: number }>;
  }): number {
    if (request.totalAmount !== null) return Number(request.totalAmount);
    return request.items.reduce(
      (sum, item) => sum + Number(item.amount) * item.quantity,
      0,
    );
  }

  getPdfLogoDataUri(): string | null {
    const candidates = [
      process.env.PDF_LOGO_PATH,
      resolve(process.cwd(), "public/branding/logo.png"),
      resolve(process.cwd(), "../PWA/public/logo/logo.png"),
      resolve(process.cwd(), "public/logo/logo.png"),
    ].filter((v): v is string => Boolean(v));
    for (const path of candidates) {
      if (!existsSync(path)) continue;
      try {
        const ext = extname(path).toLowerCase();
        const mime =
          ext === ".svg"
            ? "image/svg+xml"
            : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : "image/png";
        const data = readFileSync(path);
        return `data:${mime};base64,${data.toString("base64")}`;
      } catch {
        continue;
      }
    }
    return null;
  }

  amountToWords(amount: number): string {
    const units = [
      "Zero",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
    const toWords = (n: number): string => {
      if (n < 20) return units[n];
      if (n < 100)
        return `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${units[n % 10]}` : ""}`;
      if (n < 1000)
        return `${units[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${toWords(n % 100)}` : ""}`;
      if (n < 1000000)
        return `${toWords(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${toWords(n % 1000)}` : ""}`;
      if (n < 1000000000)
        return `${toWords(Math.floor(n / 1000000))} Million${n % 1000000 ? ` ${toWords(n % 1000000)}` : ""}`;
      return `${toWords(Math.floor(n / 1000000000))} Billion${n % 1000000000 ? ` ${toWords(n % 1000000000)}` : ""}`;
    };
    return `${toWords(Math.max(0, Math.floor(amount)))} Naira Only`;
  }

  // ── HTML Builders ─────────────────────────────────────────────────────────

  renderApprovalRoleRow(input: {
    roleLabel: string;
    actorName: string | null;
    dateText: string;
    done: boolean;
  }): string {
    const displayName = input.actorName
      ? this.escapeHtml(input.actorName)
      : "Pending";
    return `<div class="approval-row">
      <div class="approval-left">
        <div class="approval-title">${this.escapeHtml(input.roleLabel)}</div>
        <div class="approval-name">${displayName}</div>
      </div>
      <div class="approval-right">
        ${input.done ? `<div class="sig">${displayName}</div>` : `<div class="sig-line"></div>`}
        <div class="muted">${this.escapeHtml(input.dateText)}</div>
      </div>
    </div>`;
  }

  renderVoucherPageHtml(input: {
    voucherNo: string;
    dateText: string;
    payee: string;
    contact: string;
    itemsHtml: string;
    totalMoney: string;
    purpose: string;
    amountWords: string;
    method: string | null;
    details: string;
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
    grantDonorLabel?: string | null;
    remarks?: string | null;
    pageBreak?: boolean;
    logoDataUri?: string | null;
  }): string {
    const { method } = input;
    return `<div class="${input.pageBreak ? "page-break" : ""}">
      <div class="box">
        ${input.logoDataUri ? `<div style="text-align:center; margin-bottom:8px;"><img src="${input.logoDataUri}" alt="Logo" style="height:42px;" /></div>` : ""}
        <div class="title">PAYMENT VOUCHER</div>
        <div class="row two">
          <div><strong>Voucher No:</strong> ${this.escapeHtml(input.voucherNo)}</div>
          <div><strong>Date:</strong> ${this.escapeHtml(input.dateText)}</div>
        </div>
        <div class="row"><div><strong>Payee Name:</strong></div><div class="line">${this.escapeHtml(input.payee)}</div></div>
        <div class="row"><div><strong>Address / Contact:</strong></div><div class="line">${this.escapeHtml(input.contact)}</div></div>
        ${input.grantDonorLabel ? `<div class="row"><div><strong>Paid by (Grant / Donor):</strong></div><div class="line">${this.escapeHtml(input.grantDonorLabel)}</div></div>` : ""}
        <div class="row">
          <strong>Payment Items</strong>
          <table class="tbl">
            <thead><tr><th style="width:56px;">S/N</th><th>Description / Item</th><th style="width:160px;">Amount</th></tr></thead>
            <tbody>${input.itemsHtml}<tr class="total"><td colspan="2">Total</td><td>${this.escapeHtml(input.totalMoney)}</td></tr></tbody>
          </table>
        </div>
        <div class="row"><strong>Description / Purpose of Payment:</strong><div class="line">${this.escapeHtml(input.purpose)}</div></div>
        <div class="row two">
          <div><strong>Amount:</strong> ${this.escapeHtml(input.totalMoney)}</div>
          <div><strong>Amount in Words:</strong> ${this.escapeHtml(input.amountWords)}</div>
        </div>
        <div class="row"><strong>Payment Method:</strong><div style="margin-top:4px;">
          ${method === "cash" ? "☑" : "☐"} Cash &nbsp;&nbsp;
          ${method === "bank_transfer" || method === "transfer" ? "☑" : "☐"} Transfer &nbsp;&nbsp;
          ${method === "cheque" ? "☑" : "☐"} Cheque
        </div></div>
        <div class="row"><strong>If Transfer / Cheque, Details:</strong><div class="line">${this.escapeHtml(input.details)}</div></div>
        <div class="approvals">
          <strong>Approvals:</strong>
          <div class="approval">
            ${input.preparedSignatureDataUri ? `<img src="${input.preparedSignatureDataUri}" alt="Signature" style="height:36px; display:block; margin-bottom:2px;" />` : ""}
            <div><strong>Prepared By (Accountant):</strong> ${this.escapeHtml(input.preparedBy)}</div><div class="muted">${this.escapeHtml(input.preparedDate)}</div>
          </div>
          ${
            input.cooDone
              ? `<div class="approval">
            ${input.cooSignatureDataUri ? `<img src="${input.cooSignatureDataUri}" alt="Signature" style="height:36px; display:block; margin-bottom:2px;" />` : ""}
            <div><strong>[✓] Approved By (COO):</strong> ${this.escapeHtml(input.cooBy)}</div><div class="muted">${this.escapeHtml(input.cooDate)}</div>
          </div>`
              : ""
          }
          ${
            input.edDone
              ? `<div class="approval">
            ${input.edSignatureDataUri ? `<img src="${input.edSignatureDataUri}" alt="Signature" style="height:36px; display:block; margin-bottom:2px;" />` : ""}
            <div><strong>[✓] Approved By (ED):</strong> ${this.escapeHtml(input.edBy)}</div><div class="muted">${this.escapeHtml(input.edDate)}</div>
          </div>`
              : ""
          }
          ${input.remarks ? `<div class="row"><strong>Remarks:</strong><div>${this.escapeHtml(input.remarks)}</div></div>` : ""}
        </div>
      </div>
    </div>`;
  }

  renderCertificateHtml(input: {
    logoDataUri: string | null;
    signatureDataUri: string | null;
    staffName: string;
    requestLabel: string;
    voucherNumber: string;
    amountLabel: string;
    declaration: string;
    reason: string;
    issuedAt: string;
  }): string {
    const sigBlock = input.signatureDataUri
      ? `<img src="${input.signatureDataUri}" alt="Signature" style="height:52px; display:block; margin-bottom:4px;" />`
      : `<div style="border-bottom:1.5px solid #111; width:220px; height:36px; margin-bottom:4px;"></div>`;

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; }
    .card { border: 1px solid #000; border-radius: 6px; margin-bottom: 14px; }
    .rowpad { padding: 12px; border-bottom: 1px solid #000; }
    .rowpad:last-child { border-bottom: 0; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .doc-title { font-size: 20px; font-weight: 700; text-align: right; text-decoration: underline; text-transform: uppercase; letter-spacing: 1px; }
    .doc-subtitle { font-size: 11px; color: #475569; text-align: right; margin-top: 4px; }
    .two-col { display: table; width: 100%; }
    .two-col > div { display: table-cell; width: 50%; vertical-align: top; padding: 12px; }
    .two-col > div:first-child { border-right: 1px solid #000; }
    .detail-list div { margin-bottom: 5px; }
    .muted { color: #475569; font-size: 11px; }
    .section-title { font-weight: 700; margin-bottom: 6px; }
    .text-block { background: #f9fafb; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; line-height: 1.7; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 10px; }
    .sig-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-bottom: 4px; margin-top: 8px; }
    .sig-line { border-bottom: 1.5px solid #111; height: 36px; margin-bottom: 4px; }
    .sig-name { font-size: 12px; font-weight: 600; }
    .footer-note { font-size: 10px; color: #475569; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="rowpad">
      <div class="header-row">
        <div>${input.logoDataUri ? `<img src="${input.logoDataUri}" alt="Logo" style="height:42px;" />` : "<strong>Stanforte Edge</strong>"}</div>
        <div>
          <div class="doc-title">Certificate of Honor</div>
          <div class="doc-subtitle">Cash Advance Retirement Declaration</div>
        </div>
      </div>
    </div>
    <div class="two-col">
      <div>
        <div class="detail-list">
          <div><strong>Staff Member:</strong> ${this.escapeHtml(input.staffName)}</div>
          <div><strong>Request:</strong> ${this.escapeHtml(input.requestLabel)}</div>
          <div><strong>Payment Voucher:</strong> ${this.escapeHtml(input.voucherNumber)}</div>
        </div>
      </div>
      <div>
        <div class="detail-list">
          <div><strong>Amount:</strong> ${this.escapeHtml(input.amountLabel)}</div>
          <div><strong>Date Issued:</strong> ${this.escapeHtml(input.issuedAt)}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="rowpad">
      <div class="section-title">Declaration</div>
      <div class="text-block">${this.escapeHtml(input.declaration)}</div>
    </div>
    <div class="rowpad">
      <div class="section-title">Why Receipts Are Unavailable</div>
      <div class="text-block">${this.escapeHtml(input.reason)}</div>
    </div>
    <div class="rowpad">
      <div class="text-block muted">
        I accept full responsibility for the accuracy of this declaration and understand it forms
        part of the retirement record for this request.
      </div>
    </div>
  </div>

  <div class="card">
    <div class="rowpad">
      <strong>Signatures</strong>
      <div class="sig-grid">
        <div>
          <div class="sig-label">Signed by (Staff)</div>
          ${sigBlock}
          <div class="sig-label">Name</div>
          <div class="sig-name">${this.escapeHtml(input.staffName)}</div>
          <div class="sig-label">Date</div>
          <div class="sig-name">${this.escapeHtml(input.issuedAt)}</div>
        </div>
        <div>
          <div class="sig-label">Witnessed / Verified by</div>
          <div class="sig-line"></div>
          <div class="sig-label">Name / Title</div>
          <div class="sig-name" style="border-bottom:1px solid #ddd; min-height:18px;"></div>
          <div class="sig-label">Date</div>
          <div class="sig-name" style="border-bottom:1px solid #ddd; min-height:18px;"></div>
        </div>
      </div>
    </div>
    <div class="rowpad">
      <div class="footer-note">
        This Certificate of Honor was generated as part of the retirement process for the above-referenced
        request. It is an official document and must be retained with the supporting retirement files.
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  resolveApprovalSignatory(params: {
    isManualImport: boolean;
    workflowStep:
      { performed_by_name?: string | null; at: Date | string } | undefined;
    manual: Record<string, unknown> | undefined;
  }): { actorName: string | null; dateText: string; done: boolean } {
    const { isManualImport, workflowStep, manual } = params;
    return {
      actorName: isManualImport
        ? typeof manual?.name === "string" && manual.name
          ? manual.name
          : null
        : (workflowStep?.performed_by_name ??
          (typeof manual?.name === "string" ? manual.name : null)),
      dateText: isManualImport
        ? typeof manual?.date === "string"
          ? this.formatDate(manual.date)
          : "Pending"
        : workflowStep
          ? this.formatDate(workflowStep.at)
          : typeof manual?.date === "string"
            ? this.formatDate(manual.date)
            : "Pending",
      done: isManualImport
        ? Boolean(manual?.done)
        : Boolean(workflowStep) || Boolean(manual?.done),
    };
  }

  renderThreadHtml(entries: ThreadEntry[]): string {
    const typeConfig: Record<
      string,
      { label: string; color: string; icon: string }
    > = {
      submission: { label: "Submitted", color: "#2563eb", icon: "●" },
      approval: { label: "Approved", color: "#16a34a", icon: "✓" },
      clearance: { label: "Cleared", color: "#0891b2", icon: "✓" },
      rejection: { label: "Rejected", color: "#dc2626", icon: "✗" },
      return: { label: "Returned", color: "#d97706", icon: "↩" },
      auto_approval: { label: "Auto-approved", color: "#7c3aed", icon: "✓" },
    };

    const isFinanceRole = (label: string) => {
      const l = label.toLowerCase();
      return (
        l.includes("accountant") ||
        l.includes("finance") ||
        l.includes("cleared")
      );
    };

    const rows = entries
      .map((entry, idx) => {
        const effectiveType =
          entry.type === "approval" && isFinanceRole(entry.role_label)
            ? "clearance"
            : entry.type;
        const cfg = typeConfig[effectiveType] ?? typeConfig.approval;
        const nameAndEmail = entry.actor_email
          ? `${this.escapeHtml(entry.actor_name)} &lt;${this.escapeHtml(entry.actor_email)}&gt;`
          : this.escapeHtml(entry.actor_name);
        const attachmentList =
          entry.attachments && entry.attachments.length > 0
            ? `<div style="margin-top:6px; font-size:11px; color:#475569;"><strong>Attached:</strong> ${entry.attachments.map((a) => this.escapeHtml(a.name)).join(", ")}</div>`
            : "";
        const commentBlock = entry.comment
          ? `<div style="font-size:12px; color:#111; line-height:1.7; margin-top:6px; white-space:pre-wrap;">${this.escapeHtml(entry.comment)}</div>`
          : "";
        return `<div style="border-left:3px solid ${cfg.color}; padding:10px 14px; margin-bottom:10px; background:${idx === 0 ? "#f8fafc" : "#fff"}; border-radius:0 6px 6px 0; border-top:1px solid #f1f5f9; border-right:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9;">
          <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:4px; margin-bottom:5px;">
            <div>
              <span style="font-weight:700; font-size:12px;">${this.escapeHtml(entry.role_label)}</span>
              <span style="color:#475569; font-size:11px; margin-left:8px;">${nameAndEmail}</span>
            </div>
            <div style="font-size:10px; color:#94a3b8;">${this.formatDateTime(entry.at)}</div>
          </div>
          <span style="display:inline-block; background:${cfg.color}; color:#fff; font-size:10px; font-weight:600; padding:2px 8px; border-radius:9999px; margin-bottom:4px;">${cfg.icon} ${cfg.label}</span>
          ${commentBlock}${attachmentList}
        </div>`;
      })
      .join("");

    return `<div>${rows}</div>`;
  }
}