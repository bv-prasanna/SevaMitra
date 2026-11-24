import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
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
    idempotencyKey: string,
  ): Promise<{ refundReference: string }> {
    this.assertAllowed();
    const refundReference = `stub_refund_${idempotencyKey.slice(0, 24)}`;
    this.logger.warn(
      `[STUB] Refunded ${amount} ${currency} for booking ${bookingId} (reference ${refundReference}, idempotency ${idempotencyKey}) — no real refund gateway configured`,
    );
    return Promise.resolve({ refundReference });
  }
  private assertAllowed():void{
    if(['staging','production'].includes(process.env.NODE_ENV??'')){
      throw new ServiceUnavailableException('Stub refund gateway cannot process real transactions');
    }
  }

}
