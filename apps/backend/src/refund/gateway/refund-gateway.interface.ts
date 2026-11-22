export const REFUND_GATEWAY = Symbol('REFUND_GATEWAY');

/**
 * RefundService initiates one refund per booking. Razorpay normal refunds
 * use a stable refund-row UUID as their idempotency key; final success is
 * confirmed by a signed webhook, not merely by the initial HTTP response.
 */
export interface RefundGateway {
  initiateRefund(
    bookingId: string,
    amount: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<{ refundReference: string; status?: 'PENDING'|'REFUNDED'|'FAILED' }>;
}
