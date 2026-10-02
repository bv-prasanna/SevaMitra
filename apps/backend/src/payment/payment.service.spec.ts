import { ConflictException, NotFoundException } from '@nestjs/common';
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
    payment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let bookingService: { findAsCustomer: jest.Mock; findAsProvider: jest.Mock };
  let customerService: { getActiveProfileOrThrow: jest.Mock };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let paymentGateway: { createOrder: jest.Mock; verifyPayment: jest.Mock };
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
      payment: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
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

    service = new PaymentService(
      prisma as unknown as PrismaService,
      bookingService as unknown as BookingService,
      customerService as unknown as CustomerService,
      providerService as unknown as ProviderService,
      paymentGateway,
    );
  });

  describe('initiateAsCustomer', () => {
    it('creates an ONLINE payment via the gateway', async () => {
      prisma.payment.create.mockResolvedValue({ id: 'payment-1' });

      const result = await service.initiateAsCustomer('user-1', {
        bookingId: 'booking-1',
        method: PaymentMethod.ONLINE,
        amount: 300,
      });

      expect(paymentGateway.createOrder).toHaveBeenCalledWith(
        300,
        'INR',
        'booking-1',
      );
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'booking-1',
          method: PaymentMethod.ONLINE,
          amount: 300,
          currency: 'INR',
          gatewayOrderId: 'stub_order_1',
        }),
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

    it('skips the balance check for a booking with no fixed price yet', async () => {
      bookingService.findAsCustomer.mockResolvedValue({
        ...booking,
        amount: null,
        visitFee: null,
      });
      prisma.payment.create.mockResolvedValue({ id: 'payment-1' });

      await service.initiateAsCustomer('user-1', {
        bookingId: 'booking-1',
        method: PaymentMethod.CASH,
        amount: 100000,
      });

      expect(prisma.payment.create).toHaveBeenCalled();
    });
  });

  describe('verifyAsCustomer', () => {
    const initiatedOnlinePayment = {
      id: 'payment-1',
      method: PaymentMethod.ONLINE,
      status: PaymentStatus.INITIATED,
      gatewayOrderId: 'stub_order_1',
      booking: { customerId: 'customer-1' },
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
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: expect.objectContaining({
          status: PaymentStatus.SUCCEEDED,
          gatewayPaymentId: 'pay_1',
        }),
      });
    });

    it('marks the payment FAILED when the gateway rejects it', async () => {
      paymentGateway.verifyPayment.mockReturnValue(false);
      prisma.payment.findUnique.mockResolvedValue(initiatedOnlinePayment);
      prisma.payment.update.mockResolvedValue({
        id: 'payment-1',
        status: PaymentStatus.FAILED,
      });

      await service.verifyAsCustomer('user-1', 'payment-1', {
        gatewayPaymentId: 'pay_1',
        gatewaySignature: 'bad_sig',
      });

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: expect.objectContaining({ status: PaymentStatus.FAILED }),
      });
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
        where: { id: 'payment-1' },
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
