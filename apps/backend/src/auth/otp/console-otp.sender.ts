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
    if (['production', 'staging'].includes(process.env.NODE_ENV ?? '')) {
      throw new ServiceUnavailableException('Console OTP disabled outside development');
    }
    this.logger.warn(
      `[STUB] OTP for ${phoneNumber}: ${otp} — no real notification provider configured`,
    );
    return Promise.resolve();
  }
}
