
import { ProviderBookingController } from './provider-booking.controller';
import type { BookingService } from '../booking.service';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';

describe('ProviderBookingController ownership delegation', () => {
 const api = {
   listAsProvider: jest.fn(),findAsProvider: jest.fn(),acceptAsProvider: jest.fn(),
   rejectAsProvider: jest.fn(),cancelAsProvider: jest.fn(),
   reportCustomerNoShow: jest.fn(),completeAsProvider: jest.fn(),
 };
 const controller = new ProviderBookingController(api as unknown as BookingService);
 const user = {id:'provider-user-1',phoneNumber:null,email:null} as AuthenticatedUser;
 beforeEach(()=>jest.resetAllMocks());

 it('lists jobs by authenticated provider, not a supplied provider ID',async()=>{
  await controller.list(user,{status:'REQUESTED'} as Parameters<ProviderBookingController['list']>[1]);
  expect(api.listAsProvider).toHaveBeenCalledWith('provider-user-1','REQUESTED');
 });
 it('gets job details using provider ownership check',async()=>{
  await controller.findOne(user,'job-1');
  expect(api.findAsProvider).toHaveBeenCalledWith('provider-user-1','job-1');
 });
 it('accepts bookings through the provider-specific state machine',async()=>{
  await controller.accept(user,'job-1');
  expect(api.acceptAsProvider).toHaveBeenCalledWith('provider-user-1','job-1');
 });
 it('passes a provider rejection reason',async()=>{
  const dto={reason:'Unavailability'};
  await controller.reject(user,'job-1',dto);
  expect(api.rejectAsProvider).toHaveBeenCalledWith('provider-user-1','job-1',dto);
 });
 it('passes cancellation attribution and reason',async()=>{
  const dto={reason:'Equipment failure'};
  await controller.cancel(user,'job-1',dto);
  expect(api.cancelAsProvider).toHaveBeenCalledWith('provider-user-1','job-1',dto);
 });
 it('reports a customer no-show as the provider party',async()=>{
  await controller.reportNoShow(user,'job-1');
  expect(api.reportCustomerNoShow).toHaveBeenCalledWith('provider-user-1','job-1');
 });
 it('records service completion only through provider-authenticated identity',async()=>{
  await controller.complete(user,'job-1');
  expect(api.completeAsProvider).toHaveBeenCalledWith('provider-user-1','job-1');
 });
});
