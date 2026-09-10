import { DocumentGeneratorService } from '../../../common/documents/document-generator.service';
import { Document, DocumentIds, DocumentOutput, RequestRemittanceAllocationSummary } from '../../../common/documents/document.types';
import { RequestPdfDocument } from './request-pdf.document';
import { PaymentVoucherDocument } from './payment-voucher.document';

type FullPackageContext = {
  request: any;
  requestPdfBuffer: Buffer;
  pvEntries: Array<{ voucherZipName: string; pvPdfBuffer: Buffer; voucher: any }>;
  trmSlips: Array<{ fileName: string; buffer: Buffer }>;
  remittanceAllocationSummary: RequestRemittanceAllocationSummary[];
  requestNumber: string;
  generatedAt: Date;
};

export class FullPackageDocument implements Document<FullPackageContext> {
  constructor(private readonly engine: DocumentGeneratorService) {}

  async fetchContext(ids: DocumentIds): Promise<FullPackageContext> {
    const { requestId } = ids;
    if (!requestId) throw new Error('requestId required');
    const generatedAt = new Date();

    const requestPdfDoc = new RequestPdfDocument(this.engine);
    const pdfCtx = await requestPdfDoc.fetchContext({ ...ids, options: {} });
    const pdfOutput = await requestPdfDoc.render(pdfCtx);

    const request = pdfCtx.request;
    const requestNumber = this.engine.getRequestNumber(
      request.requestType.codePrefix,
      request.createdAt.getFullYear(),
      request.id,
    );

    const paymentVouchers = await this.engine.fetchPaymentVouchers(requestId);

    const pvEntries: FullPackageContext['pvEntries'] = [];
    for (const pv of paymentVouchers) {
      const pvDoc = new PaymentVoucherDocument(this.engine);
      const pvCtx = await pvDoc.fetchContext({ requestId, voucherId: pv.id });
      const pvOutput = await pvDoc.render(pvCtx);
      pvEntries.push({
        voucherZipName: this.engine.zipSafeName(pv.voucherNumber),
        pvPdfBuffer: pvOutput.buffer,
        voucher: pv,
      });
    }

    const trmSlips = await this.engine.fetchRemittedTrmSlips(requestId);
    const remittanceAllocationSummary = await this.engine.fetchRequestRemittanceAllocationSummary(requestId);

    return { request, requestPdfBuffer: pdfOutput.buffer, pvEntries, trmSlips, remittanceAllocationSummary, requestNumber, generatedAt };
  }

  async render(ctx: FullPackageContext): Promise<DocumentOutput> {
    const { request, requestPdfBuffer, pvEntries, trmSlips, remittanceAllocationSummary, requestNumber, generatedAt } = ctx;
    const requestZipName = this.engine.zipSafeName(requestNumber);
    const fileIdSet = new Set<string>();

    const entries: Array<{ path: string; buffer: Buffer }> = [
      { path: `request/${requestZipName}.pdf`, buffer: requestPdfBuffer },
    ];

    const addFile = async (file: any, targetPath: string) => {
      if (!file?.id || fileIdSet.has(file.id)) return;
      fileIdSet.add(file.id);
      const buffer = await this.engine.readAssetFileBuffer(file);
      if (buffer) {
        entries.push({ path: targetPath, buffer });
      } else {
        entries.push({
          path: `${targetPath}.missing.txt`,
          buffer: Buffer.from(
            `File not found in local storage.\nAsset ID: ${file.id}\nPath: ${file.storagePath ?? '-'}`,
          ),
        });
      }
    };

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
        await addFile(file, `request/attachments/${file.fileName}`);
      }
    }

    for (const { voucherZipName, pvPdfBuffer, voucher } of pvEntries) {
      entries.push({ path: `vouchers/${voucherZipName}/${voucherZipName}.pdf`, buffer: pvPdfBuffer });

      const evidenceFiles = Array.from(
        new Map(
          [
            ...(voucher.attachments ?? []).map((a: any) => a.file).filter(Boolean),
            voucher.evidenceFile ?? null,
          ]
            .filter(Boolean)
            .map((f: any) => [f.id, f]),
        ).values(),
      ) as any[];
      for (const file of evidenceFiles) {
        await addFile(file, `vouchers/${voucherZipName}/receipts/${file.fileName}`);
      }

      if (voucher.metadata && typeof voucher.metadata === 'object' && !Array.isArray(voucher.metadata)) {
        const retirementIds = (voucher.metadata as Record<string, unknown>).retirement_file_ids;
        if (Array.isArray(retirementIds)) {
          const retirementFiles = await this.engine.prisma.fileAsset.findMany({
            where: { id: { in: retirementIds.filter((x): x is string => typeof x === 'string') } },
          });
          for (const file of retirementFiles) {
            await addFile(file, `retirements/${voucherZipName}/${file.fileName}`);
          }
        }
      }
    }

    for (const slip of trmSlips) {
      entries.push({ path: `tax/${slip.fileName}`, buffer: slip.buffer });
    }

    if (remittanceAllocationSummary.length > 0) {
      const lines = [
        'Request Remittance Allocation Summary',
        '',
        ...remittanceAllocationSummary.flatMap((row) => [
          `Request: ${row.requestNumber}`,
          `Voucher: ${row.voucherNumber ?? '-'}`,
          `Deduction: ${row.deductionTypeName} (${row.deductionTypeCode})`,
          `Withheld: ${row.withheldAmount.toFixed(2)}`,
          `Allocated: ${row.allocatedTotal.toFixed(2)}`,
          `Remaining: ${row.remainingBalance.toFixed(2)}`,
          ...row.allocations.map((allocation) => `  - ${allocation.remittanceNumber}${allocation.remittanceRef ? ` | ${allocation.remittanceRef}` : ''} | ${allocation.allocatedAmount.toFixed(2)} | ${allocation.remittedAt ? new Date(allocation.remittedAt).toISOString().slice(0, 10) : '-'}`),
          '',
        ]),
      ];
      entries.push({
        path: 'tax/remittance-allocation-summary.txt',
        buffer: Buffer.from(lines.join('\n')),
      });
    }

    const buffer = await this.engine.buildZipPackage(entries);
    const fileName = `${requestZipName}-full-package-${this.engine.compactDate(generatedAt)}.zip`;

    return {
      buffer,
      mimeType: 'application/zip',
      fileName,
      artifactType: 'full_package',
    };
  }
}
