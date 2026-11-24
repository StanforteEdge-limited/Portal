import { buildServer, logger } from './bootstrap';
import { config, assertProductionSecrets } from './config';

const SHUTDOWN_TIMEOUT_MS = Math.max(5000, Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS || 20_000));

async function bootstrap() {
  assertProductionSecrets();

  const server = await buildServer();
  let shuttingDown = false;

  // Immediately signal draining to load balancers & clients on shutdown while
  // letting in-flight requests complete cleanly.
  server.addHook('onRequest', async (_request, reply) => {
    if (!shuttingDown) return;
    reply
      .header('Connection', 'close')
      .header('Retry-After', '5')
      .status(503)
      .send({
        success: false,
        error: {
          status_code: 503,
          message: 'Server is restarting; please retry shortly',
        },
      });
  });

  const shutdown = async (signal: string, exitCode = 0) => {
    if (shuttingDown) {
      logger.warn(`Shutdown already in progress (ignored duplicate ${signal})`);
      return;
    }
    shuttingDown = true;
    logger.log(`Received ${signal}; draining in-flight HTTP requests (timeout ${SHUTDOWN_TIMEOUT_MS}ms)...`);

    const forceTimer = setTimeout(() => {
      logger.error(`Graceful API shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms; forcing exit`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    try {
      await server.close();
      clearTimeout(forceTimer);
      logger.log('API shutdown complete');
      process.exit(exitCode);
    } catch (error) {
      logger.error('Graceful shutdown failed', error);
      clearTimeout(forceTimer);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
  process.on('SIGINT', () => void shutdown('SIGINT', 0));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
  });
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    void shutdown('uncaughtException', 1);
  });

  await server.listen({ port: config.port, host: config.host });
  logger.log(`API listening on ${config.host}:${config.port}`);
}

bootstrap().catch((error) => {
  logger.error('Failed to start API', error);
  process.exit(1);
});
