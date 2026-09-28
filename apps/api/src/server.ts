import { buildServer, logger } from './bootstrap';
import { config, assertProductionSecrets } from './config';

async function bootstrap() {
  assertProductionSecrets();

  const server = await buildServer();

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}; shutting down`);
    try {
      await server.close();
      process.exit(0);
    } catch (error) {
      logger.error('Graceful shutdown failed', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await server.listen({ port: config.port, host: config.host });
  logger.log(`API listening on ${config.host}:${config.port}`);
}

bootstrap().catch((error) => {
  logger.error('Failed to start API', error);
  process.exit(1);
});
