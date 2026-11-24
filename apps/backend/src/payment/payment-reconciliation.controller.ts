import {
  Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentService } from './payment.service';
import { RazorpayWebhookService } from './razorpay-webhook.service';

const PATH = '/api/v1/internal/payments/reconcile';
const PREFIX = 'SevaMitra.PaymentReconciliation.v1\nPOST\n' + PATH + '\n';

@ApiTags('Payment operations')
@Controller({ path: 'internal/payments', version: '1' })
export class PaymentReconciliationController {
  constructor(
    private readonly config: ConfigService,
    private readonly paymentService: PaymentService,
    private readonly webhookService: RazorpayWebhookService,
  ) {}

  @Post('reconcile')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async reconcile(
    @Headers('x-sevamitra-cron-timestamp') timestamp?: string,
    @Headers('x-sevamitra-cron-signature') signature?: string,
  ) {
    this.verifyCronSignature(timestamp, signature);
    const webhooks = await this.webhookService.retryDueEvents();
    const payments = await this.paymentService.reconcilePendingOnlinePayments();
    return { ok: true, webhooks, payments };
  }

  private verifyCronSignature(timestamp?: string, signature?: string): void {
    const secret = this.config.get<string>('PAYMENT_RECONCILIATION_CRON_SECRET');
    if (!secret || secret.length < 32) {
      throw new ServiceUnavailableException('Payment reconciliation scheduler is not configured');
    }
    if (!timestamp || !/^\d{13}$/.test(timestamp) ||
        Math.abs(Date.now() - Number(timestamp)) > 5 * 60_000 ||
        !signature || !/^[a-f0-9]{64}$/i.test(signature)) {
      throw new UnauthorizedException('Invalid payment reconciliation signature');
    }
    const expected = createHmac('sha256', secret).update(PREFIX + timestamp).digest();
    const supplied = Buffer.from(signature, 'hex');
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) {
      throw new UnauthorizedException('Invalid payment reconciliation signature');
    }
  }
}
