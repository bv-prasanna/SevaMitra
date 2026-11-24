import {Injectable} from '@nestjs/common';
import {RefundGateway, RefundNotConfiguredException} from './refund-gateway.interface';
@Injectable()
export class DisabledRefundGateway implements RefundGateway{
 async initiateRefund():Promise<{refundReference:string}>{
  throw new RefundNotConfiguredException();
 }
}
