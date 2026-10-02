import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider } from './notification-provider.interface';

/**
 * Placeholder notification delivery — logs instead of calling a real SMS/
 * WhatsApp/push/email vendor. Selected until the Notification module's
 * MSG91 integration (docs/ARCHITECTURE.md §12.2) exists. Never use in
 * staging or production.
 */
@Injectable()
export class ConsoleNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(ConsoleNotificationProvider.name);

  sendSms(to: string, message: string): Promise<void> {
    this.logger.warn(
      `[STUB] SMS to ${to}: ${message} — no real notification provider configured`,
    );
    return Promise.resolve();
  }

  sendWhatsApp(to: string, message: string): Promise<void> {
    this.logger.warn(
      `[STUB] WhatsApp to ${to}: ${message} — no real notification provider configured`,
    );
    return Promise.resolve();
  }

  sendPush(userId: string, title: string, body: string): Promise<void> {
    this.logger.warn(
      `[STUB] Push to user ${userId}: "${title}" — ${body} — no real notification provider configured`,
    );
    return Promise.resolve();
  }

  sendEmail(to: string, subject: string, body: string): Promise<void> {
    this.logger.warn(
      `[STUB] Email to ${to}: "${subject}" — ${body} — no real notification provider configured`,
    );
    return Promise.resolve();
  }
}
