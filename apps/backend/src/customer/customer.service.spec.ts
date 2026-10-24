import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerStatus } from '@prisma/client';
import { CustomerService } from './customer.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('CustomerService', () => {
  let prisma: {
    customerProfile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    customerAddress: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: CustomerService;

  beforeEach(() => {
    prisma = {
      customerProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      customerAddress: { deleteMany: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    service = new CustomerService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('rejects when a profile already exists for this user', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue({ id: 'profile-1' });

      await expect(
        service.create('user-1', { fullName: 'Ananya Sharma' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.customerProfile.create).not.toHaveBeenCalled();
    });

    it('creates a profile when none exists', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue(null);
      prisma.customerProfile.create.mockResolvedValue({ id: 'profile-1' });

      await service.create('user-1', { fullName: 'Ananya Sharma' });

      expect(prisma.customerProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          fullName: 'Ananya Sharma',
          preferredLanguage: undefined,
          notificationOptIn: undefined,
        },
      });
    });
  });

  describe('getActiveProfileOrThrow', () => {
    it('throws NotFound when no profile exists', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getActiveProfileOrThrow('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFound for a soft-deleted profile', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        status: CustomerStatus.DELETED,
      });

      await expect(service.getActiveProfileOrThrow('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns an active profile', async () => {
      const profile = { id: 'profile-1', status: CustomerStatus.ACTIVE };
      prisma.customerProfile.findUnique.mockResolvedValue(profile);

      await expect(service.getActiveProfileOrThrow('user-1')).resolves.toBe(
        profile,
      );
    });
  });

  describe('softDelete', () => {
    it('deletes addresses and anonymizes the profile in one transaction', async () => {
      prisma.customerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        status: CustomerStatus.ACTIVE,
      });
      prisma.customerAddress.deleteMany.mockResolvedValue({ count: 2 });
      prisma.customerProfile.update.mockResolvedValue({});

      await service.softDelete('user-1');

      expect(prisma.customerAddress.deleteMany).toHaveBeenCalledWith({
        where: { customerId: 'profile-1' },
      });
      expect(prisma.customerProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: expect.objectContaining({
          status: CustomerStatus.DELETED,
          fullName: 'Deleted Customer',
          notificationOptIn: false,
        }),
      });
    });
  });
});
