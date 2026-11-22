import {createHmac} from 'node:crypto';
import {ConflictException} from '@nestjs/common';
import {PaymentMethod,PaymentStatus,Prisma} from '@prisma/client';
import {PaymentService} from './payment.service';

describe('Razorpay webhook reconciliation',()=>{
 const secret='webhook_test_secret';
 const body=Buffer.from(JSON.stringify({event:'payment.captured',payload:{payment:{entity:{
  id:'pay_12345',order_id:'order_12345',amount:25000,currency:'INR',status:'captured',
 }}}}));
 const signature=createHmac('sha256',secret).update(body).digest('hex');
 let prisma:any;let service:PaymentService;
 beforeEach(()=>{
  prisma={
   gatewayWebhookEvent:{create:jest.fn().mockResolvedValue({}),findUnique:jest.fn().mockResolvedValue(null),update:jest.fn().mockResolvedValue({})},
   payment:{findFirst:jest.fn().mockResolvedValue({id:'payment-1',amount:'250.00',currency:'INR',method:PaymentMethod.ONLINE,status:PaymentStatus.INITIATED}),updateMany:jest.fn().mockResolvedValue({count:1})},
   $transaction:jest.fn(async(fn:any)=>fn({payment:{updateMany:prisma.payment.updateMany},gatewayWebhookEvent:{update:prisma.gatewayWebhookEvent.update}})),
  };
  service=new PaymentService(prisma,{} as any,{} as any,{} as any,{} as any,{get:(key:string)=>key==='RAZORPAY_WEBHOOK_SECRET'?secret:undefined} as any);
 });
 it('rejects a forged signature without touching the database',async()=>{
  await expect(service.handleRazorpayWebhook(body,'0'.repeat(64),'evt_1')).rejects.toThrow(ConflictException);
  expect(prisma.gatewayWebhookEvent.create).not.toHaveBeenCalled();
 });
 it('records and reconciles a captured payment exactly once',async()=>{
  await expect(service.handleRazorpayWebhook(body,signature,'evt_1')).resolves.toEqual({received:true,reconciled:true});
  expect(prisma.payment.updateMany).toHaveBeenCalledWith({where:{id:'payment-1',status:PaymentStatus.INITIATED},data:expect.objectContaining({status:PaymentStatus.SUCCEEDED,gatewayPaymentId:'pay_12345'})});
  expect(prisma.gatewayWebhookEvent.update).toHaveBeenCalled();
 });
 it('does not reconcile a mismatched amount',async()=>{
  prisma.payment.findFirst.mockResolvedValue({id:'payment-1',amount:'251.00',currency:'INR',method:PaymentMethod.ONLINE,status:PaymentStatus.INITIATED});
  await expect(service.handleRazorpayWebhook(body,signature,'evt_2')).resolves.toEqual({received:true,reconciled:false});
  expect(prisma.payment.updateMany).not.toHaveBeenCalled();
 });
 it('returns duplicate for an already processed event',async()=>{
  const duplicate=new Prisma.PrismaClientKnownRequestError('unique',{code:'P2002',clientVersion:'7.10.0'});
  prisma.gatewayWebhookEvent.create.mockRejectedValue(duplicate);
  prisma.gatewayWebhookEvent.findUnique.mockResolvedValue({processedAt:new Date()});
  await expect(service.handleRazorpayWebhook(body,signature,'evt_1')).resolves.toEqual({received:true,duplicate:true});
  expect(prisma.payment.updateMany).not.toHaveBeenCalled();
 });
});
