import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { IncidentSlaCronController } from './incident-sla-cron.controller';
import { IncidentService } from './incident.service';
import { INCIDENT_SLA_CRON_MESSAGE, validIncidentSlaCronSignature } from './incident-sla-cron-signature';

describe('private incident SLA cron authorization', () => {
  const secret = '0123456789abcdef0123456789abcdef0123456789abcdef';
  const sign = (stamp: string) =>
    createHmac('sha256', secret).update(INCIDENT_SLA_CRON_MESSAGE + stamp).digest('hex');
  let run: jest.Mock;
  let config: { get: jest.Mock };
  let controller: IncidentSlaCronController;

  beforeEach(() => {
    run = jest.fn().mockResolvedValue({ examined: 0, escalated: 0, breached: 0, skipped: 0 });
    config = { get: jest.fn().mockReturnValue(secret) };
    controller = new IncidentSlaCronController(
      config as unknown as ConfigService,
      { processDueEscalations: run } as unknown as IncidentService,
    );
  });

  it('accepts a current HMAC and invokes the idempotent scheduler', async () => {
    const stamp = Date.now().toString();
    await expect(controller.processDue(stamp, sign(stamp))).resolves.toEqual({
      examined: 0, escalated: 0, breached: 0, skipped: 0,
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('rejects forged credentials without processing work', () => {
    const stamp = Date.now().toString();
    expect(() => controller.processDue(stamp, 'a'.repeat(64))).toThrow(UnauthorizedException);
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects stale timestamps and malformed signatures', () => {
    const old = (Date.now() - 120_000).toString();
    expect(validIncidentSlaCronSignature(secret, old, sign(old))).toBe(false);
    expect(validIncidentSlaCronSignature(secret, 'not-a-time', 'a'.repeat(64))).toBe(false);
    expect(validIncidentSlaCronSignature('short', Date.now().toString(), 'a'.repeat(64))).toBe(false);
  });

  it('fails closed when the cron secret is absent', () => {
    config.get.mockReturnValue(undefined);
    expect(() => controller.processDue()).toThrow(ServiceUnavailableException);
    expect(run).not.toHaveBeenCalled();
  });
});
