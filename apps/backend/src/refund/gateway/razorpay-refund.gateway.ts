import {Injectable,ConflictException,ServiceUnavailableException,BadRequestException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PaymentMethod,PaymentStatus} from '@prisma/client';
import {PrismaService} from '../../prisma/prisma.service';
import {RefundGateway} from './refund-gateway.interface';

/** Razorpay normal-refund adapter. Retries reuse the persisted refund UUID in
 * X-Refund-Idempotency and receipt. Only a single captured online payment is
 * refunded per booking; mixed/multi-payment allocation stays manual and safe.
 */
@Injectable()
export class RazorpayRefundGateway implements RefundGateway{
 constructor(private readonly config:ConfigService,private readonly prisma:PrismaService){}
 private credentials(){
  const id=this.config.get<string>('RAZORPAY_KEY_ID');
  const secret=this.config.get<string>('RAZORPAY_KEY_SECRET');
  if(!id||!secret||/REPLACE|PLACEHOLDER|CHANGE_ME/i.test(id+secret))
   throw new ServiceUnavailableException('Razorpay credentials are not configured');
  return {id,secret};
 }
 private paise(amount:number){
  if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException('Refund amount must be greater than zero');
  const value=Math.round(amount*100);
  if(!Number.isSafeInteger(value)||Math.abs(value-amount*100)>0.000001)
   throw new BadRequestException('Refund amount must be exact to the paise');
  return value;
 }
 async initiateRefund(bookingId:string,amount:number,currency:string,idempotencyKey:string){
  if(currency!=='INR')throw new BadRequestException('Only INR refunds are configured');
  if(!/^[A-Za-z0-9_-]{10,40}$/.test(idempotencyKey))
   throw new BadRequestException('A stable refund idempotency key is required');
  const candidates=await this.prisma.payment.findMany({
   where:{bookingId,method:PaymentMethod.ONLINE,status:PaymentStatus.SUCCEEDED,gatewayPaymentId:{not:null}},
   orderBy:{settledAt:'asc'},
  });
  const payment=candidates.find(x=>Number(x.amount)>=amount);
  if(!payment?.gatewayPaymentId)
   throw new ConflictException('No single captured online payment covers this refund. Finance must review the payment allocation.');
  const {id,secret}=this.credentials();
  let response:Response;
  try{
   response=await fetch('https://api.razorpay.com/v1/payments/'+encodeURIComponent(payment.gatewayPaymentId)+'/refund',{
    method:'POST',
    headers:{
     Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),
     'Content-Type':'application/json',
     'X-Refund-Idempotency':idempotencyKey,
    },
    body:JSON.stringify({amount:this.paise(amount),receipt:idempotencyKey,notes:{sevamitra_booking_id:bookingId}}),
    signal:AbortSignal.timeout(12000),
   });
  }catch{throw new ServiceUnavailableException('Razorpay refund status is unknown; retry the same refund safely')}
  if(!response.ok)throw new ServiceUnavailableException('Razorpay could not confirm the refund request');
  const result=await response.json() as {id?:string;payment_id?:string;amount?:number;currency?:string;status?:string};
  if(typeof result.id!=='string'||!result.id.startsWith('rfnd_')||
    result.payment_id!==payment.gatewayPaymentId||result.amount!==this.paise(amount)||result.currency!==currency)
   throw new ServiceUnavailableException('Razorpay refund response did not match the stored payment');
  const status=result.status==='processed'?'REFUNDED':result.status==='pending'?'PENDING':result.status==='failed'?'FAILED':null;
  if(!status)throw new ServiceUnavailableException('Razorpay returned an unknown refund status');
  return {refundReference:result.id,status};
 }
}
