import Redis from 'ioredis';
import { Container } from './bootstrap/container';
import { assertProductionSecrets } from './config';
import { DbService } from '$core/db';
import { Logger } from '$core/logger';
import { createWorker, QUEUE_NAMES } from '$core/queues';
import { isRedisConfigured, redisConnectionOptions } from '$core/redis';
import { toBigInt } from '$core/utils';

const logger = new Logger('WorkerProcess');
const SHUTDOWN_TIMEOUT_MS = Math.max(5000, Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || 25_000));

async function startWorkerProcess() {
  assertProductionSecrets();

  if (!isRedisConfigured()) {
    throw new Error('Redis is required to run the standalone BullMQ worker process');
  }

  const db = new DbService();
  await db.connect();

  const redis = new Redis(
    redisConnectionOptions({
      lazyConnect: true,
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    }),
  );
  redis.on('error', (err) => logger.warn(`Redis error: ${err.message}`));
  await redis.connect();
  await redis.ping();
  logger.log(`Redis connected (${redis.options.host}:${redis.options.port})`);

  const container = new Container(db, redis);
  await container.cache.connect();

  // 1. Start Mail BullMQ worker (with rate limiting & exponential backoff)
  container.mailWorker.start();
  logger.log('BullMQ mail worker started');

  // 2. Start Background Jobs BullMQ worker (restores tenant context per job)
  const bgJobsWorker = createWorker(
    QUEUE_NAMES.backgroundJobs,
    async (job) => {
      const data = job.data as {
        jobId: string;
        type: string;
        input?: unknown;
        actor?: { profileId: string; membershipId: string; isOwner: boolean } | null;
        createdBy?: string | null;
      };
      const handler = container.backgroundJobs.getHandler(data.type);
      if (!handler) {
        throw new Error(`No background job handler registered for type "${data.type}"`);
      }

      const jobRowId = toBigInt(data.jobId);
      await container.backgroundJobs.markStarted(jobRowId);

      const ctx = {
        actorId: data.actor?.profileId ?? data.createdBy ?? undefined,
        progress: async (percent: number) => {
          await container.backgroundJobs.updateProgress(jobRowId, percent);
          await job.updateProgress(percent).catch(() => undefined);
        },
      };

      try {
        const result = await handler(data.input ?? {}, ctx);
        await container.backgroundJobs.complete(jobRowId, result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await container.backgroundJobs.fail(jobRowId, message);
        throw err;
      }
    },
    {
      concurrency: Math.max(1, Number(process.env.BG_WORKER_CONCURRENCY || 2)),
      lockDuration: Number(process.env.BG_WORKER_LOCK_DURATION_MS || 60_000),
    },
  );
  logger.log('BullMQ background-jobs worker started');

  let shuttingDown = false;
  const shutdown = async (signal: string, exitCode = 0) => {
    if (shuttingDown) {
      logger.warn(`Shutdown already in progress (ignored duplicate ${signal})`);
      return;
    }
    shuttingDown = true;
    logger.log(`Received ${signal}; draining active BullMQ jobs (timeout ${SHUTDOWN_TIMEOUT_MS}ms)...`);

    const forceTimer = setTimeout(() => {
      logger.error(`Graceful worker shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms; forcing exit`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    try {
      // Wait for active jobs to finish before closing connections
      await Promise.allSettled([
        container.mailWorker.close(),
        bgJobsWorker.close(),
      ]);
      if (container.isProvided('queues')) {
        await container.queues.close();
      }
      await redis.quit().catch(() => redis.disconnect());
      await db.close();
      clearTimeout(forceTimer);
      logger.log('Worker shutdown complete');
      process.exit(exitCode);
    } catch (error) {
      logger.error('Worker graceful shutdown failed', error);
      clearTimeout(forceTimer);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
  process.on('SIGINT', () => void shutdown('SIGINT', 0));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection in worker', reason);
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception in worker', error);
    void shutdown('uncaughtException', 1);
  });
}

startWorkerProcess().catch((error) => {
  logger.error('Failed to start worker process', error);
  process.exit(1);
});
