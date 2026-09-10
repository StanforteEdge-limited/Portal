import { DocumentGeneratorService } from '../../../common/documents/document-generator.service';
import { Document, DocumentIds, DocumentOutput, RequestThread } from '../../../common/documents/document.types';

type PaymentVoucherContext = {
  request: any;
  voucher: any;
  totalAmount: number;
  generatedAt: Date;
  signatories: any;
  thread: RequestThread;
};

export class PaymentVoucherDocument implements Document<PaymentVoucherContext> {
  constructor(private readonly engine: DocumentGeneratorService) {}

  async fetchContext(ids: DocumentIds): Promise<PaymentVoucherContext> {
    const { requestId, voucherId } = ids;
    if (!requestId) throw new Error('requestId required');
    const [request, signatories] = await Promise.all([
      this.engine.fetchRequest(requestId),
      this.engine.fetchSignatories(),
    ]);
    const [thread, voucher] = await Promise.all([
      this.engine.fetchThread(requestId),
      voucherId
        ? this.engine.fetchPaymentVoucher(requestId, voucherId)
        : this.engine.fetchPaymentVouchers(requestId).then((pvs) => pvs[0] ?? null),
    ]);
    const totalAmount = voucher ? Number(voucher.amount) : this.engine.resolveTotalAmount(request);
    return { request, voucher, totalAmount, generatedAt: new Date(), signatories, thread };
  }

  async render(ctx: PaymentVoucherContext): Promise<DocumentOutput> {
    const { request, voucher, totalAmount, generatedAt, signatories, thread } = ctx;
    const currency = request.currency || 'NGN';
    const logoDataUri = this.engine.getPdfLogoDataUri();
    const payee =
      `${request.creator.firstName ?? ''} ${request.creator.lastName ?? ''}`.trim() ||
      request.creator.username ||
      request.creator.email;

    const data = (request.data ?? {}) as Record<string, unknown>;
    const isManualImport = Boolean(data.manual_import);

    const manualApprovals = Array.isArray(data.manual_approvals)
      ? (data.manual_approvals as Array<Record<string, unknown>>)
      : [];
    const manualFor = (matcher: RegExp) => manualApprovals.find((row) => matcher.test(String(row.role ?? '')));
    const manualAccountant = manualFor(/\b(accountant|finance)\b/i);

    const cooEntry = thread.find(
      (e) => e.type === 'approval' && /\bcoo\b|chief\s+operating\s+officer/i.test(e.role_label),
    );
    const edEntry = thread.find(
      (e) => e.type === 'approval' && /\bed\b|executive\s+director/i.test(e.role_label),
    );

    const grantDonorLabel = voucher?.grant
      ? [voucher.grant.name, voucher.grant.donor?.name].filter(Boolean).join(' — ')
      : (voucher?.fund?.name ?? null);

    const method = voucher?.method ?? null;
    const voucherNo = voucher?.voucherNumber ?? 'N/A';

    // Only attach the configured signature image when the displayed name matches the
    // signatory it belongs to — avoids putting the wrong image next to a different
    // actual approver's name (e.g. manual imports or a workflow approver who isn't
    // the org's default signatory).
    const matchesSignatory = (displayName: string, signatoryName: string) =>
      Boolean(signatoryName) && displayName.trim().toLowerCase() === signatoryName.trim().toLowerCase();

    const itemRows = request.items.length
      ? request.items
          .map(
            (item: any, idx: number) =>
              `<tr><td>${idx + 1}</td><td>${this.engine.escapeHtml(item.description)}</td><td>${this.engine.formatMoney(Number(item.amount) * item.quantity, currency)}</td></tr>`,
          )
          .join('')
      : `<tr><td>1</td><td>${this.engine.escapeHtml(request.requestType.name)} Request</td><td>${this.engine.formatMoney(totalAmount, currency)}</td></tr>`;

    const preparedBy =
      (isManualImport && manualAccountant?.name ? String(manualAccountant.name) : null) ??
      (signatories.prepared_by.name || '________________');
    const cooBy = cooEntry?.actor_name ?? signatories.reviewed_by.name ?? '________________';
    const edBy = edEntry?.actor_name ?? signatories.approved_by.name ?? '________________';

    const body = this.engine.renderVoucherPageHtml({
      logoDataUri,
      voucherNo,
      dateText: this.engine.formatDate(voucher?.disbursedAt ?? generatedAt),
      payee,
      contact: request.creator.email,
      itemsHtml: itemRows,
      totalMoney: this.engine.formatMoney(totalAmount, currency),
      purpose: String(data.purpose ?? request.requestType.name),
      amountWords: this.engine.amountToWords(totalAmount),
      method,
      details: voucher?.transactionRef ?? '-',
      grantDonorLabel,
      preparedBy,
      preparedDate:
        isManualImport && manualAccountant?.date
          ? this.engine.formatDate(String(manualAccountant.date))
          : this.engine.formatDate(generatedAt),
      preparedSignatureDataUri: matchesSignatory(preparedBy, signatories.prepared_by.name)
        ? signatories.prepared_by.signatureDataUri
        : null,
      cooBy,
      cooDate: cooEntry ? this.engine.formatDateTime(cooEntry.at) : 'Pending',
      cooDone: Boolean(cooEntry),
      cooSignatureDataUri: matchesSignatory(cooBy, signatories.reviewed_by.name)
        ? signatories.reviewed_by.signatureDataUri
        : null,
      edBy,
      edDate: edEntry ? this.engine.formatDateTime(edEntry.at) : 'N/A',
      edDone: Boolean(edEntry),
      edSignatureDataUri: matchesSignatory(edBy, signatories.approved_by.name)
        ? signatories.approved_by.signatureDataUri
        : null,
      remarks: voucher?.note ?? null,
    });

    const html = `<!doctype html><html><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; }
  .box { border: 2px solid #000; border-radius: 4px; padding: 14px; }
  .title { text-align: center; font-size: 24px; font-weight: 700; margin: 4px 0 14px; text-decoration: underline; }
  .row { margin: 10px 0; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .line { border-bottom: 1px solid #000; padding: 4px 0; min-height: 20px; }
  .tbl { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .tbl th, .tbl td { border: 1px solid #000; padding: 7px; text-align: left; }
  .tbl th { background: #f5f5f5; }
  .tbl .total td { font-weight: 700; background: #f8fafc; }
  .approvals { margin-top: 16px; }
  .approval { border: 1px solid #ddd; border-radius: 5px; padding: 8px; margin-bottom: 8px; }
  .muted { color: #475569; font-size: 11px; }
</style></head><body>${body}</body></html>`;

    const buffer = await this.engine.renderPdfFromHtml(html, [
      `PAYMENT VOUCHER ${voucherNo}`,
      `Payee: ${payee}`,
      `Amount: ${this.engine.formatMoney(totalAmount, currency)}`,
      `Method: ${this.engine.paymentMethodLabel(method)}`,
      `Generated: ${this.engine.formatDateTime(generatedAt)}`,
    ]);

    return {
      buffer,
      mimeType: 'application/pdf',
      fileName: `pv-${voucherNo.replace(/\//g, '-')}.pdf`,
      artifactType: 'pv_pdf',
    };
  }
}
