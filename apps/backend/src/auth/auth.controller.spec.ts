
import { AuthController } from './auth.controller';
import type { AuthService } from './auth.service';
import type { Request } from 'express';

describe('AuthController transport contracts', () => {
  const service = {
    requestOtp: jest.fn(), verifyOtp: jest.fn(), loginWithPassword: jest.fn(),
    refresh: jest.fn(), logout: jest.fn(), setPassword: jest.fn(), resetPassword: jest.fn(),
    loginWithGoogle: jest.fn(), loginWithApple: jest.fn(),
  };
  const controller = new AuthController(service as unknown as AuthService);
  const user = { id: 'user-1', phoneNumber: '+919876543210', email: 'user@example.org' };
  const request = { ip: '127.0.0.1' } as Request;
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('passes registration and login OTP purpose intact to the auth service', async () => {
    const dto = { phoneNumber: '+919876543210', purpose: 'LOGIN' } as Parameters<AuthController['requestOtp']>[0];
    service.requestOtp.mockResolvedValue({ expiresInSeconds: 300 });
    await expect(controller.requestOtp(dto)).resolves.toEqual({ expiresInSeconds: 300 });
    expect(service.requestOtp).toHaveBeenCalledWith(dto);
  });
  it('passes the client IP to OTP verification', async () => {
    const dto = { phoneNumber: user.phoneNumber, otp: '123456', purpose: 'LOGIN' } as Parameters<AuthController['verifyOtp']>[0];
    service.verifyOtp.mockResolvedValue({ accessToken: 'signed' });
    await controller.verifyOtp(dto, request);
    expect(service.verifyOtp).toHaveBeenCalledWith(dto, '127.0.0.1');
  });
  it('passes client IP to password login', async () => {
    const dto = { identifier: user.phoneNumber, password: 'secret' } as unknown as Parameters<AuthController['login']>[0];
    await controller.login(dto, request);
    expect(service.loginWithPassword).toHaveBeenCalledWith(dto, '127.0.0.1');
  });
  it('passes refresh token and IP but not unrelated request fields', async () => {
    await controller.refresh({ refreshToken: 'refresh-1' }, request);
    expect(service.refresh).toHaveBeenCalledWith('refresh-1', '127.0.0.1',undefined);
  });
  it('revokes the specific refresh token during logout', async () => {
    await controller.logout({ refreshToken: 'refresh-1' });
    expect(service.logout).toHaveBeenCalledWith('refresh-1');
  });
  it('uses JWT identity rather than a caller-provided user ID for password changes', async () => {
    const dto = { newPassword: 'new-secret' } as unknown as Parameters<AuthController['setPassword']>[1];
    await controller.setPassword(user, dto);
    expect(service.setPassword).toHaveBeenCalledWith('user-1', dto);
  });
  it('forwards short-lived reset token DTO without identity substitution', async () => {
    const dto = { resetToken: 'reset-1', newPassword: 'new-secret' } as unknown as Parameters<AuthController['resetPassword']>[0];
    await controller.resetPassword(dto);
    expect(service.resetPassword).toHaveBeenCalledWith(dto);
  });
  it.each([
    ['loginWithGoogle', 'loginWithGoogle'], ['loginWithApple', 'loginWithApple'],
  ] as const)('%s forwards the token and client IP to its specific auth method', async (handler, method) => {
    const dto = { idToken: 'signed-id-token' };
    await controller[handler](dto, request);
    expect(service[method]).toHaveBeenCalledWith('signed-id-token', '127.0.0.1');
  });
  it('returns exactly the trusted JWT user in /auth/me', () => {
    expect(controller.me(user)).toBe(user);
  });
  it('does not intercept a failed login or mask the failure', async () => {
    const error = new Error('Authentication failed');
    service.loginWithPassword.mockRejectedValue(error);
    const dto = { identifier: user.phoneNumber, password: 'wrong' } as unknown as Parameters<AuthController['login']>[0];
    await expect(controller.login(dto, request)).rejects.toBe(error);
  });
});
