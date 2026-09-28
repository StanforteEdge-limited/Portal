import type { Queue } from 'bullmq';
import type { SendMailInput } from '$core/mail';

export type QueuedMailInput = SendMailInput & {
  userId?: string | bigint;
  notifiableType?: string;
  notifiableId?: string | number | bigint;
};

export class MailQueueService {
  constructor(private readonly mailQueue: Queue) {}

  enqueue(input: QueuedMailInput, options: { delayMs?: number; jobId?: string } = {}) {
    return this.mailQueue.add('send-email', this.serialize(input), {
      jobId: options.jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
      delay: options.delayMs ?? 0,
    });
  }

  private serialize(input: QueuedMailInput): QueuedMailInput {
    if (!input.attachments?.length) return input;
    const attachments = input.attachments.map((attachment) => {
      if (Buffer.isBuffer(attachment.content)) {
        return {
          ...attachment,
          content: attachment.content.toString('base64'),
          encoding: attachment.encoding ?? 'base64',
        };
      }
      return attachment;
    });
    return { ...input, attachments };
  }
}
