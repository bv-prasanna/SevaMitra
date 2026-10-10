import {
  Controller, Headers, HttpCode, Post, ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { validNotificationCronSignature } from './cron-signature';

/**
 * Machine-to-machine scheduler endpoint; NO user JWT or admin token.
 * The request is HMAC-signed with a dedicated key and a 90-second clock window.
 * Retries are claimed via DB leases, so duplicate cron invocations are safe.
 */
@ApiExcludeController()
@Controller({ path: 'internal/notifications', version: '1' })
export class NotificationCronController {
  constructor(
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('retry-due')
  @HttpCode(200)
  retryDue(
    @Headers('x-sevamitra-cron-timestamp') timestamp?: string,
    @Headers('x-sevamitra-cron-signature') signature?: string,
  ) {
    const secret = this.config.get<string>('NOTIFICATION_CRON_SECRET');
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException('Notification scheduler is not configured');
    }
    if (!validNotificationCronSignature(secret, timestamp, signature)) {
      throw new UnauthorizedException('Invalid notification scheduler authorization');
    }
    return this.notificationService.retryDue();
  }
}
