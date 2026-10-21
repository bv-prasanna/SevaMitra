import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { OtpSender } from './otp-sender.interface';

/**
 * Placeholder OTP delivery — logs instead of sending a real SMS/WhatsApp
 * message. Selected when NOTIFICATION_PROVIDER=console (the default until
 * the Notification module + MSG91 integration exist). Never use in staging
 * or production.
 */
@Injectable()
export class ConsoleOtpSender implements OtpSender {
  private readonly logger = new Logger(ConsoleOtpSender.name);

  sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const restrictedDemo = process.env.NODE_ENV === 'staging' &&
      process.env.PILOT_DISABLE_COLLECTIONS === 'true' &&
      process.env.OTP_PROVIDER === 'console' &&
      process.env.NOTIFICATION_PROVIDER === 'console' &&
      !!process.env.OTP_FIXED_CODE &&
      (process.env.DEMO_OTP_ALLOWED_PHONES ?? '').split(',').includes(phoneNumber);
    if (['production', 'staging'].includes(process.env.NODE_ENV ?? '') && !restrictedDemo) {
      throw new ServiceUnavailableException('Console OTP disabled outside development');
    }
    // A fixed code must never appear in shared staging logs.
    if (!restrictedDemo) this.logger.warn('[STUB] Development OTP sent to console (redacted)');
    return Promise.resolve();
  }
}
