import {
  Controller,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IncidentService } from './incident.service';
import { validIncidentSlaCronSignature } from './incident-sla-cron-signature';

/** HMAC-only scheduler route; repeated invocations are safe at the database boundary. */
@ApiExcludeController()
@Controller({ path: 'internal/incidents/sla', version: '1' })
export class IncidentSlaCronController {
  constructor(
    private readonly config: ConfigService,
    private readonly incidents: IncidentService,
  ) {}

  @Post('process-due')
  @HttpCode(200)
  processDue(
    @Headers('x-sevamitra-cron-timestamp') timestamp?: string,
    @Headers('x-sevamitra-cron-signature') signature?: string,
  ) {
    const secret = this.config.get<string>('NOTIFICATION_CRON_SECRET');
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException('Incident SLA scheduler is not configured');
    }
    if (!validIncidentSlaCronSignature(secret, timestamp, signature)) {
      throw new UnauthorizedException('Invalid incident SLA scheduler authorization');
    }
    return this.incidents.processDueEscalations();
  }
}
