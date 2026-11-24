import { ServiceUnavailableException } from '@nestjs/common';

export const PAYOUT_GATEWAY = Symbol('PAYOUT_GATEWAY');

export class PayoutNotConfiguredException extends ServiceUnavailableException {
  constructor() {
    super('Provider payouts are disabled until settlement onboarding and finance review');
  }
}

/**
 * SettlementService only needs to initiate one payout per settlement run
 * — actual Razorpay Route / RazorpayX Payouts integration
 * (docs/ARCHITECTURE.md §12.1) doesn't exist yet. This interface is the
 * seam: swap StubPayoutGateway for a real implementation without touching
 * SettlementService, the same pattern already used for OTP delivery,
 * customer payments, and notifications.
 */
export interface PayoutGateway {
  initiatePayout(
    providerId: string,
    amount: number,
    currency: string,
    idempotencyKey: string,
  ): Promise<{ payoutReference: string }>;
}
