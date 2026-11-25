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
import { DocumentComplianceService } from './document-compliance.service';
import { validProviderComplianceCronSignature } from './provider-compliance-cron-signature';

@ApiExcludeController()
@Controller({ path: 'internal/provider-compliance', version: '1' })
export class ProviderComplianceCronController {
  constructor(
    private readonly config: ConfigService,
    private readonly compliance: DocumentComplianceService,
  ) {}

  @Post('process-due')
  @HttpCode(200)
  processDue(
    @Headers('x-sevamitra-cron-timestamp') timestamp?: string,
    @Headers('x-sevamitra-cron-signature') signature?: string,
  ) {
    const secret = this.config.get<string>('NOTIFICATION_CRON_SECRET');
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException('Provider compliance scheduler is not configured');
    }
    if (!validProviderComplianceCronSignature(secret, timestamp, signature)) {
      throw new UnauthorizedException('Invalid provider compliance scheduler authorization');
    }
    return this.compliance.processDue();
  }
}
