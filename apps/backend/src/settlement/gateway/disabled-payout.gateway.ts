import {Injectable,ServiceUnavailableException} from '@nestjs/common';
import {PayoutGateway} from './payout-gateway.interface';
@Injectable()
export class DisabledPayoutGateway implements PayoutGateway{
 async initiatePayout():Promise<{payoutReference:string}>{
  throw new ServiceUnavailableException('Provider payouts are disabled until settlement onboarding and finance review');
 }
}
