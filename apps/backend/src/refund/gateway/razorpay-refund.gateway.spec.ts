import {ConflictException,ServiceUnavailableException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PaymentMethod,PaymentStatus} from '@prisma/client';
import {RazorpayRefundGateway} from './razorpay-refund.gateway';
import type {PrismaService} from '../../prisma/prisma.service';

describe('RazorpayRefundGateway',()=>{
 let prisma:any;let config:any;let gateway:RazorpayRefundGateway;let fetchSpy:jest.SpyInstance;
 beforeEach(()=>{
  prisma={payment:{findMany:jest.fn().mockResolvedValue([{
   id:'p1',bookingId:'booking-1',method:PaymentMethod.ONLINE,status:PaymentStatus.SUCCEEDED,
   amount:300,gatewayPaymentId:'pay_123',currency:'INR',
  }])}};
  config={get:jest.fn((key:string)=>key==='RAZORPAY_KEY_ID'?'rzp_test_123':key==='RAZORPAY_KEY_SECRET'?'secret_123':undefined)};
  gateway=new RazorpayRefundGateway(config as ConfigService,prisma as PrismaService);
  fetchSpy=jest.spyOn(globalThis,'fetch').mockResolvedValue({
   ok:true,json:async()=>({id:'rfnd_123',payment_id:'pay_123',amount:12500,currency:'INR',status:'pending'}),
  } as Response);
 });
 afterEach(()=>fetchSpy.mockRestore());
 it('sends paise, stable receipt and Razorpay refund idempotency key',async()=>{
  const result=await gateway.initiateRefund('booking-1',125,'INR','refund-uuid-1234567890');
  expect(result).toEqual({refundReference:'rfnd_123',status:'PENDING'});
  const [url,init]=fetchSpy.mock.calls[0];
  expect(url).toBe('https://api.razorpay.com/v1/payments/pay_123/refund');
  expect((init?.headers as Record<string,string>)['X-Refund-Idempotency']).toBe('refund-uuid-1234567890');
  expect(JSON.parse(String(init?.body))).toMatchObject({amount:12500,receipt:'refund-uuid-1234567890'});
 });
 it('rejects a refund that cannot be allocated to one captured online payment',async()=>{
  await expect(gateway.initiateRefund('booking-1',301,'INR','refund-uuid-1234567890')).rejects.toThrow(ConflictException);
  expect(fetchSpy).not.toHaveBeenCalled();
 });
 it('rejects placeholder credentials instead of attempting a live request',async()=>{
  config.get.mockImplementation((key:string)=>key==='RAZORPAY_KEY_ID'?'rzp_test_REPLACE_ME':'REPLACE_ME');
  await expect(gateway.initiateRefund('booking-1',100,'INR','refund-uuid-1234567890')).rejects.toThrow(ServiceUnavailableException);
  expect(fetchSpy).not.toHaveBeenCalled();
 });
});
