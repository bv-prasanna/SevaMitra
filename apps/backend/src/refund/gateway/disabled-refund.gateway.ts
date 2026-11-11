import {Injectable,ServiceUnavailableException} from '@nestjs/common';
import {RefundGateway} from './refund-gateway.interface';
@Injectable()
export class DisabledRefundGateway implements RefundGateway{
 async initiateRefund():Promise<{refundReference:string}>{
  throw new ServiceUnavailableException('Automatic refunds are disabled until reconciliation is approved');
 }
}
