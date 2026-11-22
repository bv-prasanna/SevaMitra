import {createHash,createHmac} from 'node:crypto';
import {ConflictException,UnauthorizedException} from '@nestjs/common';
import {PaymentStatus,RefundStatus} from '@prisma/client';
import {RazorpayWebhookService} from './razorpay-webhook.service';
import type {PrismaService} from '../prisma/prisma.service';
import type {ConfigService} from '@nestjs/config';

describe('RazorpayWebhookService',()=>{
 const secret='unit_test_webhook_secret_123456';
 let tx:any;let prisma:any;let service:RazorpayWebhookService;
 let payment:any;let refund:any;
 const body=(event:string,payload:unknown)=>Buffer.from(JSON.stringify({event,payload}));
 const signature=(raw:Buffer)=>createHmac('sha256',secret).update(raw).digest('hex');
 beforeEach(()=>{
  payment={id:'payment-1',gatewayOrderId:'order_12345',gatewayPaymentId:null,amount:120,currency:'INR',status:PaymentStatus.INITIATED,settledAt:null};
  refund={id:'refund-1',refundReference:'rfnd_12345',status:RefundStatus.PENDING};
  tx={
   razorpayWebhookEvent:{create:jest.fn().mockResolvedValue({}),update:jest.fn().mockResolvedValue({})},
   payment:{findUnique:jest.fn().mockImplementation(async()=>payment),update:jest.fn().mockImplementation(async({data})=>{payment={...payment,...data};return payment;})},
   refund:{findFirst:jest.fn().mockResolvedValue(refund),update:jest.fn().mockImplementation(async({data})=>{refund={...refund,...data};return refund;})},
  };
  prisma={...tx, $transaction:jest.fn(async(fn:any)=>fn(tx)),razorpayWebhookEvent:{...tx.razorpayWebhookEvent,findUnique:jest.fn()}};
  const config={get:jest.fn().mockReturnValue(secret)};
  service=new RazorpayWebhookService(prisma as unknown as PrismaService,config as unknown as ConfigService);
 });
 it('rejects a missing or invalid signature before database writes',async()=>{
  const raw=body('payment.captured',{payment:{entity:{id:'pay_1',order_id:'order_12345',amount:12000,currency:'INR',status:'captured'}}});
  await expect(service.receive(raw,'bad','evt_1')).rejects.toThrow(UnauthorizedException);
  expect(prisma.$transaction).not.toHaveBeenCalled();
 });
 it('reconciles a captured payment only when order, amount and currency match',async()=>{
  const raw=body('payment.captured',{payment:{entity:{id:'pay_12345',order_id:'order_12345',amount:12000,currency:'INR',status:'captured'}}});
  await expect(service.receive(raw,signature(raw),'evt_capture_1')).resolves.toEqual({received:true,duplicate:false});
  expect(tx.payment.update).toHaveBeenCalledWith({where:{id:'payment-1'},data:expect.objectContaining({
   status:PaymentStatus.SUCCEEDED,gatewayPaymentId:'pay_12345',failureReason:null,
  })});
  expect(tx.razorpayWebhookEvent.update).toHaveBeenCalled();
 });
 it('rejects amount mismatch and rolls back the webhook event',async()=>{
  const raw=body('payment.captured',{payment:{entity:{id:'pay_12345',order_id:'order_12345',amount:12001,currency:'INR',status:'captured'}}});
  await expect(service.receive(raw,signature(raw),'evt_bad_amount')).rejects.toThrow(ConflictException);
  expect(tx.razorpayWebhookEvent.update).not.toHaveBeenCalled();
 });
 it('does not downgrade a captured payment when an older failure event arrives',async()=>{
  payment={...payment,status:PaymentStatus.SUCCEEDED,gatewayPaymentId:'pay_12345'};
  const raw=body('payment.failed',{payment:{entity:{id:'pay_12345',order_id:'order_12345',amount:12000,currency:'INR',status:'failed'}}});
  await service.receive(raw,signature(raw),'evt_old_failure');
  expect(tx.payment.update).not.toHaveBeenCalled();
  expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
 });
 it('recovers a failed attempt if the captured event arrives later for the same payment',async()=>{
  const failed=body('payment.failed',{payment:{entity:{id:'pay_12345',order_id:'order_12345',amount:12000,currency:'INR',status:'failed'}}});
  await service.receive(failed,signature(failed),'evt_failed');
  expect(payment.status).toBe(PaymentStatus.FAILED);
  const captured=body('payment.captured',{payment:{entity:{id:'pay_12345',order_id:'order_12345',amount:12000,currency:'INR',status:'captured'}}});
  await service.receive(captured,signature(captured),'evt_captured');
  expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
 });
 it('marks a refund complete only after the signed processed event',async()=>{
  const raw=body('refund.processed',{refund:{entity:{id:'rfnd_12345',status:'processed'}}});
  await service.receive(raw,signature(raw),'evt_refund');
  expect(tx.refund.update).toHaveBeenCalledWith({where:{id:'refund-1'},data:expect.objectContaining({
   status:RefundStatus.REFUNDED,refundedAt:expect.any(Date),failureReason:null,
  })});
 });
 it('deduplicates an identical provider event ID and rejects payload substitution',async()=>{
  const raw=body('payment.captured',{payment:{entity:{id:'pay_12345',order_id:'order_12345',amount:12000,currency:'INR',status:'captured'}}});
  const hash=createHash('sha256').update(raw).digest('hex');
  prisma.razorpayWebhookEvent.findUnique.mockResolvedValue({eventId:'evt_duplicate',payloadHash:hash});
  tx.razorpayWebhookEvent.create.mockRejectedValue({code:'P2002'});
  await expect(service.receive(raw,signature(raw),'evt_duplicate')).resolves.toEqual({received:true,duplicate:true});
  const other=body('payment.failed',{payment:{entity:{id:'pay_12345',order_id:'order_12345',amount:12000,currency:'INR',status:'failed'}}});
  await expect(service.receive(other,signature(other),'evt_duplicate')).rejects.toThrow(ConflictException);
 });
});
