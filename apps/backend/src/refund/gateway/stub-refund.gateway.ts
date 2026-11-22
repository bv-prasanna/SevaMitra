import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RefundGateway } from './refund-gateway.interface';

/**
 * Development-only fake refund gateway. Never use in staging or production.
 * It deliberately simulates immediate completion and must not be used to
 * validate Razorpay webhook, reconciliation or real-money behavior.
 */
@Injectable()
export class StubRefundGateway implements RefundGateway {
  private readonly logger = new Logger(StubRefundGateway.name);

  initiateRefund(
    bookingId: string,
    amount: number,
    currency: string,
    _idempotencyKey?: string,
  ): Promise<{ refundReference: string }> {
    this.assertAllowed();
    const refundReference = `stub_refund_${randomUUID()}`;
    this.logger.warn(
      `[STUB] Refunded ${amount} ${currency} for booking ${bookingId} (reference ${refundReference}) — no real refund gateway configured`,
    );
    return Promise.resolve({ refundReference });
  }
  private assertAllowed():void{
    if(['staging','production'].includes(process.env.NODE_ENV??'')){
      throw new ServiceUnavailableException('Stub refund gateway cannot process real transactions');
    }
  }

}
