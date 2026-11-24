import { RazorpayWebhookController } from './razorpay-webhook.controller';
import type { RazorpayWebhookService } from './razorpay-webhook.service';

describe('RazorpayWebhookController', () => {
  it('passes the untouched request bytes and gateway headers to verification', async () => {
    const service = { receive: jest.fn().mockResolvedValue({
      accepted: true, duplicate: false, status: 'PROCESSED',
    }) };
    const controller = new RazorpayWebhookController(service as unknown as RazorpayWebhookService);
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    const request = { rawBody } as never;

    await controller.receive(request, 'a'.repeat(64), 'evt_12345678');

    expect(service.receive).toHaveBeenCalledWith(rawBody, 'a'.repeat(64), 'evt_12345678');
  });
});
