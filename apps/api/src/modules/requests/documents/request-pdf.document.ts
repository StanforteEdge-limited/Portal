import { DocumentGeneratorService } from '../../../common/documents/document-generator.service';
import { Document, DocumentIds, DocumentOutput, FullPaymentVoucher, RequestThread } from '../../../common/documents/document.types';

type RequestPdfContext = {
  request: any;
  totalAmount: number;
  generatedAt: Date;
  signatories: any;
  approvals: any;
  paymentVouchers: FullPaymentVoucher[];
  thread: RequestThread;
};

export class RequestPdfDocument implements Document<RequestPdfContext> {
  constructor(private readonly engine: DocumentGeneratorService) {}

  async fetchContext(ids: DocumentIds): Promise<RequestPdfContext> {
    const { requestId } = ids;
    if (!requestId) throw new Error('requestId required');
    const [request, signatories] = await Promise.all([
      this.engine.fetchRequest(requestId),
      this.engine.fetchSignatories(),
    ]);
    const [approvals, paymentVouchers, thread] = await Promise.all([
      this.engine.fetchApprovals(request.workflowInstanceId),
      this.engine.fetchPaymentVouchers(requestId),
      this.engine.fetchThread(requestId),
    ]);
    const totalAmount = this.engine.resolveTotalAmount(request);
    return { request, totalAmount, generatedAt: new Date(), signatories, approvals, paymentVouchers, thread };
  }

