import { DocumentGeneratorService } from '../../../common/documents/document-generator.service';
import { Document, DocumentIds, DocumentOutput } from '../../../common/documents/document.types';

type CertificateContext = {
  request: any;
  logoDataUri: string | null;
  signatureDataUri: string | null;
  staffName: string;
  requestLabel: string;
  voucherNumber: string;
  amountLabel: string;
  declaration: string;
  reason: string;
  issuedAt: string;
  generatedAt: Date;
};

export class CertificateOfHonorDocument implements Document<CertificateContext> {
  constructor(private readonly engine: DocumentGeneratorService) {}

  async fetchContext(ids: DocumentIds): Promise<CertificateContext> {
    const { requestId, options = {} } = ids;
    if (!requestId) throw new Error('requestId required');
    const generatedAt = new Date();
    const request = await this.engine.fetchRequest(requestId);
    const logoDataUri = this.engine.getPdfLogoDataUri();

    let signatureDataUri: string | null = null;
    if (options.signature_file_id) {
      const sigAsset = await this.engine.prisma.fileAsset.findUnique({
        where: { id: options.signature_file_id as string },
      });
      if (sigAsset) {
        const buf = await this.engine.readAssetFileBuffer(sigAsset);
        if (buf) {
          const ext = (sigAsset.fileName ?? '').split('.').pop()?.toLowerCase() ?? 'png';
          const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
          signatureDataUri = `data:${mime};base64,${buf.toString('base64')}`;
        }
      }
    }

    const staffName =
      (typeof options.staff_name === 'string' && options.staff_name.trim()) ||
      `${request.creator.firstName ?? ''} ${request.creator.lastName ?? ''}`.trim() ||
      request.creator.email;

    const requestLabel =
      (typeof options.request_label === 'string' && options.request_label.trim()) ||
      this.engine.getRequestNumber(request.requestType.codePrefix, request.createdAt.getFullYear(), request.id);

    const voucherNumber =
      (typeof options.voucher_number === 'string' && options.voucher_number.trim()) || '-';
    const amountLabel =
      (typeof options.amount_label === 'string' && options.amount_label.trim()) || '-';
    const declaration =
      (typeof options.declaration === 'string' && options.declaration.trim()) ||
      'I hereby certify that the cash advance and/or disbursed funds referenced above were used for official purposes.';
    const reason =
      (typeof options.reason === 'string' && options.reason.trim()) ||
      'No additional explanation provided.';
    const issuedAt =
      (typeof options.issued_at === 'string' && options.issued_at.trim()) ||
      this.engine.formatDate(generatedAt);

    return {
      request,
      logoDataUri,
      signatureDataUri,
      staffName,
      requestLabel,
      voucherNumber,
      amountLabel,
      declaration,
      reason,
      issuedAt,
      generatedAt,
    };
  }

  async render(ctx: CertificateContext): Promise<DocumentOutput> {
    const {
      logoDataUri,
      signatureDataUri,
      staffName,
      requestLabel,
      voucherNumber,
      amountLabel,
      declaration,
      reason,
      issuedAt,
      generatedAt,
    } = ctx;

    const html = this.engine.renderCertificateHtml({
      logoDataUri,
      signatureDataUri,
      staffName,
      requestLabel,
      voucherNumber,
      amountLabel,
      declaration,
      reason,
      issuedAt,
    });

    const buffer = await this.engine.renderPdfFromHtml(html, [
      'CERTIFICATE OF HONOR',
      'Cash Advance Retirement Declaration',
      '',
      `Request:         ${requestLabel}`,
      `Payment Voucher: ${voucherNumber}`,
      `Staff Member:    ${staffName}`,
      `Amount:          ${amountLabel}`,
      `Date:            ${issuedAt}`,
      '',
      'Declaration:',
      declaration,
      '',
      'Why receipts are unavailable:',
      reason,
      '',
      'Signature: ____________________________',
      `Name: ${staffName}`,
    ]);

    return {
      buffer,
      mimeType: 'application/pdf',
      fileName: `Certificate_of_Honor_${this.engine.zipSafeName(requestLabel)}.pdf`,
      artifactType: 'certificate_of_honor_pdf',
    };
  }
}
