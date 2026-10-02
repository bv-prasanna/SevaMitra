export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

/**
 * PaymentService only needs to open a payment order and verify a
 * completed one — actual Razorpay Orders API integration
 * (docs/ARCHITECTURE.md §12.1) doesn't exist yet. This interface is the
 * seam: swap StubPaymentGateway for a real Razorpay-backed implementation
 * (or a second gateway, per the BRD's config-first philosophy) without
 * touching PaymentService.
 */
export interface PaymentGateway {
  createOrder(
    amount: number,
    currency: string,
    receiptId: string,
  ): Promise<{ gatewayOrderId: string }>;

  verifyPayment(
    gatewayOrderId: string,
    gatewayPaymentId: string,
    gatewaySignature: string,
  ): boolean;
}
