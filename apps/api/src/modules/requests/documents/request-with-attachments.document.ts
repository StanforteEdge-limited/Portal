import { DocumentGeneratorService } from '../../../common/documents/document-generator.service';
import { Document, DocumentIds, DocumentOutput } from '../../../common/documents/document.types';
import { RequestPdfDocument } from './request-pdf.document';

type RequestWithAttachmentsContext = {
  request: any;
  requestPdfBuffer: Buffer;
  requestNumber: string;
  generatedAt: Date;
};

export class RequestWithAttachmentsDocument implements Document<RequestWithAttachmentsContext> {
  constructor(private readonly engine: DocumentGeneratorService) {}

  async fetchContext(ids: DocumentIds): Promise<RequestWithAttachmentsContext> {
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

    return { request, requestPdfBuffer: pdfOutput.buffer, requestNumber, generatedAt };
  }

  async render(ctx: RequestWithAttachmentsContext): Promise<DocumentOutput> {
    const { request, requestPdfBuffer, requestNumber, generatedAt } = ctx;
    const requestZipName = this.engine.zipSafeName(requestNumber);

    const entries: Array<{ path: string; buffer: Buffer }> = [
      { path: `request/${requestZipName}.pdf`, buffer: requestPdfBuffer },
    ];

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
        if (buffer) {
          entries.push({ path: `request/attachments/${file.fileName}`, buffer });
        }
      }
    }

    const buffer = await this.engine.buildZipPackage(entries);

    return {
      buffer,
      mimeType: 'application/zip',
      fileName: `${requestZipName}-attachments-${this.engine.compactDate(generatedAt)}.zip`,
      artifactType: 'request_with_attachments',
    };
  }
}
