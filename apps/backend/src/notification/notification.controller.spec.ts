
import {NotificationChannel} from '@prisma/client';
import {NotificationController} from './notification.controller';
import {AdminNotificationController} from './admin-notification.controller';
import type {NotificationService} from './notification.service';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';

describe('Notification customer/admin controller separation',()=>{
 const svc={listAsUser:jest.fn(),markReadAsUser:jest.fn(),send:jest.fn()};
 const user={id:'user-a',phoneNumber:null,email:null} as AuthenticatedUser;
 const customer=new NotificationController(svc as unknown as NotificationService);
 const admin=new AdminNotificationController(svc as unknown as NotificationService);
 beforeEach(()=>jest.resetAllMocks());
 it('scopes inbox and unread filter to authenticated user',async()=>{
  await customer.list(user,{unreadOnly:true});
  expect(svc.listAsUser).toHaveBeenCalledWith('user-a',true);
 });
 it('never allows marking another account via a route user-id parameter',async()=>{
  await customer.markRead(user,'notification-1');
  expect(svc.markReadAsUser).toHaveBeenCalledWith('user-a','notification-1');
 });
 it('sends an operational notice through the platform permission-guarded endpoint',async()=>{
  const dto={userId:'user-b',channel:NotificationChannel.IN_APP,title:'Booking',body:'Confirmed'};
  await admin.send(dto);
  expect(svc.send).toHaveBeenCalledWith('user-b',NotificationChannel.IN_APP,'Booking','Confirmed');
 });
});
