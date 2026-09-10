import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  constructor() {
    const logLevels: Prisma.PrismaClientOptions['log'] =
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['info', 'warn', 'error'];

    super({ log: logLevels });
  }

  async onModuleInit() {
    if (this.connected) return;
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.connected = true;
      this.logger.log('Database connected');
    } catch (error) {
      this.connected = false;
      this.logger.error('Failed to connect to database', error);
      throw new Error(
        `Prisma failed to connect during startup: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async onModuleDestroy() {
    if (!this.connected) return;
    try {
      await this.$disconnect();
      this.connected = false;
      this.logger.log('Database disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect from database', error);
    }
  }
}
