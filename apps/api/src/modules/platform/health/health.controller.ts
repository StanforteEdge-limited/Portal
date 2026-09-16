import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  getHealth() {
    // Liveness: the process is up. Readiness lives at GET /health/ready.
    return { status: 'ok' };
  }

  @Get('ready')
  async getReady(@Res() res: Response) {
    const report = await this.health.ready();
    res.status(report.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(report);
  }
}