import { type Queue, type Worker } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '$core/queues';
import type { MailService, SendMailInput } from '$core/mail';

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

export class MailQueueWorker {
  private worker?: Worker;

  constructor(private readonly mail: MailService) {}

  start() {
    if (this.worker) return;

    this.worker = createWorker(
      QUEUE_NAMES.mail,
      async (job) => {
        const result = await this.mail.send(job.data as QueuedMailInput);
        if (!result.sent) {
          throw new Error(`Email delivery failed: ${result.reason}`);
        }
        return result;
      },
      {
        concurrency: Math.max(1, Number(process.env.MAIL_WORKER_CONCURRENCY || 5)),
        limiter: {
          max: Math.max(1, Number(process.env.MAIL_WORKER_RATE_MAX || 20)),
          duration: Math.max(100, Number(process.env.MAIL_WORKER_RATE_DURATION_MS || 1000)),
        },
      },
    );
  }

  async close() {
    await this.worker?.close();
    this.worker = undefined;
  }
}
