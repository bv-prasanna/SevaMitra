
import { ServiceUnavailableException } from '@nestjs/common';
import { Msg91OtpSender } from './msg91-otp.sender';
import type { ConfigService } from '@nestjs/config';

describe('Msg91OtpSender remote delivery checks', () => {
  const values: Record<string, string> = {
    MSG91_AUTHKEY: 'unit-test-key', MSG91_OTP_FLOW_ID: 'test-dlt-flow',
  };
  const config = { get: (key: string) => values[key] };
  const service = new Msg91OtpSender(config as unknown as ConfigService);
  afterEach(() => jest.restoreAllMocks());

  it('sends the OTP in the configured template, not a log message', async () => {
    const api = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ type: 'success' }),
    } as Response);
    await expect(service.sendOtp('+919876543210', '012345')).resolves.toBeUndefined();
    expect(api).toHaveBeenCalledWith(
      'https://api.msg91.com/api/v5/flow/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authkey: values.MSG91_AUTHKEY }),
        body: expect.stringContaining('"OTP":"012345"'),
      }),
    );
    expect(JSON.parse((api.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      flow_id: 'test-dlt-flow', recipients: [{ mobiles: '919876543210', OTP: '012345' }],
    });
  });

  it('rejects unconfigured authkey or flow ID', async () => {
    const bad = new Msg91OtpSender({ get: () => undefined } as unknown as ConfigService);
    await expect(bad.sendOtp('+919876543210', '123456')).rejects.toThrow(ServiceUnavailableException);
  });

  it.each(['123', '+10000000000', 'abcd'])('rejects invalid Indian destination %s', async (destination) => {
    await expect(service.sendOtp(destination, '123456')).rejects.toThrow('Invalid SMS destination');
  });

  it('rejects an HTTP error without claiming an OTP was sent', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false, status: 401,
    } as Response);
    await expect(service.sendOtp('+919876543210', '123456')).rejects.toThrow('rejected OTP');
  });

  it('rejects a vendor-declared error even with HTTP 200', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => ({ type: 'error' }),
    } as Response);
    await expect(service.sendOtp('+919876543210', '123456')).rejects.toThrow('failed OTP delivery');
  });

  it('fails closed on network timeouts or connectivity errors', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    await expect(service.sendOtp('+919876543210', '123456')).rejects.toThrow('SMS provider unavailable');
  });

  it('does not fail on non-JSON vendor success response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, json: async () => { throw new SyntaxError('unexpected'); },
    } as unknown as Response);
    await expect(service.sendOtp('+919876543210', '123456')).resolves.toBeUndefined();
  });
});
