import { BadRequestException } from '$core/errors';
import { toBigInt } from '$core/utils';
import { PdfService } from '$core/pdf';
import { MailQueueService } from '$app/jobs/queues';
import {
  DocumentGeneratorService as CoreDocumentGeneratorService,
  type Document,
  type DocumentIds,
  type DocumentOutput,
  type DocumentResponse,
} from '$core/documents';

export * from '$core/documents';

export type EmailDeliveryResponse = {
  success: true;
  delivery: 'email';
  email_to: string;
  file_name: string;
  request_id?: string;
};

export class DocumentGeneratorService extends CoreDocumentGeneratorService {
  constructor(
    pdfService: PdfService,
    private readonly mailQueue: MailQueueService,
  ) {
    super(pdfService);
  }

  async generateWithEmailDelivery(
    document: Document<any>,
    ids: DocumentIds,
    userId: string,
    delivery: {
      mode: 'email' | 'download';
      email_to?: string;
      requestNumber: string;
      creatorEmail: string;
    },
  ): Promise<DocumentResponse | EmailDeliveryResponse> {
    const generatedAt = new Date();
    const ctx = await document.fetchContext(ids);
    const output = await document.render(ctx);
    await this.afterGenerated(ids, userId, output, generatedAt);

    if (delivery.mode !== 'email') {
      return this.wrapResponse(output, ids.requestId, generatedAt);
    }

    const recipient = delivery.email_to?.trim() || delivery.creatorEmail;
    if (!recipient) {
      throw new BadRequestException('No recipient email available for package delivery');
    }

    await this.mailQueue.enqueue({
      to: recipient,
      subject: `Full Request Package - ${delivery.requestNumber}`,
      text: `Attached is the full request package for ${delivery.requestNumber}.`,
      threadKey: `request-${ids.requestId}-full-package`,
      userId,
      notifiableType: 'request',
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
      delivery: 'email',
      email_to: recipient,
      file_name: output.fileName,
      request_id: ids.requestId,
    };
  }
}
