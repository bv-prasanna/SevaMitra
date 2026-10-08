import {Injectable,ServiceUnavailableException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {OtpSender} from './otp-sender.interface';

/** Requires MSG91-approved DLT flow with variable OTP. No hardcoded credentials. */
@Injectable()
export class Msg91OtpSender implements OtpSender {
 constructor(private readonly config:ConfigService){}
 async sendOtp(phoneNumber:string,otp:string):Promise<void>{
  const authkey=this.config.get<string>('MSG91_AUTHKEY');
  const flowId=this.config.get<string>('MSG91_OTP_FLOW_ID');
  if(!authkey||!flowId)throw new ServiceUnavailableException('SMS OTP provider not configured');
  const mobiles=phoneNumber.replace(/\D/g,'');
  if(!/^91[6-9]\d{9}$/.test(mobiles))throw new ServiceUnavailableException('Invalid SMS destination');
  let response:Response;
  try{
   response=await fetch('https://api.msg91.com/api/v5/flow/',{
    method:'POST',
    headers:{'content-type':'application/json','authkey':authkey},
    body:JSON.stringify({flow_id:flowId,recipients:[{mobiles,OTP:otp}]}),
    signal:AbortSignal.timeout(10000),
   });
  }catch{throw new ServiceUnavailableException('SMS provider unavailable')}
  if(!response.ok)throw new ServiceUnavailableException('SMS provider rejected OTP request');
  const result=await response.json().catch(()=>null) as {type?:string}|null;
  if(result?.type==='error')throw new ServiceUnavailableException('SMS provider failed OTP delivery');
 }
}
