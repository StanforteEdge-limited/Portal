import { Queue, type JobsOptions, type QueueOptions } from 'bullmq';
import { Logger } from '$core/logger';

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

export type { JobsOptions };
