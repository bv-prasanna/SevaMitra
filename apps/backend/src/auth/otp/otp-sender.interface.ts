export const OTP_SENDER = Symbol('OTP_SENDER');

/**
 * Auth only needs to hand an OTP off for delivery — actual SMS/WhatsApp
 * dispatch belongs to the Notification module (docs/ARCHITECTURE.md §12.2),
 * which doesn't exist yet. This interface is the seam: swap
 * ConsoleOtpSender for a real NotificationModule-backed implementation
 * (default vendor: MSG91, per docs/ARCHITECTURE.md §21) without touching
 * AuthService.
 */
export interface OtpSender {
  sendOtp(phoneNumber: string, otp: string): Promise<void>;
}
