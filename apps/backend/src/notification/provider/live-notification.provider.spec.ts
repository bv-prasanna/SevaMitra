import {ServiceUnavailableException} from '@nestjs/common';
import {LiveNotificationProvider} from './live-notification.provider';
import type {ConfigService} from '@nestjs/config';
import type {PrismaService} from '../../prisma/prisma.service';

describe('LiveNotificationProvider',()=>{
 const vars={MSG91_AUTHKEY:'key',MSG91_SMS_FLOW_ID:'flow',RESEND_API_KEY:'resend',RESEND_FROM_EMAIL:'notify@example.com',WHATSAPP_ACCESS_TOKEN:'token',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_TEMPLATE_NAME:'sevamitra_notice'};
 let provider:LiveNotificationProvider;
 let prisma:{pushDevice:{findMany:jest.Mock}};
 beforeEach(()=>{
  prisma={pushDevice:{findMany:jest.fn().mockResolvedValue([])}};
  provider=new LiveNotificationProvider({get:(k:string)=>(vars as Record<string,string>)[k]} as unknown as ConfigService,prisma as unknown as PrismaService);
 });
 afterEach(()=>jest.restoreAllMocks());
 it('sends SMS through an approved MSG91 Flow instead of logging',async()=>{
  const request=jest.spyOn(global,'fetch').mockResolvedValue({ok:true} as Response);
  await provider.sendSms('+919876543210','Booking confirmed');
  expect(request).toHaveBeenCalledWith('https://api.msg91.com/api/v5/flow/',expect.objectContaining({method:'POST',body:expect.stringContaining('Booking confirmed')}));
 });
 it('rejects invalid SMS destinations',async()=>{await expect(provider.sendSms('12','x')).rejects.toThrow(ServiceUnavailableException)});
 it('sends email through authenticated provider',async()=>{
  const request=jest.spyOn(global,'fetch').mockResolvedValue({ok:true} as Response);
  await provider.sendEmail('customer@example.com','Booked','Your job is booked');
  expect(request).toHaveBeenCalledWith('https://api.resend.com/emails',expect.objectContaining({headers:expect.objectContaining({Authorization:'Bearer resend'})}));
 });
 it('sends a WhatsApp template message through Graph API',async()=>{
  const request=jest.spyOn(global,'fetch').mockResolvedValue({ok:true} as Response);
  await provider.sendWhatsApp('+919876543210','Booking update');
  expect(request).toHaveBeenCalledWith(expect.stringContaining('graph.facebook.com'),expect.objectContaining({body:expect.stringContaining('sevamitra_notice')}));
 });
 it('does not claim a push was sent if no devices exist',async()=>{await expect(provider.sendPush('u','Hi','Message')).rejects.toThrow(ServiceUnavailableException)});
 it('pushes to registered Expo tokens',async()=>{
  prisma.pushDevice.findMany.mockResolvedValue([{expoToken:'ExpoPushToken[abcdef1234567]'}]);
  const request=jest.spyOn(global,'fetch').mockResolvedValue({ok:true} as Response);
  await provider.sendPush('u','Hi','Notice');
  expect(request).toHaveBeenCalledWith('https://exp.host/--/api/v2/push/send',expect.objectContaining({method:'POST'}));
 });
 it('fails closed on provider HTTP failure',async()=>{
  jest.spyOn(global,'fetch').mockResolvedValue({ok:false} as Response);
  await expect(provider.sendSms('+919876543210','Message')).rejects.toThrow(ServiceUnavailableException);
 });
});
