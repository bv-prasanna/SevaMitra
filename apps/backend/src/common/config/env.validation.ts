import { plainToInstance } from 'class-transformer';
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

  @IsString()
  @IsNotEmpty()
  NOTIFICATION_PROVIDER: string;
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

  return validated;
}
