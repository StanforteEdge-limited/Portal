import { DocumentGeneratorService } from '../../../common/documents/document-generator.service';
import { Document, DocumentIds, DocumentOutput, RequestRemittanceAllocationSummary } from '../../../common/documents/document.types';
import { RequestPdfDocument } from './request-pdf.document';

type FullDocumentContext = {
  request: any;
  requestPdfBuffer: Buffer;
  remittanceAllocationSummary: RequestRemittanceAllocationSummary[];
  requestNumber: string;
  generatedAt: Date;
};

export class FullDocumentDocument implements Document<FullDocumentContext> {
  constructor(private readonly engine: DocumentGeneratorService) {}

  async fetchContext(ids: DocumentIds): Promise<FullDocumentContext> {
    const { requestId } = ids;
    if (!requestId) throw new Error('requestId required');
    const generatedAt = new Date();

    const requestPdfDoc = new RequestPdfDocument(this.engine);
    const pdfCtx = await requestPdfDoc.fetchContext({ ...ids, options: {} });
    const pdfOutput = await requestPdfDoc.render(pdfCtx);

    const request = pdfCtx.request;
    const remittanceAllocationSummary = await this.engine.fetchRequestRemittanceAllocationSummary(requestId);
    const requestNumber = this.engine.getRequestNumber(
      request.requestType.codePrefix,
      request.createdAt.getFullYear(),
      request.id,
    );

    return { request, requestPdfBuffer: pdfOutput.buffer, remittanceAllocationSummary, requestNumber, generatedAt };
  }

  async render(ctx: FullDocumentContext): Promise<DocumentOutput> {
    const { request, requestPdfBuffer, remittanceAllocationSummary, requestNumber, generatedAt } = ctx;
    const mergedPdf = await this.engine.buildMergedPdf();
    await this.engine.appendPdfBuffer(mergedPdf, requestPdfBuffer);

    const skippedFiles: string[] = [];

    for (const item of request.items) {
      const files = Array.from(
        new Map(
          [
            ...(item.files ?? []).map((a: any) => a.file).filter(Boolean),
            item.file ?? null,
          ]
            .filter(Boolean)
            .map((f: any) => [f.id, f]),
        ).values(),
      ) as any[];
      for (const file of files) {
        const buffer = await this.engine.readAssetFileBuffer(file);
        await this.engine.appendAssetToPdf(mergedPdf, buffer, file.fileName, file.mimeType, skippedFiles);
      }
    }

    const paymentVouchers = await this.engine.fetchPaymentVouchers(request.id.toString());

    for (const pv of paymentVouchers) {
      const evidenceFiles = Array.from(
        new Map(
          [
            ...(pv.attachments ?? []).map((a: any) => a.file).filter(Boolean),
            pv.evidenceFile ?? null,
          ]
            .filter(Boolean)
            .map((f: any) => [f.id, f]),
        ).values(),
      ) as any[];
      for (const file of evidenceFiles) {
        const buffer = await this.engine.readAssetFileBuffer(file);
        await this.engine.appendAssetToPdf(mergedPdf, buffer, file.fileName, file.mimeType, skippedFiles);
      }

      if (pv.metadata && typeof pv.metadata === 'object' && !Array.isArray(pv.metadata)) {
        const ids = (pv.metadata as Record<string, unknown>).retirement_file_ids;
        if (Array.isArray(ids)) {
          const retirementFiles = await this.engine.prisma.fileAsset.findMany({
            where: { id: { in: ids.filter((x): x is string => typeof x === 'string') } },
          });
          for (const file of retirementFiles) {
            const buffer = await this.engine.readAssetFileBuffer(file);
            await this.engine.appendAssetToPdf(mergedPdf, buffer, file.fileName, file.mimeType, skippedFiles);
          }
        }
      }
    }

    const trmSlips = await this.engine.fetchRemittedTrmSlips(request.id.toString());
    for (const slip of trmSlips) {
      await this.engine.appendPdfBuffer(mergedPdf, slip.buffer);
    }

    if (remittanceAllocationSummary.length > 0) {
      for (const row of remittanceAllocationSummary) {
        await this.engine.appendTextPage(
          mergedPdf,
          `Remittance Allocation Summary - ${row.deductionTypeName}`,
          [
            `Request: ${row.requestNumber}`,
            `Voucher: ${row.voucherNumber ?? '-'}`,
            `Deduction: ${row.deductionTypeName} (${row.deductionTypeCode})`,
            `Withheld Amount: ${row.withheldAmount.toFixed(2)}`,
            `Allocated Total: ${row.allocatedTotal.toFixed(2)}`,
            `Remaining Balance: ${row.remainingBalance.toFixed(2)}`,
            'Allocations:',
            ...row.allocations.map((allocation) => `- ${allocation.remittanceNumber}${allocation.remittanceRef ? ` | ${allocation.remittanceRef}` : ''} | ${allocation.allocatedAmount.toFixed(2)} | ${allocation.remittedAt ? new Date(allocation.remittedAt).toISOString().slice(0, 10) : '-'}`),
          ],
        );
      }
    }

    if (skippedFiles.length > 0) {
      await this.engine.appendTextPage(
        mergedPdf,
        'Attachments not embedded',
        skippedFiles.map((name) => `- ${name}`),
      );
    }

    const requestZipName = this.engine.zipSafeName(requestNumber);
    const fileName = `${requestZipName}-full-document-${this.engine.compactDate(generatedAt)}.pdf`;
    const buffer = Buffer.from(await mergedPdf.save());

    return {
      buffer,
      mimeType: 'application/pdf',
      fileName,
      artifactType: 'full_document',
    };
  }
}
