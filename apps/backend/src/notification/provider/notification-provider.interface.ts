export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

/**
 * NotificationService only needs to dispatch a message per channel —
 * actual MSG91 (default vendor, docs/ARCHITECTURE.md §12.2/§21) or push/
 * email vendor integration doesn't exist yet. This interface is the seam:
 * swap ConsoleNotificationProvider for a real vendor-backed implementation
 * without touching NotificationService, the same pattern already used for
 * OTP delivery (OtpSender) and payments (PaymentGateway).
 */
export interface NotificationProvider {
  sendSms(to: string, message: string): Promise<void>;
  sendWhatsApp(to: string, message: string): Promise<void>;
  sendPush(userId: string, title: string, body: string): Promise<void>;
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}
