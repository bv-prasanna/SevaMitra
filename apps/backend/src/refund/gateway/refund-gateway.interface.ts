export const REFUND_GATEWAY = Symbol('REFUND_GATEWAY');

/**
 * RefundService only needs to initiate one refund per booking — actual
 * Razorpay refund API integration (docs/ARCHITECTURE.md §12.1) doesn't
 * exist yet. This interface is the seam: swap StubRefundGateway for a
 * real implementation without touching RefundService, the same pattern
 * already used for OTP delivery, customer payments, provider payouts, and
 * notifications.
 */
export interface RefundGateway {
  initiateRefund(
    bookingId: string,
    amount: number,
    currency: string,
  ): Promise<{ refundReference: string }>;
}
