import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PayoutGateway } from './payout-gateway.interface';

/**
 * Placeholder payout gateway — logs and fabricates a payout reference
 * instead of calling Razorpay Route / RazorpayX Payouts. Selected until
 * that real integration (docs/ARCHITECTURE.md §12.1) exists. Never use in
 * staging or production. Always succeeds — there is no real payout to
 * fail.
 */
@Injectable()
export class StubPayoutGateway implements PayoutGateway {
  private readonly logger = new Logger(StubPayoutGateway.name);

  initiatePayout(
    providerId: string,
    amount: number,
    currency: string,
  ): Promise<{ payoutReference: string }> {
    const payoutReference = `stub_payout_${randomUUID()}`;
    this.logger.warn(
      `[STUB] Paid out ${amount} ${currency} to provider ${providerId} (reference ${payoutReference}) — no real payout gateway configured`,
    );
    return Promise.resolve({ payoutReference });
  }
}
