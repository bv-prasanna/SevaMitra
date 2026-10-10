import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  PricingModel,
} from '@prisma/client';
import { PaymentService } from './payment.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { BookingService } from '../booking/booking.service';
import type { CustomerService } from '../customer/customer.service';
import type { ProviderService } from '../provider/provider.service';

describe('PaymentService', () => {
  let prisma: {
    $transaction: jest.Mock;
    booking: { findUnique: jest.Mock };
    payment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let bookingService: { findAsCustomer: jest.Mock; findAsProvider: jest.Mock };
  let customerService: { getActiveProfileOrThrow: jest.Mock };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let paymentGateway: { createOrder: jest.Mock; verifyPayment: jest.Mock };
  let config: {get: jest.Mock};
  let service: PaymentService;

  const customer = { id: 'customer-1' };
  const provider = { id: 'provider-1' };
  const booking = {
    id: 'booking-1',
    customerId: 'customer-1',
    status: BookingStatus.ACCEPTED,
    pricingModel: PricingModel.FIXED,
    amount: 500,
    visitFee: 100,
    currency: 'INR',
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(),
      booking: { findUnique: jest.fn().mockResolvedValue(booking) },
      payment: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ payment: prisma.payment, booking: prisma.booking, $queryRaw: jest.fn().mockResolvedValue([]) }));
    bookingService = {
      findAsCustomer: jest.fn().mockResolvedValue(booking),
      findAsProvider: jest.fn().mockResolvedValue(booking),
    };
    customerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(customer),
    };
    providerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(provider),
    };
    paymentGateway = {
      createOrder: jest
        .fn()
        .mockResolvedValue({ gatewayOrderId: 'stub_order_1' }),
      verifyPayment: jest.fn().mockReturnValue(true),
    };

    config = {get: jest.fn().mockReturnValue(undefined)};
    service = new PaymentService(
      prisma as unknown as PrismaService,
      bookingService as unknown as BookingService,
      customerService as unknown as CustomerService,
      providerService as unknown as ProviderService,
      paymentGateway,
      config as unknown as ConfigService,
    );
  });

  describe('payment-disabled pilot', () => {
    beforeEach(() => config.get.mockReturnValue('true'));

    it('does not create online or cash payment intents', async () => {
      for (const method of [PaymentMethod.CASH, PaymentMethod.ONLINE]) {
        await expect(service.initiateAsCustomer('user-1', {
          bookingId: booking.id, method, amount: 100,
        })).rejects.toThrow('Payment collection is disabled in this pilot');
      }
      expect(bookingService.findAsCustomer).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(paymentGateway.createOrder).not.toHaveBeenCalled();
    });

    it('does not confirm old online intents', async () => {
      await expect(service.verifyAsCustomer('user-1', 'payment-1', {
        gatewayPaymentId: 'pay_1', gatewaySignature: 'sig_1',
      })).rejects.toThrow(ConflictException);
      expect(paymentGateway.verifyPayment).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('does not mark previous cash intents collected', async () => {
      await expect(service.markCashCollectedAsProvider('user-1', 'payment-1'))
        .rejects.toThrow(ConflictException);
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe('initiateAsCustomer', () => {
    it('creates an ONLINE payment via the gateway', async () => {
      prisma.payment.create.mockResolvedValue({ id: 'payment-1' });
      prisma.payment.update.mockResolvedValue({ id: 'payment-1' });

      const result = await service.initiateAsCustomer('user-1', {
        bookingId: 'booking-1',
        method: PaymentMethod.ONLINE,
        amount: 300,
      });

      expect(paymentGateway.createOrder).toHaveBeenCalledWith(
        300,
        'INR',
        'payment-1',
      );
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'booking-1',
          method: PaymentMethod.ONLINE,
          amount: 300,
          currency: 'INR',
        }),
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1', status: PaymentStatus.INITIATED, AND: [{ gatewayOrderId: null }] },
        data: { gatewayOrderId: 'stub_order_1' },
      });
      expect(result).toEqual({ id: 'payment-1' });
    });

    it('creates a CASH payment without calling the gateway', async () => {
      prisma.payment.create.mockResolvedValue({ id: 'payment-1' });

      await service.initiateAsCustomer('user-1', {
        bookingId: 'booking-1',
        method: PaymentMethod.CASH,
        amount: 300,
      });

      expect(paymentGateway.createOrder).not.toHaveBeenCalled();
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          method: PaymentMethod.CASH,
          amount: 300,
        }),
      });
    });

    it('rejects when the booking is CANCELLED', async () => {
      bookingService.findAsCustomer.mockResolvedValue({
        ...booking,
        status: BookingStatus.CANCELLED,
      });
      prisma.booking.findUnique.mockResolvedValue({
        ...booking,
        status: BookingStatus.CANCELLED,
      });

      await expect(
        service.initiateAsCustomer('user-1', {
          bookingId: 'booking-1',
          method: PaymentMethod.CASH,
          amount: 300,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('rejects when the amount exceeds the outstanding balance', async () => {
      prisma.payment.findMany.mockResolvedValue([]);

      await expect(
        service.initiateAsCustomer('user-1', {
          bookingId: 'booking-1',
          method: PaymentMethod.CASH,
          amount: 1000,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('accounts for already-committed payments when checking the outstanding balance', async () => {
      prisma.payment.findMany.mockResolvedValue([{ amount: 400 }]);

      await expect(
        service.initiateAsCustomer('user-1', {
          bookingId: 'booking-1',
          method: PaymentMethod.CASH,
          amount: 300,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses payment against an unresolved quote with no approved price', async () => {
      bookingService.findAsCustomer.mockResolvedValue({
        ...booking,
        amount: null,
        visitFee: null,
      });
      prisma.booking.findUnique.mockResolvedValue({
        ...booking,
        amount: null,
        visitFee: null,
      });
      prisma.payment.create.mockResolvedValue({ id: 'payment-1' });

      await expect(service.initiateAsCustomer('user-1', {
        bookingId: 'booking-1',
        method: PaymentMethod.CASH,
        amount: 100000,
      })).rejects.toThrow(ConflictException);

      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('concurrent payment safeguards', () => {
    const cashDto = {
      bookingId: 'booking-1', method: PaymentMethod.CASH, amount: 300,
      clientRequestId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    };

    it('reserves before checking balances using the same transaction', async () => {
      prisma.payment.create.mockResolvedValue({ id: 'pay-1' });
      await service.initiateAsCustomer('customer-user', cashDto);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1', status: { in: [PaymentStatus.INITIATED, PaymentStatus.SUCCEEDED] } },
      });
    });

    it('replays the previous response rather than creating another payment', async () => {
      prisma.payment.findFirst = jest.fn().mockResolvedValue({
        id: 'existing-1', method: PaymentMethod.CASH, amount: 300,
        status: PaymentStatus.INITIATED,
      });
      const result = await service.initiateAsCustomer('customer-user', cashDto);
      expect(result.id).toBe('existing-1');
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('blocks reuse of the same key with different amount', async () => {
      prisma.payment.findFirst = jest.fn().mockResolvedValue({
        id: 'existing-1', method: PaymentMethod.CASH, amount: 200,
      });
      await expect(service.initiateAsCustomer('customer-user', cashDto))
        .rejects.toThrow(ConflictException);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('releases the reservation if creating an external order fails', async () => {
      prisma.payment.create.mockResolvedValue({ id: 'payment-1' });
      prisma.payment.update.mockResolvedValue({ id: 'payment-1' });
      paymentGateway.createOrder.mockRejectedValue(new Error('gateway unavailable'));
      await expect(service.initiateAsCustomer('customer-user', {
        bookingId: 'booking-1', method: PaymentMethod.ONLINE, amount: 300,
      })).rejects.toThrow('gateway unavailable');
      expect(prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: PaymentStatus.FAILED }),
      }));
    });
  });

  describe('verifyAsCustomer', () => {
    const initiatedOnlinePayment = {
      id: 'payment-1',
      method: PaymentMethod.ONLINE,
      status: PaymentStatus.INITIATED,
      gatewayOrderId: 'stub_order_1',
      booking: { customerId: 'customer-1' },
      amount: 300,
      currency: 'INR',
    };

    it('marks the payment SUCCEEDED when the gateway verifies it', async () => {
      prisma.payment.findUnique.mockResolvedValue(initiatedOnlinePayment);
      prisma.payment.update.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.SUCCEEDED,
      });

      await service.verifyAsCustomer('user-1', 'payment-1', {
        gatewayPaymentId: 'pay_1',
        gatewaySignature: 'sig_1',
      });

      expect(paymentGateway.verifyPayment).toHaveBeenCalledWith(
        'stub_order_1',
        'pay_1',
        'sig_1',
        300,
        'INR',
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1', status: PaymentStatus.INITIATED },
        data: expect.objectContaining({
          status: PaymentStatus.SUCCEEDED,
          gatewayPaymentId: 'pay_1',
        }),
      });
    });

    it('preserves payment state when a forged verification fails', async () => {
      paymentGateway.verifyPayment.mockReturnValue(false);
      prisma.payment.findUnique.mockResolvedValue(initiatedOnlinePayment);
      prisma.payment.update.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.FAILED,
      });

      await expect(service.verifyAsCustomer('user-1', 'payment-1', {
        gatewayPaymentId: 'pay_1',
        gatewaySignature: 'bad_sig',
      })).rejects.toThrow(ConflictException);

      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('rejects verifying a CASH payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        ...initiatedOnlinePayment,
        method: PaymentMethod.CASH,
      });

      await expect(
        service.verifyAsCustomer('user-1', 'payment-1', {
          gatewayPaymentId: 'pay_1',
          gatewaySignature: 'sig_1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects verifying an already-SUCCEEDED payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        ...initiatedOnlinePayment,
        status: PaymentStatus.SUCCEEDED,
      });

      await expect(
        service.verifyAsCustomer('user-1', 'payment-1', {
          gatewayPaymentId: 'pay_1',
          gatewaySignature: 'sig_1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('ownership enforcement', () => {
    it("findAsCustomer throws NotFoundException for another customer's payment", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        booking: { customerId: 'someone-else' },
      });

      await expect(
        service.findAsCustomer('user-1', 'payment-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('findAsCustomer throws NotFoundException when the payment does not exist', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.findAsCustomer('user-1', 'payment-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it("findAsProvider throws NotFoundException for another provider's payment", async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        booking: { offering: { providerId: 'someone-else' } },
      });

      await expect(
        service.findAsProvider('user-1', 'payment-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markCashCollectedAsProvider', () => {
    it('marks an INITIATED CASH payment SUCCEEDED', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        method: PaymentMethod.CASH,
        status: PaymentStatus.INITIATED,
        booking: { offering: { providerId: 'provider-1' } },
      });
      prisma.payment.update.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.SUCCEEDED,
      });

      await service.markCashCollectedAsProvider('user-1', 'payment-1');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1', status: PaymentStatus.INITIATED },
        data: expect.objectContaining({ status: PaymentStatus.SUCCEEDED }),
      });
    });

    it('rejects marking an ONLINE payment collected', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        method: PaymentMethod.ONLINE,
        status: PaymentStatus.INITIATED,
        booking: { offering: { providerId: 'provider-1' } },
      });

      await expect(
        service.markCashCollectedAsProvider('user-1', 'payment-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects marking an already-SUCCEEDED payment collected', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        method: PaymentMethod.CASH,
        status: PaymentStatus.SUCCEEDED,
        booking: { offering: { providerId: 'provider-1' } },
      });

      await expect(
        service.markCashCollectedAsProvider('user-1', 'payment-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('listing', () => {
    it('listAsCustomer scopes results to the current customer and optional filters', async () => {
      prisma.payment.findMany.mockResolvedValue([]);

      await service.listAsCustomer(
        'user-1',
        PaymentStatus.SUCCEEDED,
        'booking-1',
      );

      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: {
          booking: { customerId: 'customer-1' },
          status: PaymentStatus.SUCCEEDED,
          bookingId: 'booking-1',
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('listAsProvider scopes results via the booking-offering relation', async () => {
      prisma.payment.findMany.mockResolvedValue([]);

      await service.listAsProvider('user-1', undefined, undefined);

      expect(prisma.payment.findMany).toHaveBeenCalledWith({
        where: {
          booking: { offering: { providerId: 'provider-1' } },
          status: undefined,
          bookingId: undefined,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
