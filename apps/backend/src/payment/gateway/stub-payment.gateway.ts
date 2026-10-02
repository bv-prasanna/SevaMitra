import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentGateway } from './payment-gateway.interface';

/**
 * Placeholder payment gateway — logs and fabricates identifiers instead
 * of calling Razorpay. Selected until the real Razorpay Orders API
 * integration (docs/ARCHITECTURE.md §12.1) exists. Never use in staging
 * or production. `verifyPayment` accepts anything — there is no real
 * signature to check — so this must never be wired up where money
 * actually needs to move.
 */
@Injectable()
export class StubPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(StubPaymentGateway.name);

  createOrder(
    amount: number,
    currency: string,
    receiptId: string,
  ): Promise<{ gatewayOrderId: string }> {
    const gatewayOrderId = `stub_order_${randomUUID()}`;
    this.logger.warn(
      `[STUB] Created order ${gatewayOrderId} for ${amount} ${currency} (receipt ${receiptId}) — no real payment gateway configured`,
    );
    return Promise.resolve({ gatewayOrderId });
  }

  verifyPayment(
    gatewayOrderId: string,
    gatewayPaymentId: string,
    gatewaySignature: string,
  ): boolean {
    this.logger.warn(
      `[STUB] Verifying payment ${gatewayPaymentId} for order ${gatewayOrderId} (signature ${gatewaySignature}) — no real payment gateway configured, always succeeds`,
    );
    return true;
  }
}
