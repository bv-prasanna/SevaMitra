import 'reflect-metadata';

import { validateEnv } from './env.validation';

const base = {
  NODE_ENV: 'development',
  PORT: 3000,
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_ACCESS_SECRET: 'unit-test-only-access',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_SECRET: 'unit-test-only-refresh',
  JWT_REFRESH_TTL: '7d',
  JWT_RESET_SECRET: 'unit-test-only-reset',
  JWT_RESET_TTL: '10m',
  OTP_LENGTH: 6,
  OTP_TTL_SECONDS: 300,
  OTP_MAX_ATTEMPTS: 5,
  OTP_REQUEST_COOLDOWN_SECONDS: 60,
  NOTIFICATION_PROVIDER: 'console',
};

describe('validateEnv production safety', () => {
  const validProd = {
    ...base, NODE_ENV: 'production', OTP_PROVIDER: 'msg91',
    MSG91_AUTHKEY: 'test-authkey', MSG91_OTP_FLOW_ID: 'test-flow',
    NOTIFICATION_PROVIDER: 'live', CORS_ALLOWED_ORIGINS: 'https://app.example.com',
  };

  it('accepts a complete development configuration', () => {
    expect(validateEnv(base).NODE_ENV).toBe('development');
  });
  it('converts a numeric PORT string correctly', () => {
    expect(validateEnv({ ...base, PORT: '3100' }).PORT).toBe(3100);
  });
  it.each([0, 65536, -1])('rejects an invalid port %s', (port) => {
    expect(() => validateEnv({ ...base, PORT: port })).toThrow('Invalid environment configuration');
  });
  it('requires a database connection string', () => {
    expect(() => validateEnv({ ...base, DATABASE_URL: '' })).toThrow('Invalid environment configuration');
  });
  it('requires access and refresh JWT secrets', () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_SECRET: '' })).toThrow();
    expect(() => validateEnv({ ...base, JWT_REFRESH_SECRET: '' })).toThrow();
  });
  it('rejects unrecognized notification providers', () => {
    expect(() => validateEnv({ ...base, NOTIFICATION_PROVIDER: 'silent' })).toThrow();
  });
  it.each([3, 11])('rejects out-of-range OTP length %s', (length) => {
    expect(() => validateEnv({ ...base, OTP_LENGTH: length })).toThrow();
  });
  it('rejects non-digit fixed test codes', () => {
    expect(() => validateEnv({ ...base, OTP_FIXED_CODE: '111ABC' })).toThrow();
  });
  it('accepts a fully provisioned production environment', () => {
    expect(validateEnv(validProd).NODE_ENV).toBe('production');
  });
  it.each(['production', 'staging'])('rejects fixed OTP in %s', (env) => {
    expect(() => validateEnv({
      ...validProd, NODE_ENV: env, OTP_FIXED_CODE: '123456',
    })).toThrow('OTP_FIXED_CODE is forbidden');
  });
  it.each(['production', 'staging'])('requires real OTP provider in %s', (env) => {
    expect(() => validateEnv({ ...validProd, NODE_ENV: env, OTP_PROVIDER: 'console' }))
      .toThrow('A configured real OTP provider is mandatory');
  });
  it('rejects an unconfigured production OTP vendor', () => {
    expect(() => validateEnv({ ...validProd, MSG91_AUTHKEY: undefined }))
      .toThrow('A configured real OTP provider is mandatory');
    expect(() => validateEnv({ ...validProd, MSG91_OTP_FLOW_ID: undefined }))
      .toThrow('A configured real OTP provider is mandatory');
  });
  it('rejects wildcard CORS in production', () => {
    expect(() => validateEnv({...validProd,CORS_ALLOWED_ORIGINS:'*'})).toThrow();
  });
  it('rejects stub money movement gateways in production', () => {
    expect(() => validateEnv({...validProd, PAYMENT_PROVIDER:'stub'})).toThrow('Simulated payment');
    expect(() => validateEnv({...validProd, REFUND_PROVIDER:'stub'})).toThrow('Simulated payment');
    expect(() => validateEnv({...validProd, PAYOUT_PROVIDER:'stub'})).toThrow('Simulated payment');
  });
  it('rejects real-money gateway selection without webhook keys', () => {
    expect(() => validateEnv({...validProd,PAYMENT_PROVIDER:'razorpay'})).toThrow('Razorpay credentials');
  });
  it('accepts a production provider-first pilot with online payments disabled', () => {
    expect(validateEnv({...validProd,PAYMENT_PROVIDER:'disabled',REFUND_PROVIDER:'disabled',PAYOUT_PROVIDER:'disabled'}).NODE_ENV).toBe('production');
  });
  it('rejects a console notification provider in production', () => {
    expect(() => validateEnv({ ...validProd, NOTIFICATION_PROVIDER: 'console' }))
      .toThrow('Console notification delivery is forbidden');
  });
});
