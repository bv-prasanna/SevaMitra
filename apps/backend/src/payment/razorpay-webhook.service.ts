import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PaymentStatus,RefundStatus,Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';

type PaymentEntity={id?:unknown;order_id?:unknown;amount?:unknown;currency?:unknown;status?:unknown};
type RefundEntity={id?:unknown;status?:unknown};
type Envelope={event?:unknown;payload?:{payment?:{entity?:PaymentEntity};refund?:{entity?:RefundEntity}}};

@Injectable()
export class RazorpayWebhookService{
 constructor(private readonly prisma:PrismaService,private readonly config:ConfigService){}

 private verify(raw:Buffer,signature:string){
  const secret=this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
  if(!secret||/REPLACE|PLACEHOLDER|CHANGE_ME/i.test(secret))
   throw new ServiceUnavailableException('Razorpay webhook secret is not configured');
  if(!/^[a-f0-9]{64}$/i.test(signature))throw new UnauthorizedException('Invalid webhook signature');
  const expected=createHmac('sha256',secret).update(raw).digest();
  const received=Buffer.from(signature,'hex');
  if(received.length!==expected.length||!timingSafeEqual(received,expected))
   throw new UnauthorizedException('Invalid webhook signature');
 }

 async receive(rawBody:Buffer|undefined,signature:string|undefined,eventId:string|undefined){
  if(!rawBody?.length)throw new BadRequestException('Webhook raw body is required');
  if(!signature)throw new UnauthorizedException('Webhook signature is required');
  this.verify(rawBody,signature);
  if(!eventId||eventId.length>128||!/^[A-Za-z0-9_-]+$/.test(eventId))
   throw new BadRequestException('A valid Razorpay event ID is required');
  let envelope:Envelope;
  try{envelope=JSON.parse(rawBody.toString('utf8')) as Envelope}
  catch{throw new BadRequestException('Invalid webhook JSON payload')}
  if(typeof envelope.event!=='string'||envelope.event.length>100)
   throw new BadRequestException('Webhook event type is missing');
  const eventType=envelope.event;
  const payloadHash=createHash('sha256').update(rawBody).digest('hex');
  try{
   await this.prisma.$transaction(async tx=>{
    await tx.razorpayWebhookEvent.create({data:{eventId,eventType,payloadHash}});
    await this.apply(tx,eventType,envelope);
    await tx.razorpayWebhookEvent.update({where:{eventId},data:{processedAt:new Date()}});
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
   return {received:true,duplicate:false};
  }catch(error){
   if((error as {code?:string})?.code==='P2002'){
    const existing=await this.prisma.razorpayWebhookEvent.findUnique({where:{eventId}});
    if(existing){
     if(existing.payloadHash!==payloadHash)throw new ConflictException('Razorpay event ID was reused with a different payload');
     return {received:true,duplicate:true};
    }
   }
   throw error;
  }
 }

 private async apply(tx:Prisma.TransactionClient,eventType:string,envelope:Envelope){
  if(eventType==='payment.captured'||eventType==='payment.failed'){
   const entity=envelope.payload?.payment?.entity;
   if(!entity||typeof entity.id!=='string'||typeof entity.order_id!=='string'||
      !Number.isSafeInteger(entity.amount)||typeof entity.currency!=='string')
    throw new BadRequestException('Razorpay payment event is incomplete');
   const payment=await tx.payment.findUnique({where:{gatewayOrderId:entity.order_id}});
   if(!payment)throw new NotFoundException('Payment order is not recognized');
   if(payment.currency!==entity.currency||Math.round(Number(payment.amount)*100)!==entity.amount)
    throw new ConflictException('Razorpay payment amount or currency does not match the stored order');
   if(payment.gatewayPaymentId&&payment.gatewayPaymentId!==entity.id)
    throw new ConflictException('A different gateway payment is already linked to this order');
   if(eventType==='payment.captured'){
    if(entity.status!=='captured')throw new ConflictException('Razorpay did not report a captured payment');
    if(payment.status!==PaymentStatus.SUCCEEDED){
     await tx.payment.update({where:{id:payment.id},data:{
      status:PaymentStatus.SUCCEEDED,gatewayPaymentId:entity.id as string,
      settledAt:payment.settledAt??new Date(),failureReason:null,
     }});
    }
   }else{
    if(entity.status!=='failed')throw new ConflictException('Razorpay did not report a failed payment');
    // Events may arrive out of order. Never downgrade a captured payment.
    if(payment.status===PaymentStatus.INITIATED){
     await tx.payment.update({where:{id:payment.id},data:{
      status:PaymentStatus.FAILED,gatewayPaymentId:entity.id as string,
      failureReason:'Razorpay reported payment.failed',
     }});
    }
   }
   return;
  }
  if(eventType==='refund.processed'||eventType==='refund.failed'){
   const entity=envelope.payload?.refund?.entity;
   if(!entity||typeof entity.id!=='string')throw new BadRequestException('Razorpay refund event is incomplete');
   const refund=await tx.refund.findFirst({where:{refundReference:entity.id}});
   if(!refund)throw new NotFoundException('Refund reference is not recognized');
   if(eventType==='refund.processed'){
    if(entity.status!=='processed')throw new ConflictException('Razorpay refund is not processed');
    if(refund.status!==RefundStatus.REFUNDED){
     await tx.refund.update({where:{id:refund.id},data:{status:RefundStatus.REFUNDED,refundedAt:new Date(),failureReason:null}});
    }
   }else{
    if(entity.status!=='failed')throw new ConflictException('Razorpay refund is not failed');
    if(refund.status===RefundStatus.PENDING){
     await tx.refund.update({where:{id:refund.id},data:{status:RefundStatus.FAILED,failureReason:'Razorpay reported refund.failed'}});
    }
   }
  }
  // Unhandled events are still durably deduplicated and acknowledged. Add
  // explicit handlers before using any other event to move money or fulfil work.
 }
}
