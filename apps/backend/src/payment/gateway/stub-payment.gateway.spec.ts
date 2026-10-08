
import { ServiceUnavailableException } from '@nestjs/common';
import { StubPaymentGateway } from './stub-payment.gateway';
import { StubRefundGateway } from '../../refund/gateway/stub-refund.gateway';
import { StubPayoutGateway } from '../../settlement/gateway/stub-payout.gateway';

describe('Simulated money gateways cannot run in staging or production', () => {
  const original = process.env.NODE_ENV;
  const gateways = {
    payment: new StubPaymentGateway(),
    refund: new StubRefundGateway(),
    payout: new StubPayoutGateway(),
  };
  beforeAll(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => { process.env.NODE_ENV = original; });
  afterAll(() => jest.restoreAllMocks());

  it.each(['production','staging'])('rejects all stub transaction types in %s', (env) => {
    process.env.NODE_ENV = env;
    expect(() => gateways.payment.verifyPayment('order','payment','anything')).toThrow(ServiceUnavailableException);
    expect(() => gateways.payment.createOrder(999,'INR','receipt')).toThrow(ServiceUnavailableException);
    expect(() => gateways.refund.initiateRefund('booking',999,'INR')).toThrow(ServiceUnavailableException);
    expect(() => gateways.payout.initiatePayout('provider',999,'INR')).toThrow(ServiceUnavailableException);
  });

  it('never produces real payment reference in development', async () => {
    process.env.NODE_ENV = 'test';
    const order = await gateways.payment.createOrder(200,'INR','receipt');
    expect(order.gatewayOrderId).toMatch(/^stub_order_[0-9a-f-]+$/);
    expect(gateways.payment.verifyPayment('stub','stub','signature')).toBe(true);
  });

  it('marks refunded transactions as simulated in local mode', async () => {
    process.env.NODE_ENV='test';
    await expect(gateways.refund.initiateRefund('booking',100,'INR')).resolves.toEqual({
      refundReference: expect.stringMatching(/^stub_refund_/),
    });
  });

  it('marks payout transactions as simulated in local mode', async () => {
    process.env.NODE_ENV='test';
    await expect(gateways.payout.initiatePayout('provider',100,'INR')).resolves.toEqual({
      payoutReference: expect.stringMatching(/^stub_payout_/),
    });
  });
});
