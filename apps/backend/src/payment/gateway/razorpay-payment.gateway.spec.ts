import {createHmac} from 'node:crypto';
import {BadRequestException,ServiceUnavailableException} from '@nestjs/common';
import type {ConfigService} from '@nestjs/config';
import {RazorpayPaymentGateway} from './razorpay-payment.gateway';
import {DisabledPaymentGateway} from './disabled-payment.gateway';
import {DisabledRefundGateway} from '../../refund/gateway/disabled-refund.gateway';
import {DisabledPayoutGateway} from '../../settlement/gateway/disabled-payout.gateway';

describe('RazorpayPaymentGateway: server-side payment confirmation',()=>{
 const cfg={get:(key:string)=>({RAZORPAY_KEY_ID:'rzp_test_key',RAZORPAY_KEY_SECRET:'secret_test_key'} as Record<string,string>)[key]};
 const gateway=new RazorpayPaymentGateway(cfg as unknown as ConfigService);
 afterEach(()=>jest.restoreAllMocks());
 it('creates an INR order in exact integer paise',async()=>{
  const response=jest.spyOn(global,'fetch').mockResolvedValue({
   ok:true,json:async()=>({id:'order_1234',amount:1999,currency:'INR'})
  } as Response);
  await expect(gateway.createOrder(19.99,'INR','booking-id')).resolves.toEqual({gatewayOrderId:'order_1234'});
  const body=JSON.parse((response.mock.calls[0][1] as RequestInit).body as string);
  expect(body).toEqual(expect.objectContaining({amount:1999,currency:'INR',receipt:'booking-id'}));
  expect(response.mock.calls[0][0]).toBe('https://api.razorpay.com/v1/orders');
 });
 it.each([0,-1,1.999,Number.POSITIVE_INFINITY,NaN])('rejects malformed amounts %s',async(amount)=>{
  await expect(gateway.createOrder(amount,'INR','booking')).rejects.toThrow(BadRequestException);
 });
 it('rejects non-INR order requests',async()=>{
  await expect(gateway.createOrder(19,'USD','booking')).rejects.toThrow(BadRequestException);
 });
 it('fails closed when order response amount differs',async()=>{
  jest.spyOn(global,'fetch').mockResolvedValue({ok:true,json:async()=>({id:'order_1234',amount:1,currency:'INR'})} as Response);
  await expect(gateway.createOrder(20,'INR','booking')).rejects.toThrow('did not match');
 });
 it('rejects forged signature without requesting payment status',async()=>{
  const api=jest.spyOn(global,'fetch');
  await expect(gateway.verifyPayment('order_1234','pay_12345','0'.repeat(64),20,'INR')).resolves.toBe(false);
  expect(api).not.toHaveBeenCalled();
 });
 it('accepts only a captured payment belonging to the expected order and amount',async()=>{
  const order='order_1234',payment='pay_12345';
  const signature=createHmac('sha256','secret_test_key').update(order+'|'+payment).digest('hex');
  const api=jest.spyOn(global,'fetch').mockResolvedValue({ok:true,json:async()=>({
   id:payment,order_id:order,status:'captured',amount:12550,currency:'INR',
  })} as Response);
  await expect(gateway.verifyPayment(order,payment,signature,125.5,'INR')).resolves.toBe(true);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api.mock.calls[0][0]).toBe('https://api.razorpay.com/v1/payments/pay_12345');
 });
 it.each([
  {id:'pay_12345',order_id:'order_OTHER',status:'captured',amount:12550,currency:'INR'},
  {id:'pay_12345',order_id:'order_1234',status:'authorized',amount:12550,currency:'INR'},
  {id:'pay_12345',order_id:'order_1234',status:'captured',amount:500,currency:'INR'},
  {id:'pay_12345',order_id:'order_1234',status:'captured',amount:12550,currency:'USD'},
 ])('rejects mismatched or uncaptured Razorpay record %#',async(payload)=>{
  const signature=createHmac('sha256','secret_test_key').update('order_1234|pay_12345').digest('hex');
  jest.spyOn(global,'fetch').mockResolvedValue({ok:true,json:async()=>payload} as Response);
  await expect(gateway.verifyPayment('order_1234','pay_12345',signature,125.50,'INR')).resolves.toBe(false);
 });
 it('does not consider a failed verification API request paid',async()=>{
  const signature=createHmac('sha256','secret_test_key').update('order_1234|pay_12345').digest('hex');
  jest.spyOn(global,'fetch').mockRejectedValue(new Error('timeout'));
  await expect(gateway.verifyPayment('order_1234','pay_12345',signature,125.50,'INR')).rejects.toThrow(ServiceUnavailableException);
 });
 it('requires real credentials',async()=>{
  const missing=new RazorpayPaymentGateway({get:()=>undefined} as unknown as ConfigService);
  await expect(missing.createOrder(100,'INR','booking')).rejects.toThrow(ServiceUnavailableException);
 });
});
describe('Pilot financial gateways fail closed',()=>{
 it('prevents online payment orders and verification',async()=>{
  const x=new DisabledPaymentGateway();
  await expect(x.createOrder()).rejects.toThrow(ServiceUnavailableException);
  expect(()=>x.verifyPayment()).toThrow(ServiceUnavailableException);
 });
 it('prevents refund calls before actual processing is configured',async()=>{
  await expect(new DisabledRefundGateway().initiateRefund()).rejects.toThrow(ServiceUnavailableException);
 });
 it('prevents payout calls before account/settlement checks are implemented',async()=>{
  await expect(new DisabledPayoutGateway().initiatePayout()).rejects.toThrow(ServiceUnavailableException);
 });
});
