import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { NotificationCronController } from './notification-cron.controller';
import { NotificationService } from './notification.service';
import { NOTIFICATION_CRON_MESSAGE, validNotificationCronSignature } from './cron-signature';

describe('private notification cron authorization', () => {
  const secret = '0123456789abcdef0123456789abcdef0123456789abcdef';
  const sign = (stamp: string) =>
    createHmac('sha256', secret).update(NOTIFICATION_CRON_MESSAGE + stamp).digest('hex');
  let run: jest.Mock;
  let config: {get: jest.Mock};
  let controller: NotificationCronController;

  beforeEach(() => {
    run = jest.fn().mockResolvedValue({examined: 0, sent: 0, dead: 0});
    config = {get: jest.fn().mockReturnValue(secret)};
    controller = new NotificationCronController(
      config as unknown as ConfigService,
      {retryDue: run} as unknown as NotificationService,
    );
  });

  it('accepts a current HMAC and invokes the leased retry worker', async () => {
    const stamp = Date.now().toString();
    await expect(controller.retryDue(stamp, sign(stamp))).resolves.toEqual({examined: 0, sent: 0, dead: 0});
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('rejects forged credentials without processing work', () => {
    const stamp = Date.now().toString();
    expect(() => controller.retryDue(stamp, 'a'.repeat(64))).toThrow(UnauthorizedException);
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects old replay and future clock drift', () => {
    const old = (Date.now() - 120_000).toString();
    const future = (Date.now() + 120_000).toString();
    expect(validNotificationCronSignature(secret, old, sign(old))).toBe(false);
    expect(validNotificationCronSignature(secret, future, sign(future))).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects malformed timestamps, wrong signature lengths and short secrets', () => {
    expect(validNotificationCronSignature(secret, 'not-a-time', 'a'.repeat(64))).toBe(false);
    expect(validNotificationCronSignature(secret, Date.now().toString(), 'f')).toBe(false);
    expect(validNotificationCronSignature('short', Date.now().toString(), 'a'.repeat(64))).toBe(false);
  });

  it('fails closed if the private secret is not configured', () => {
    config.get.mockReturnValue(undefined);
    expect(() => controller.retryDue()).toThrow(ServiceUnavailableException);
    expect(run).not.toHaveBeenCalled();
  });
});
