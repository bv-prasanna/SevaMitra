import { createHmac } from 'node:crypto';
import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { PaymentReconciliationController } from './payment-reconciliation.controller';
import type { ConfigService } from '@nestjs/config';
import type { PaymentService } from './payment.service';
import type { RazorpayWebhookService } from './razorpay-webhook.service';

describe('PaymentReconciliationController', () => {
  const secret = 'a-strong-cron-secret-with-more-than-32-chars';
  const timestamp = Date.now().toString();
  const path = '/api/v1/internal/payments/reconcile';
  const signature = createHmac('sha256', secret)
    .update('SevaMitra.PaymentReconciliation.v1\nPOST\n' + path + '\n' + timestamp)
    .digest('hex');
  let config: { get: jest.Mock };
  let payments: { reconcilePendingOnlinePayments: jest.Mock };
  let webhooks: { retryDueEvents: jest.Mock };
  let controller: PaymentReconciliationController;

  beforeEach(() => {
    config = { get: jest.fn().mockReturnValue(secret) };
    payments = { reconcilePendingOnlinePayments: jest.fn().mockResolvedValue({
      checked: 1, captured: 1, stillPending: 0, manualReview: 0, errors: 0,
    }) };
    webhooks = { retryDueEvents: jest.fn().mockResolvedValue({
      checked: 2, processed: 1, retryable: 1, dead: 0,
    }) };
    controller = new PaymentReconciliationController(
      config as unknown as ConfigService,
      payments as unknown as PaymentService,
      webhooks as unknown as RazorpayWebhookService,
    );
  });

  it('runs due webhook retries and pending order reconciliation with a valid HMAC', async () => {
    await expect(controller.reconcile(timestamp, signature)).resolves.toEqual({
      ok: true,
      webhooks: { checked: 2, processed: 1, retryable: 1, dead: 0 },
      payments: { checked: 1, captured: 1, stillPending: 0, manualReview: 0, errors: 0 },
    });
    expect(webhooks.retryDueEvents).toHaveBeenCalledTimes(1);
    expect(payments.reconcilePendingOnlinePayments).toHaveBeenCalledTimes(1);
  });

  it('rejects forged or stale scheduler requests', async () => {
    await expect(controller.reconcile(timestamp, '0'.repeat(64)))
      .rejects.toThrow(UnauthorizedException);
    const stale = (Date.now() - 6 * 60_000).toString();
    await expect(controller.reconcile(stale, signature))
      .rejects.toThrow(UnauthorizedException);
    expect(webhooks.retryDueEvents).not.toHaveBeenCalled();
  });

  it('fails closed when the cron secret is not provisioned', async () => {
    config.get.mockReturnValue(undefined);
    await expect(controller.reconcile(timestamp, signature))
      .rejects.toThrow(ServiceUnavailableException);
  });
});
