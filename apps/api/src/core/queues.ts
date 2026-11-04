import { Queue, Worker, type JobsOptions, type Processor, type QueueOptions, type WorkerOptions } from 'bullmq';
import { Logger } from '$core/logger';
import { isRedisConfigured, redisConnectionOptions, redisKeyPrefix } from '$core/redis';

/** Queue names used across the API. */
export const QUEUE_NAMES = {
  mail: 'mail',
  notifications: 'notifications',
  backgroundJobs: 'background-jobs',
} as const;

const bullPrefix = () => `${redisKeyPrefix()}bull`;

/**
 * Connection for BullMQ producers. Fails fast (no offline queue) so a Redis
 * outage surfaces as an error the caller can fall back from, instead of
 * hanging the HTTP request.
 */
export function redisConnection() {
  return redisConnectionOptions({ maxRetriesPerRequest: 1, enableOfflineQueue: false });
}

/** Connection for BullMQ workers (blocking commands require `null` retries). */
export function workerRedisConnection() {
  return redisConnectionOptions({ maxRetriesPerRequest: null });
}

export class QueueRegistry {
  private readonly logger = new Logger(QueueRegistry.name);
  private readonly options: QueueOptions;
  private readonly queues = new Map<string, Queue>();
  readonly enabled: boolean;

  /** `enabled` defaults to whether Redis is configured/available. */
  constructor(enabled?: boolean) {
    this.enabled = enabled ?? isRedisConfigured();
    this.options = { connection: redisConnection(), prefix: bullPrefix() };
  }

  /** Returns the queue instance. */
  get(name: string): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;
    const queue = new Queue(name, this.options);
    queue.on('error', (error) => this.logger.debug(`Queue ${name} error: ${error.message}`));
    this.queues.set(name, queue);
    this.logger.log(`Queue ready: ${name}`);
    return queue;
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close().catch(() => undefined)));
    this.queues.clear();
  }
}

export function createWorker<T = any, R = any>(
  name: string,
  processor: Processor<T, R>,
  options: Partial<WorkerOptions> = {},
): Worker<T, R> {
  const logger = new Logger(`Worker:${name}`);
  const worker = new Worker<T, R>(name, processor, {
    connection: workerRedisConnection(),
    prefix: bullPrefix(),
    ...options,
  });
  worker.on('completed', (job) => logger.debug(`completed job ${job.id}`));
  worker.on('failed', (job, error) => logger.warn(`failed job ${job?.id ?? 'unknown'}: ${error.message}`));
  worker.on('error', (error) => logger.debug(`worker error: ${error.message}`));
  return worker;
}

export type { JobsOptions };
