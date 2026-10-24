import {
  Controller,
  Get,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Used by the deploy pipeline's post-deploy smoke test and by CloudWatch/ALB
 * health checks (docs/ARCHITECTURE.md §16, §17). Version-neutral (stays at
 * /api/health, not /api/v1/health) since infra health checks shouldn't need
 * updating every time the API version bumps.
 *
 * /health/redis is intentionally not implemented yet — Redis is only
 * introduced when BullMQ/the job-queue module is built.
 */
@ApiExcludeController()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  ok() {
    return { status: 'ok' };
  }

  @Get('db')
  async db() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error' });
    }
  }
}
