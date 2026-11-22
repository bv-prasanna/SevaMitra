export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

/**
 * PaymentService opens an order and verifies a captured payment. The
 * Razorpay Orders API adapter is selected only through backend config;
 * credentials never leave the server. Keep this contract gateway-neutral.
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
    expectedAmount?: number,
    expectedCurrency?: string,
  ): boolean | Promise<boolean>;
}
