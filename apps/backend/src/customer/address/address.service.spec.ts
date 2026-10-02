import { NotFoundException } from '@nestjs/common';
import { AddressService } from './address.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CustomerService } from '../customer.service';

describe('AddressService', () => {
  let prisma: {
    customerAddress: {
      count: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let customerService: { getActiveProfileOrThrow: jest.Mock };
  let service: AddressService;

  const profile = { id: 'profile-1' };

  beforeEach(() => {
    prisma = {
      customerAddress: {
        count: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    customerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(profile),
    };
    service = new AddressService(
      prisma as unknown as PrismaService,
      customerService as unknown as CustomerService,
    );
  });

  describe('create', () => {
    it('forces the first address to be default even if not requested', async () => {
      prisma.customerAddress.count.mockResolvedValue(0);
      prisma.customerAddress.create.mockResolvedValue({ id: 'addr-1' });

      await service.create('user-1', {
        line1: '221B Temple Street',
        town: 'Mysuru',
        pincode: '570001',
      });

      expect(prisma.customerAddress.updateMany).not.toHaveBeenCalled();
      expect(prisma.customerAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
        }),
      );
    });

    it('unsets the previous default when a later address is marked default', async () => {
      prisma.customerAddress.count.mockResolvedValue(1);
      prisma.customerAddress.create.mockResolvedValue({ id: 'addr-2' });

      await service.create('user-1', {
        line1: 'Second address',
        town: 'Mysuru',
        pincode: '570001',
        isDefault: true,
      });

      expect(prisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'profile-1', isDefault: true },
        data: { isDefault: false },
      });
    });

    it('leaves the existing default alone for a non-default add', async () => {
      prisma.customerAddress.count.mockResolvedValue(1);
      prisma.customerAddress.create.mockResolvedValue({ id: 'addr-2' });

      await service.create('user-1', {
        line1: 'Second address',
        town: 'Mysuru',
        pincode: '570001',
      });

      expect(prisma.customerAddress.updateMany).not.toHaveBeenCalled();
      expect(prisma.customerAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: false }),
        }),
      );
    });
  });

  describe('ownership', () => {
    it('404s on findOne for an address belonging to another customer', async () => {
      prisma.customerAddress.findUnique.mockResolvedValue({
        id: 'addr-1',
        customerId: 'someone-elses-profile',
      });

      await expect(service.findOne('user-1', 'addr-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('404s on findOne for a missing address', async () => {
      prisma.customerAddress.findUnique.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the address when owned by the caller', async () => {
      const address = { id: 'addr-1', customerId: 'profile-1' };
      prisma.customerAddress.findUnique.mockResolvedValue(address);

      await expect(service.findOne('user-1', 'addr-1')).resolves.toBe(address);
    });
  });
});
