
import { CustomerBookingController } from './customer-booking.controller';
import type { BookingService } from '../booking.service';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';

describe('CustomerBookingController ownership delegation', () => {
  const api = {
    create: jest.fn(), listAsCustomer: jest.fn(), findAsCustomer: jest.fn(),
    cancelAsCustomer: jest.fn(), reportProviderNoShow: jest.fn(),
    confirmCompletionAsCustomer: jest.fn(),
  };
  const controller = new CustomerBookingController(api as unknown as BookingService);
  const user = { id: 'customer-user-1', phoneNumber: null, email: null } as AuthenticatedUser;
  beforeEach(() => jest.resetAllMocks());

  it('uses the authenticated user for booking creation', async () => {
    const dto = { offeringId: 'offering-1' } as Parameters<CustomerBookingController['create']>[1];
    api.create.mockResolvedValue({ id: 'booking-1' });
    await expect(controller.create(user, dto)).resolves.toEqual({id: 'booking-1'});
    expect(api.create).toHaveBeenCalledWith('customer-user-1',dto);
  });
  it('scopes history by current account and status', async () => {
    api.listAsCustomer.mockResolvedValue([]);
    await controller.list(user, {status:'COMPLETED'} as Parameters<CustomerBookingController['list']>[1]);
    expect(api.listAsCustomer).toHaveBeenCalledWith('customer-user-1','COMPLETED');
  });
  it('scopes booking lookup by current account', async () => {
    await controller.findOne(user,'booking-1');
    expect(api.findAsCustomer).toHaveBeenCalledWith('customer-user-1','booking-1');
  });
  it('requires the account as well as booking ID when canceling', async () => {
    const dto = {reason:'Cannot attend'};
    await controller.cancel(user,'booking-1',dto);
    expect(api.cancelAsCustomer).toHaveBeenCalledWith('customer-user-1','booking-1',dto);
  });
  it('never lets the customer claim to be the provider in a no-show report', async () => {
    await controller.reportNoShow(user,'booking-1');
    expect(api.reportProviderNoShow).toHaveBeenCalledWith('customer-user-1','booking-1');
  });
  it('marks a completion acknowledgment under customer authority', async () => {
    await controller.confirmCompletion(user,'booking-1');
    expect(api.confirmCompletionAsCustomer).toHaveBeenCalledWith('customer-user-1','booking-1');
  });
});
