import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DocumentComplianceService } from './document-compliance.service';
import { ProviderComplianceCronController } from './provider-compliance-cron.controller';
import { PROVIDER_COMPLIANCE_CRON_MESSAGE, validProviderComplianceCronSignature } from './provider-compliance-cron-signature';

describe('provider compliance cron authorization', () => {
  const secret = '0123456789abcdef0123456789abcdef0123456789abcdef';
  const sign = (timestamp: string) =>
    createHmac('sha256', secret).update(PROVIDER_COMPLIANCE_CRON_MESSAGE + timestamp).digest('hex');
  let config: { get: jest.Mock };
  let processDue: jest.Mock;
  let controller: ProviderComplianceCronController;

  beforeEach(() => {
    config = { get: jest.fn().mockReturnValue(secret) };
    processDue = jest.fn().mockResolvedValue({
      examined: 0, expired: 0, suspendedOfferings: 0, remindersQueued: 0, skipped: 0,
    });
    controller = new ProviderComplianceCronController(
      config as unknown as ConfigService,
      { processDue } as unknown as DocumentComplianceService,
    );
  });

  it('accepts a current signed request and runs compliance processing', async () => {
    const timestamp = Date.now().toString();
    await expect(controller.processDue(timestamp, sign(timestamp))).resolves.toEqual({
      examined: 0, expired: 0, suspendedOfferings: 0, remindersQueued: 0, skipped: 0,
    });
    expect(processDue).toHaveBeenCalledTimes(1);
  });

  it('rejects forged signatures and stale timestamps', () => {
    const timestamp = Date.now().toString();
    expect(() => controller.processDue(timestamp, 'a'.repeat(64))).toThrow(UnauthorizedException);
    const stale = (Date.now() - 120_000).toString();
    expect(validProviderComplianceCronSignature(secret, stale, sign(stale))).toBe(false);
    expect(processDue).not.toHaveBeenCalled();
  });

  it('fails closed when the scheduler secret is not configured', () => {
    config.get.mockReturnValue(undefined);
    expect(() => controller.processDue()).toThrow(ServiceUnavailableException);
    expect(processDue).not.toHaveBeenCalled();
  });
});
