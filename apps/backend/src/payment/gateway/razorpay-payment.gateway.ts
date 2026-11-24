import {createHmac,timingSafeEqual} from 'node:crypto';
import {Injectable,ServiceUnavailableException,BadRequestException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PaymentGateway} from './payment-gateway.interface';

/**
 * Razorpay Orders API adapter. Only a successfully CAPTURED payment
 * belonging to this order and matching its booked amount may be confirmed.
 * Do not expose API keys or payment verification on web/mobile.
 */
@Injectable()
export class RazorpayPaymentGateway implements PaymentGateway{
 constructor(private readonly config:ConfigService){}
 private credentials(){
  const id=this.config.get<string>('RAZORPAY_KEY_ID');
  const secret=this.config.get<string>('RAZORPAY_KEY_SECRET');
  if(!id||!secret)throw new ServiceUnavailableException('Razorpay gateway is not configured');
  return {id,secret};
 }
 private rupeesToPaise(amount:number):number{
  if(!Number.isFinite(amount)||amount<=0)throw new BadRequestException('Invalid payment amount');
  const minor=Math.round(amount*100);
  if(!Number.isSafeInteger(minor)||Math.abs(minor-amount*100)>0.000001)
   throw new BadRequestException('Amount must be in exact paise');
  return minor;
 }
 private async call<T>(method:'GET'|'POST',path:string,body?:unknown):Promise<T>{
  const {id,secret}=this.credentials();
  let response:Response;
  try{
   response=await fetch('https://api.razorpay.com/v1'+path,{
    method,
    headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),
      'Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(12000),
   });
  }catch{throw new ServiceUnavailableException('Razorpay unavailable; payment not confirmed')}
  if(!response.ok)throw new ServiceUnavailableException('Razorpay rejected the operation');
  try{return await response.json() as T}
  catch{throw new ServiceUnavailableException('Invalid gateway response')}
 }
 async createOrder(amount:number,currency:string,receiptId:string):Promise<{gatewayOrderId:string}>{
  if(currency!=='INR')throw new BadRequestException('Only INR gateway orders are enabled');
  const order=await this.call<{id?:string;amount?:number;currency?:string}>('POST','/orders',{
    amount:this.rupeesToPaise(amount),currency:'INR',receipt:receiptId.slice(0,40),
    payment_capture:1,
  });
  if(typeof order.id!=='string'||!order.id.startsWith('order_')||
     order.currency!=='INR'||order.amount!==this.rupeesToPaise(amount))
   throw new ServiceUnavailableException('Razorpay order response did not match requested amount');
  return {gatewayOrderId:order.id};
 }
  async fetchOrderPayments(gatewayOrderId: string): Promise<Array<{
    id: string; orderId: string; status: string; amount: number; currency: string;
  }>> {
    if (!/^order_[\\w-]{3,100}$/.test(gatewayOrderId)) {
      throw new BadRequestException('Invalid Razorpay order identifier');
    }
    const response = await this.call<{ items?: Array<{
      id?: string; order_id?: string; status?: string; amount?: number; currency?: string;
    }> }>('GET', '/orders/' + encodeURIComponent(gatewayOrderId) + '/payments');
    if (!Array.isArray(response.items)) {
      throw new ServiceUnavailableException('Razorpay order payments response is invalid');
    }
    return response.items.filter((item): item is {
      id: string; order_id: string; status: string; amount: number; currency: string;
    } => typeof item.id === 'string' && item.order_id === gatewayOrderId &&
      typeof item.status === 'string' && Number.isSafeInteger(item.amount) &&
      typeof item.currency === 'string').map(item => ({
        id: item.id, orderId: item.order_id, status: item.status,
        amount: item.amount, currency: item.currency,
      }));
  }

 async verifyPayment(orderId:string,paymentId:string,signature:string,amount?:number,currency?:string):Promise<boolean>{
  if(!/^order_[\w-]{3,100}$/.test(orderId)||!/^pay_[\w-]{3,100}$/.test(paymentId)||
      !/^[a-f0-9]{64}$/i.test(signature)||amount===undefined||currency!=='INR')return false;
  const {secret}=this.credentials();
  const digest=createHmac('sha256',secret).update(orderId+'|'+paymentId).digest('hex');
  if(!timingSafeEqual(Buffer.from(digest,'hex'),Buffer.from(signature,'hex')))return false;
  const paid=await this.call<{id?:string;order_id?:string;status?:string;amount?:number;currency?:string}>(
    'GET','/payments/'+encodeURIComponent(paymentId),
  );
  return paid.id===paymentId&&paid.order_id===orderId&&paid.status==='captured'&&
    paid.amount===this.rupeesToPaise(amount)&&paid.currency===currency;
 }
}
