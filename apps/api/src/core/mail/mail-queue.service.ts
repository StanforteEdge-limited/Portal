import { Queue } from 'bullmq';
import { SendMailInput } from './mail.service';

/**
 * Submission stub for the in-process `mail` Bull queue.
 *
 * Request-path code should enqueue through here instead of awaiting real SMTP
 * inline, so an SMTP hiccup can never block a portal request.
 */
export class MailQueueService {
  constructor(private readonly mailQueue: Queue) {}

  enqueue(
    input: SendMailInput,
    options: { delayMs?: number; jobId?: string } = {},
  ) {
    return this.mailQueue.add(
      'send-email',
      this.serialize(input),
      {
        jobId: options.jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
        delay: options.delayMs ?? 0,
      },
    );
  }

  private serialize(input: SendMailInput): SendMailInput {
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
