import {Injectable} from '@nestjs/common';
import {PayoutGateway, PayoutNotConfiguredException} from './payout-gateway.interface';
@Injectable()
export class DisabledPayoutGateway implements PayoutGateway{
 async initiatePayout():Promise<{payoutReference:string}>{
  throw new PayoutNotConfiguredException();
 }
}
