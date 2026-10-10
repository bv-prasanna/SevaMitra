import { plainToInstance } from 'class-transformer';
import { allowedBrowserOrigins } from './cors-origins';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'test', 'staging', 'production'])
  NODE_ENV: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TTL: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TTL: string;

  @IsString()
  @IsNotEmpty()
  JWT_RESET_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_RESET_TTL: string;

  @IsInt()
  @Min(4)
  @Max(10)
  OTP_LENGTH: number;

  @IsInt()
  @Min(30)
  OTP_TTL_SECONDS: number;

  @IsInt()
  @Min(1)
  OTP_MAX_ATTEMPTS: number;

  @IsInt()
  @Min(0)
  OTP_REQUEST_COOLDOWN_SECONDS: number;

  /**
   * Local testing only: every OTP becomes this code instead of a random one.
   * Ignored unless NOTIFICATION_PROVIDER=console — see OtpService.
   */
  @IsOptional()
  @Matches(/^\d+$/, { message: 'OTP_FIXED_CODE must contain only digits' })
  OTP_FIXED_CODE?: string;

  @IsOptional()
  @IsString()
  GOOGLE_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  APPLE_CLIENT_ID?: string;

  @IsIn(['console','live'])
  NOTIFICATION_PROVIDER: string;

  @IsOptional()
  @IsIn(['console','msg91'])
  OTP_PROVIDER?: string;

  @IsOptional() @IsString() MSG91_AUTHKEY?: string;
  @IsOptional() @IsString() MSG91_OTP_FLOW_ID?: string;

  @IsOptional() @IsString() CORS_ALLOWED_ORIGINS?: string;
  @IsOptional() @IsString() ENABLE_API_DOCS?: string;
  /** Private high-entropy key shared with the scheduled notification worker. */
  @IsOptional() @IsString() NOTIFICATION_CRON_SECRET?: string;

  @IsOptional() @IsIn(['stub','disabled','razorpay'])
  PAYMENT_PROVIDER?: string;
  @IsOptional() @IsIn(['stub','disabled'])
  REFUND_PROVIDER?: string;
  @IsOptional() @IsIn(['stub','disabled'])
  PAYOUT_PROVIDER?: string;

  @IsOptional() @IsString() RAZORPAY_KEY_ID?: string;
  @IsOptional() @IsString() RAZORPAY_KEY_SECRET?: string;
  @IsOptional() @IsString() RAZORPAY_WEBHOOK_SECRET?: string;
}

/** Fails fast on startup if required config is missing/malformed. */
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  allowedBrowserOrigins(validated.CORS_ALLOWED_ORIGINS, validated.NODE_ENV);
  if (['staging', 'production'].includes(validated.NODE_ENV)) {
    if (validated.PAYMENT_PROVIDER === 'stub' ||
        validated.REFUND_PROVIDER === 'stub' ||
        validated.PAYOUT_PROVIDER === 'stub') {
      throw new Error('Simulated payment/refund/payout providers are forbidden outside development');
    }
    if (validated.PAYMENT_PROVIDER === 'razorpay' &&
        (!validated.RAZORPAY_KEY_ID || !validated.RAZORPAY_KEY_SECRET ||
         !validated.RAZORPAY_WEBHOOK_SECRET)) {
      throw new Error('Razorpay credentials and webhook secret are required');
    }
    if (validated.OTP_FIXED_CODE) throw new Error('OTP_FIXED_CODE is forbidden in staging/production');
    if (validated.OTP_PROVIDER !== 'msg91' || !validated.MSG91_AUTHKEY || !validated.MSG91_OTP_FLOW_ID) {
      throw new Error('A configured real OTP provider is mandatory in staging/production');
    }
    if (validated.NOTIFICATION_PROVIDER !== 'live') {
      throw new Error('Console notification delivery is forbidden in staging/production');
    }
  }
  return validated;
}
