import { NotFoundException } from '@nestjs/common';
import { VariantService } from './variant.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ServiceService } from '../service/service.service';

describe('VariantService', () => {
  let prisma: {
    serviceVariant: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let serviceService: { assertExistsOrThrow: jest.Mock };
  let variantService: VariantService;

  beforeEach(() => {
    prisma = {
      serviceVariant: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    serviceService = {
      assertExistsOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    variantService = new VariantService(
      prisma as unknown as PrismaService,
      serviceService as unknown as ServiceService,
    );
  });

  describe('create', () => {
    it('validates the parent service before creating', async () => {
      prisma.serviceVariant.create.mockResolvedValue({ id: 'var-1' });

      await variantService.create('svc-1', { name: '3 BHK' });

      expect(serviceService.assertExistsOrThrow).toHaveBeenCalledWith('svc-1');
      expect(prisma.serviceVariant.create).toHaveBeenCalledWith({
        data: { serviceId: 'svc-1', name: '3 BHK', description: undefined },
      });
    });
  });

  describe('list', () => {
    it('validates the parent service before listing', async () => {
      prisma.serviceVariant.findMany.mockResolvedValue([]);

      await variantService.list('svc-1');

      expect(serviceService.assertExistsOrThrow).toHaveBeenCalledWith('svc-1');
    });
  });

  describe('update', () => {
    it('404s when the variant belongs to a different service', async () => {
      prisma.serviceVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        serviceId: 'other-service',
      });

      await expect(
        variantService.update('svc-1', 'var-1', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.serviceVariant.update).not.toHaveBeenCalled();
    });

    it('404s when the variant does not exist', async () => {
      prisma.serviceVariant.findUnique.mockResolvedValue(null);

      await expect(
        variantService.update('svc-1', 'missing', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates a variant owned by the given service', async () => {
      prisma.serviceVariant.findUnique.mockResolvedValue({
        id: 'var-1',
        serviceId: 'svc-1',
      });
      prisma.serviceVariant.update.mockResolvedValue({});

      await variantService.update('svc-1', 'var-1', { name: 'New' });

      expect(prisma.serviceVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-1' },
        data: { name: 'New', description: undefined, isActive: undefined },
      });
    });
  });
});
