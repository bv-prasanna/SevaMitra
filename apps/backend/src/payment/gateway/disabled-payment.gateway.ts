import {Injectable,ServiceUnavailableException} from '@nestjs/common';
import {PaymentGateway} from './payment-gateway.interface';

/** Safe pilot mode: reject online payment attempts rather than fabricating success. */
@Injectable()
export class DisabledPaymentGateway implements PaymentGateway{
 async createOrder():Promise<{gatewayOrderId:string}>{
  throw new ServiceUnavailableException('Online payments are not enabled for this pilot');
 }
 verifyPayment():boolean{
  throw new ServiceUnavailableException('Online payments are not enabled for this pilot');
 }
}
