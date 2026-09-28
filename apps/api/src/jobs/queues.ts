import { Queue, type JobsOptions, type QueueOptions } from 'bullmq';
import { Logger } from '$core/logger';
import type { SendMailInput } from '$core/mail';

export type QueuedMailInput = SendMailInput & {
  userId?: string | bigint;
  notifiableType?: string;
  notifiableId?: string | number | bigint;
};

export function redisConnection() {
  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

export class QueueRegistry {
  private readonly logger = new Logger(QueueRegistry.name);
  private readonly options: QueueOptions;
  private readonly queues = new Map<string, Queue>();

  constructor() {
    this.options = { connection: redisConnection() };
  }

  get(name: string): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;
    const queue = new Queue(name, this.options);
    this.queues.set(name, queue);
    this.logger.log(`Queue ready: ${name}`);
    return queue;
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.queues.clear();
  }
}

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

export type { JobsOptions };