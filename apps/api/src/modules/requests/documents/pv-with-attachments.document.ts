import { NotFoundException } from '@nestjs/common';
import { DocumentGeneratorService } from '../../../common/documents/document-generator.service';
import { Document, DocumentIds, DocumentOutput } from '../../../common/documents/document.types';
import { PaymentVoucherDocument } from './payment-voucher.document';
import { toBigInt } from '../../../common/utils/ids';

type PVWithAttachmentsContext = {
  voucher: any;
  pvPdfBuffer: Buffer;
  generatedAt: Date;
  requestId: string;
};

export class PVWithAttachmentsDocument implements Document<PVWithAttachmentsContext> {
  constructor(private readonly engine: DocumentGeneratorService) {}

  async fetchContext(ids: DocumentIds): Promise<PVWithAttachmentsContext> {
    const { requestId, voucherId } = ids;
    if (!requestId) throw new Error('requestId required');
    if (!voucherId) throw new Error('voucherId required');
    const generatedAt = new Date();

    const voucher = await this.engine.prisma.financePaymentVoucher.findFirst({
      where: { requestId: toBigInt(requestId), id: voucherId },
      include: {
        evidenceFile: true,
        attachments: {
          where: { fileKind: 'evidence' },
          include: { file: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!voucher) throw new NotFoundException('Payment voucher not found');

    const pvDoc = new PaymentVoucherDocument(this.engine);
    const pvCtx = await pvDoc.fetchContext(ids);
    const pvOutput = await pvDoc.render(pvCtx);

    return { voucher, pvPdfBuffer: pvOutput.buffer, generatedAt, requestId };
  }

  async render(ctx: PVWithAttachmentsContext): Promise<DocumentOutput> {
    const { voucher, pvPdfBuffer, generatedAt } = ctx;
    const voucherZipName = this.engine.zipSafeName(voucher.voucherNumber);

    const entries: Array<{ path: string; buffer: Buffer }> = [
      { path: `voucher/${voucherZipName}.pdf`, buffer: pvPdfBuffer },
    ];

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
      const buffer = await this.engine.readAssetFileBuffer(file);
      if (buffer) {
        entries.push({ path: `voucher/receipts/${file.fileName}`, buffer });
      }
    }

    const retirementIds: string[] =
      voucher.metadata && typeof voucher.metadata === 'object' && !Array.isArray(voucher.metadata)
        ? (((voucher.metadata as Record<string, unknown>).retirement_file_ids as unknown[]) ?? []).filter(
            (x): x is string => typeof x === 'string',
          )
        : [];

    if (retirementIds.length) {
      const files = await this.engine.prisma.fileAsset.findMany({ where: { id: { in: retirementIds } } });
      for (const file of files) {
        const buffer = await this.engine.readAssetFileBuffer(file);
        if (buffer) {
          entries.push({ path: `retirements/${file.fileName}`, buffer });
        }
      }
    }

    const buffer = await this.engine.buildZipPackage(entries);

    return {
      buffer,
      mimeType: 'application/zip',
      fileName: `${voucherZipName}-full-${this.engine.compactDate(generatedAt)}.zip`,
      artifactType: 'pv_with_attachments',
    };
  }
}