  async render(ctx: RequestPdfContext): Promise<DocumentOutput> {
    const { request, totalAmount, generatedAt, signatories, approvals, paymentVouchers, thread } = ctx;
    const currency = request.currency || 'NGN';
    const logoDataUri = this.engine.getPdfLogoDataUri();
    const data =
      request.data && typeof request.data === 'object' && !Array.isArray(request.data)
        ? (request.data as Record<string, unknown>)
        : {};
    const requesterName =
      `${request.creator.firstName ?? ''} ${request.creator.lastName ?? ''}`.trim() ||
      request.creator.username ||
      request.creator.email;
    const requestNumber = this.engine.getRequestNumber(
      request.requestType.codePrefix,
      request.createdAt.getFullYear(),
      request.id,
    );

    const disbursedTotal = paymentVouchers.reduce((sum, pv) => {
      return sum + (pv.grossAmount !== null ? Number(pv.grossAmount) : Number(pv.amount));
    }, 0);
    const totalDeductions = paymentVouchers.reduce((sum, pv) => {
      const gross = pv.grossAmount !== null ? Number(pv.grossAmount) : Number(pv.amount);
      const net = pv.netAmount !== null ? Number(pv.netAmount) : Number(pv.amount);
      return sum + (gross - net);
    }, 0);
    const netDisbursedTotal = disbursedTotal - totalDeductions;
    const retiredTotal = paymentVouchers.reduce((sum, pv) => sum + Number(pv.retiredAmount), 0);
    const unreleased = Math.max(0, totalAmount - disbursedTotal);
    const unspent = Math.max(0, netDisbursedTotal - retiredTotal);
    const netVariance = totalAmount - retiredTotal - totalDeductions;

    const [teamName, organizationName, projectName, categoryName] = await Promise.all([
      this.engine.resolveNameFromReference(
        data.team_name ?? data.team ?? data.team_id ?? (request as any).teamId ?? null,
        'team',
      ),
      this.engine.resolveNameFromReference(
        data.organization_name ?? data.organization ?? data.organization_id ?? (request as any).organizationId ?? null,
        'organization',
      ),
      this.engine.resolveNameFromReference(data.project_name ?? data.project_id ?? '-', 'taxonomy_term'),
      this.engine.resolveNameFromReference(
        data.category_name ?? data.category ?? data.category_id ?? '-',
        'taxonomy_term',
      ),
    ]);

    const findStep = (matcher: RegExp) => approvals.done.find((row: any) => matcher.test(row.step));
    const teamLeadMatcher = /team[\s_-]*lead/i;
    const accountantMatcher = /\b(accountant|finance)\b/i;
    const cooMatcher = /\bcoo\b|chief\s+operating\s+officer/i;
    const edMatcher = /\bed\b|executive director/i;
    const isManualImport = Boolean(data.manual_import);
    const manualApprovals = Array.isArray(data.manual_approvals)
      ? (data.manual_approvals as Array<Record<string, unknown>>)
      : [];
    const manualFor = (matcher: RegExp) =>
      manualApprovals.find((row) => matcher.test(String(row.role ?? '')));

    const teamLead = findStep(teamLeadMatcher);
    const manualTeamLead = manualFor(teamLeadMatcher);
    const accountant = findStep(accountantMatcher);
    const manualAccountant = manualFor(accountantMatcher);
    const coo = findStep(cooMatcher);
    const manualCoo = manualFor(cooMatcher);
    const ed = findStep(edMatcher);
    const manualEd = manualFor(edMatcher);
    const edRequired =
      approvals.done.some((r: any) => edMatcher.test(r.step)) ||
      approvals.pending.some((r: any) => edMatcher.test(r.step)) ||
      manualApprovals.some((r) => edMatcher.test(String(r.role ?? '')));

    const resolve = (step: any, manual: Record<string, unknown> | undefined) =>
      this.engine.resolveApprovalSignatory({ isManualImport, workflowStep: step, manual });

    const roleRows = [
      this.engine.renderApprovalRoleRow({ roleLabel: 'Team Lead', ...resolve(teamLead, manualTeamLead) }),
      this.engine.renderApprovalRoleRow({ roleLabel: 'Accountant', ...resolve(accountant, manualAccountant) }),
      this.engine.renderApprovalRoleRow({ roleLabel: 'COO', ...resolve(coo, manualCoo) }),
      ...(edRequired ? [this.engine.renderApprovalRoleRow({ roleLabel: 'ED', ...resolve(ed, manualEd) })] : []),
    ];

    const voucherPagesHtml = paymentVouchers
      .map((pv) => {
        const pvTotal = this.engine.formatMoney(Number(pv.amount), currency);
        const itemRows = request.items.length
          ? request.items
              .map(
                (item: any, idx: number) =>
                  `<tr><td>${idx + 1}</td><td>${this.engine.escapeHtml(item.description)}</td><td>${this.engine.formatMoney(Number(item.amount) * item.quantity, currency)}</td></tr>`,
              )
              .join('')
          : `<tr><td>1</td><td>${this.engine.escapeHtml(request.requestType.name)} Request</td><td>${pvTotal}</td></tr>`;

        return this.engine.renderVoucherPageHtml({
          pageBreak: true,
          logoDataUri,
          voucherNo: pv.voucherNumber,
          dateText: this.engine.formatDate(pv.disbursedAt),
          payee: requesterName,
          contact: request.creator.email,
          itemsHtml: itemRows,
          totalMoney: pvTotal,
          purpose: String(data.purpose ?? request.requestType.name),
          amountWords: this.engine.amountToWords(Number(pv.amount)),
          method: pv.method,
          details: pv.transactionRef ?? '-',
          preparedBy:
            (isManualImport && manualAccountant?.name ? String(manualAccountant.name) : null) ??
            (signatories.prepared_by.name || '________________'),
          preparedDate:
            isManualImport && manualAccountant?.date
              ? this.engine.formatDate(String(manualAccountant.date))
              : this.engine.formatDate(generatedAt),
          cooBy:
            (isManualImport && manualCoo?.name ? String(manualCoo.name) : null) ??
            (signatories.reviewed_by.name || '________________'),
          cooDate: isManualImport
            ? manualCoo?.date
              ? this.engine.formatDate(String(manualCoo.date))
              : 'Pending'
            : coo
              ? this.engine.formatDate(coo.at)
              : 'Pending',
          cooDone: isManualImport ? Boolean(manualCoo?.done) : Boolean(coo),
          edBy:
            (isManualImport && manualEd?.name ? String(manualEd.name) : null) ??
            (signatories.approved_by.name || '________________'),
          edDate: isManualImport
            ? manualEd?.date
              ? this.engine.formatDate(String(manualEd.date))
              : 'Pending'
            : edRequired
              ? ed
                ? this.engine.formatDate(ed.at)
                : 'Pending'
              : 'N/A',
          edDone: isManualImport ? Boolean(manualEd?.done) : Boolean(ed),
        });
      })
      .join('');

    const html = `<!doctype html>
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
    .amount-big { font-size: 28px; font-weight: 700; line-height: 1.1; }
    .request-no { font-size: 26px; font-weight: 700; text-align: right; }
    .status { font-size: 13px; text-align: right; margin-top: 6px; }
    .two-col { display: table; width: 100%; }
    .two-col > div { display: table-cell; width: 50%; vertical-align: top; padding: 12px; }
    .two-col > div:first-child { border-right: 1px solid #000; }
    .detail-list div { margin-bottom: 5px; }
    .tbl { width: 100%; border-collapse: collapse; }
    .tbl th, .tbl td { border: 1px solid #000; padding: 7px; text-align: left; }
    .tbl th { background: #f3f4f6; }
    .tbl .total-row td { font-weight: 700; background: #f8fafc; }
    .approval-row { display:flex; justify-content:space-between; gap:10px; margin-bottom:10px; border-bottom:1px dashed #cbd5e1; padding-bottom:8px; }
    .approval-title { font-weight:700; }
    .approval-name { margin-top:2px; }
    .approval-right { min-width: 160px; text-align:right; }
    .sig { font-family: "Brush Script MT", cursive; font-size: 24px; line-height: 1; }
    .sig-line { border-bottom:1px solid #111; height: 16px; margin-bottom:3px; }
    .muted { color: #475569; font-size: 11px; }
    .page-break { page-break-before: always; }
    .box { border: 2px solid #000; border-radius: 4px; padding: 14px; }
    .title { text-align: center; font-size: 24px; font-weight: 700; margin: 4px 0 14px; text-decoration: underline; }
    .row { margin: 10px 0; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .line { border-bottom: 1px solid #000; padding: 4px 0; min-height: 20px; }
    .approvals { margin-top: 16px; }
    .approval { border: 1px solid #ddd; border-radius: 5px; padding: 8px; margin-bottom: 8px; }
    .tbl .total td { font-weight: 700; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="rowpad">
      <div class="header-row">
        <div>${logoDataUri ? `<img src="${logoDataUri}" alt="Logo" style="height:42px;" />` : '<strong>Stanforte Edge</strong>'}</div>
        <div>
          <div class="request-no">${this.engine.escapeHtml(requestNumber)}</div>
          <div class="status">${this.engine.escapeHtml(this.engine.toTitle(request.status))}</div>
        </div>
      </div>
    </div>
    <div class="rowpad">
      <div><strong>Amount:</strong></div>
      <div class="amount-big">${this.engine.formatMoney(totalAmount, currency)}</div>
    </div>
    <div class="two-col">
      <div>
        <h3 style="margin:0 0 8px;">Details</h3>
        <div class="detail-list">
          <div><strong>Date:</strong> ${this.engine.formatDate(request.createdAt)}</div>
          <div><strong>Due Date:</strong> ${this.engine.formatDate((data.due_date as string) ?? null)}</div>
          <div><strong>Team:</strong> ${this.engine.escapeHtml(teamName)}</div>
          <div><strong>Organization:</strong> ${this.engine.escapeHtml(organizationName)}</div>
          <div><strong>Project:</strong> ${this.engine.escapeHtml(projectName)}</div>
          <div><strong>Category:</strong> ${this.engine.escapeHtml(categoryName)}</div>
          <div><strong>By:</strong> ${this.engine.escapeHtml(requesterName)}</div>
          <div><strong>Purpose:</strong> ${this.engine.escapeHtml(data.purpose ?? '-')}</div>
        </div>
      </div>
      <div>
        <h3 style="margin:0 0 8px;">Approval Flow</h3>
        ${roleRows.join('')}
      </div>
    </div>
  </div>
  <div class="card"><div class="rowpad"><h3 style="margin:0 0 8px;">Items</h3>
    <table class="tbl">
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead>
      <tbody>
        ${
          request.items.length
            ? request.items
                .map((item: any) => {
                  const lineTotal = Number(item.amount) * item.quantity;
                  return `<tr><td>${this.engine.escapeHtml(item.description)}</td><td>${item.quantity}</td><td>${this.engine.formatMoney(Number(item.amount), currency)}</td><td>${this.engine.formatMoney(lineTotal, currency)}</td></tr>`;
                })
                .join('')
            : '<tr><td colspan="4" style="text-align:center;">No items</td></tr>'
        }
        <tr class="total-row"><td colspan="3">Total</td><td>${this.engine.formatMoney(totalAmount, currency)}</td></tr>
      </tbody>
    </table>
  </div></div>
  <div class="card"><div class="rowpad"><h3 style="margin:0 0 8px;">Disbursement</h3>
    <table class="tbl">
      <thead><tr><th>Voucher No</th><th>Method</th><th>Gross Amount</th><th>Deduction</th><th>Net Paid</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>
        ${
          paymentVouchers.length
            ? paymentVouchers
                .map((pv) => {
                  const gross = pv.grossAmount !== null ? Number(pv.grossAmount) : Number(pv.amount);
                  const net = pv.netAmount !== null ? Number(pv.netAmount) : Number(pv.amount);
                  const deds = (pv.deductions ?? [])
                    .map((d) => `${d.deductionType.name} (${this.engine.formatMoney(Number(d.deductionAmount), currency)})`)
                    .join(', ');
                  const dedText = deds || (gross - net > 0 ? this.engine.formatMoney(gross - net, currency) : '-');
                  return `<tr><td>${this.engine.escapeHtml(pv.voucherNumber)}</td><td>${this.engine.escapeHtml(this.engine.paymentMethodLabel(pv.method))}</td><td>${this.engine.formatMoney(gross, currency)}</td><td>${this.engine.escapeHtml(dedText)}</td><td>${this.engine.formatMoney(net, currency)}</td><td>${this.engine.formatDate(pv.disbursedAt)}</td><td>${this.engine.escapeHtml(this.engine.toTitle(pv.retirementStatus))}</td></tr>`;
                })
                .join('')
            : '<tr><td colspan="7" style="text-align:center;">No disbursement done yet.</td></tr>'
        }
      </tbody>
    </table>
  </div></div>
  <div class="card"><div class="rowpad"><h3 style="margin:0 0 8px;">Reconciliation</h3>
    <table class="tbl">
      <thead><tr><th>Category</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Items (Budget)</td><td>${this.engine.formatMoney(totalAmount, currency)}</td><td>Requested</td></tr>
        <tr><td>Disbursement (Released - Gross)</td><td>${this.engine.formatMoney(disbursedTotal, currency)}</td><td>${disbursedTotal > 0 ? 'Paid' : 'Pending'}</td></tr>
        <tr><td>Statutory Deductions (Withheld)</td><td>${this.engine.formatMoney(totalDeductions, currency)}</td><td>${totalDeductions > 0 ? 'Withheld' : '-'}</td></tr>
        <tr><td>Net Cash Disbursed</td><td>${this.engine.formatMoney(netDisbursedTotal, currency)}</td><td>${netDisbursedTotal > 0 ? 'Disbursed' : 'Pending'}</td></tr>
        <tr><td>Retirement (Spent)</td><td>${this.engine.formatMoney(retiredTotal, currency)}</td><td>${retiredTotal > 0 ? 'Accounted' : 'Pending'}</td></tr>
        <tr><td>Unreleased Funds</td><td>${this.engine.formatMoney(unreleased, currency)}</td><td>${unreleased > 0 ? 'Under-disbursed' : 'Fully disbursed'}</td></tr>
        <tr><td>Unspent Funds</td><td>${this.engine.formatMoney(unspent, currency)}</td><td>${unspent > 0 ? 'Unspent' : 'Fully utilized'}</td></tr>
        <tr><td>Net Variance</td><td>${this.engine.formatMoney(netVariance, currency)}</td><td>${netVariance === 0 ? 'Balanced' : netVariance > 0 ? 'Under-spent' : 'Over-spent'}</td></tr>
      </tbody>
    </table>
  </div></div>
  ${thread.length > 0 ? `<div class="card"><div class="rowpad"><h3 style="margin:0 0 8px;">Approval Thread</h3>${this.engine.renderThreadHtml(thread)}</div></div>` : ''}
  ${voucherPagesHtml}
</body>
</html>`;

    const buffer = await this.engine.renderPdfFromHtml(html, [
      `Request ${requestNumber}`,
      `Status: ${request.status}`,
      `Requester: ${requesterName}`,
      `Total: ${this.engine.formatMoney(totalAmount, currency)}`,
      `Generated: ${this.engine.formatDateTime(generatedAt)}`,
    ]);

    return {
      buffer,
      mimeType: 'application/pdf',
      fileName: `request-${requestNumber.replace(/\//g, '-')}.pdf`,
      artifactType: 'request_pdf',
    };
  }
}
