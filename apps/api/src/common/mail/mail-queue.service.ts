import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SendMailInput } from './mail.service';

/**
 * Submission stub for the in-process `mail` Bull queue.
 *
 * Request-path code should enqueue through here (fire-and-forget) instead of
 * awaiting real SMTP inline; the `MailWorker` consumes the queue and calls
 * `MailService.send`. This mirrors the proven `notifications` queue exactly —
 * same `@Global` Bull root, same registered-queue pattern — so an SMTP hiccup
 * can never block a portal request.
 */
@Injectable()
export class MailQueueService {
  constructor(@InjectQueue('mail') private readonly mailQueue: Queue) {}

  enqueue(
    input: SendMailInput,
    options: { delayMs?: number; jobId?: string } = {},
  ) {
    return this.mailQueue.add(
      'send-email',
      input,
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
}
