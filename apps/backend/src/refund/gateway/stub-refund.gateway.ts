import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RefundGateway } from './refund-gateway.interface';

/**
 * Placeholder refund gateway — logs and fabricates a refund reference
 * instead of calling a real payment gateway's refund API. Selected until
 * that real integration (docs/ARCHITECTURE.md §12.1) exists. Never use in
 * staging or production. Always succeeds — there is no real refund to
 * fail.
 */
@Injectable()
export class StubRefundGateway implements RefundGateway {
  private readonly logger = new Logger(StubRefundGateway.name);

  initiateRefund(
    bookingId: string,
    amount: number,
    currency: string,
  ): Promise<{ refundReference: string }> {
    const refundReference = `stub_refund_${randomUUID()}`;
    this.logger.warn(
      `[STUB] Refunded ${amount} ${currency} for booking ${bookingId} (reference ${refundReference}) — no real refund gateway configured`,
    );
    return Promise.resolve({ refundReference });
  }
}
