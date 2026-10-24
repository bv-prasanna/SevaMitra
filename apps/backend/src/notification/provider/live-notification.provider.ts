import {Injectable,ServiceUnavailableException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PrismaService} from '../../prisma/prisma.service';
import {NotificationProvider} from './notification-provider.interface';

type Result={ok:boolean};
@Injectable()
export class LiveNotificationProvider implements NotificationProvider{
 constructor(private readonly cfg:ConfigService,private readonly prisma:PrismaService){}
 private require(key:string):string{
  const v=this.cfg.get<string>(key);
  if(!v)throw new ServiceUnavailableException(`Notification provider setting ${key} is missing`);
  return v;
 }
 private async send(url:string,headers:Record<string,string>,body:unknown):Promise<void>{
  let result:Response;
  try{result=await fetch(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});}
  catch{throw new ServiceUnavailableException('Notification delivery provider is unavailable')}
  if(!result.ok)throw new ServiceUnavailableException('Notification provider rejected the message');
 }
 async sendSms(to:string,message:string):Promise<void>{
  const flow=this.require('MSG91_SMS_FLOW_ID');
  const key=this.require('MSG91_AUTHKEY');
  const mobiles=to.replace(/\D/g,'');
  if(!/^91[6-9]\d{9}$/.test(mobiles))throw new ServiceUnavailableException('Invalid SMS destination');
  await this.send('https://api.msg91.com/api/v5/flow/',{authkey:key},{flow_id:flow,recipients:[{mobiles,MESSAGE:message}]});
 }
 async sendWhatsApp(to:string,message:string):Promise<void>{
  const token=this.require('WHATSAPP_ACCESS_TOKEN');
  const phoneId=this.require('WHATSAPP_PHONE_NUMBER_ID');
  const template=this.require('WHATSAPP_TEMPLATE_NAME');
  const version=this.cfg.get<string>('WHATSAPP_GRAPH_VERSION')||'v23.0';
  if(!/^v\d+\.\d+$/.test(version)||!/^[0-9]+$/.test(phoneId))throw new ServiceUnavailableException('Invalid WhatsApp configuration');
  const phone=to.replace(/\D/g,'');
  await this.send(`https://graph.facebook.com/${version}/${phoneId}/messages`,
    {Authorization:`Bearer ${token}`},{messaging_product:'whatsapp',to:phone,type:'template',template:{name:template,language:{code:'en'},components:[{type:'body',parameters:[{type:'text',text:message.slice(0,900)}]}]}});
 }
 async sendEmail(to:string,subject:string,body:string):Promise<void>{
  const key=this.require('RESEND_API_KEY'),from=this.require('RESEND_FROM_EMAIL');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))throw new ServiceUnavailableException('Invalid email destination');
  await this.send('https://api.resend.com/emails',{Authorization:`Bearer ${key}`},{from,to:[to],subject,text:body});
 }
 async sendPush(userId:string,title:string,body:string):Promise<void>{
  const devices=await this.prisma.pushDevice.findMany({where:{userId,isActive:true},take:20});
  if(!devices.length)throw new ServiceUnavailableException('User has no active push subscription');
  const messages=devices.map(d=>({to:d.expoToken,title,body,sound:'default'}));
  await this.send('https://exp.host/--/api/v2/push/send',{},messages);
 }
}
