import { ConflictException, NotFoundException } from '@nestjs/common';
import { PricingModel, ProviderStatus } from '@prisma/client';
import { OfferingService } from './offering.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ProviderService } from '../provider/provider.service';
import type { ServiceService } from '../catalogue/service/service.service';
import type { VariantService } from '../catalogue/variant/variant.service';

describe('OfferingService', () => {
  let prisma: {
    providerOffering: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let providerService: { getActiveProfileOrThrow: jest.Mock };
  let serviceService: { assertExistsOrThrow: jest.Mock };
  let variantService: { assertBelongsToService: jest.Mock };
  let service: OfferingService;

  const activeProvider = { id: 'provider-1', status: ProviderStatus.ACTIVE };

  beforeEach(() => {
    prisma = {
      providerOffering: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    providerService = {
      getActiveProfileOrThrow: jest.fn().mockResolvedValue(activeProvider),
    };
    serviceService = {
      assertExistsOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    variantService = {
      assertBelongsToService: jest.fn().mockResolvedValue(undefined),
    };
    service = new OfferingService(
      prisma as unknown as PrismaService,
      providerService as unknown as ProviderService,
      serviceService as unknown as ServiceService,
      variantService as unknown as VariantService,
    );
  });

  describe('create', () => {
    it('rejects when the provider is not ACTIVE', async () => {
      providerService.getActiveProfileOrThrow.mockResolvedValue({
        id: 'provider-1',
        status: ProviderStatus.PENDING,
      });

      await expect(
        service.create('user-1', {
          serviceId: 'svc-1',
          pricingModel: PricingModel.FIXED,
          amount: 100,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.providerOffering.create).not.toHaveBeenCalled();
    });

    it('validates the service and rejects a duplicate offering', async () => {
      prisma.providerOffering.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('user-1', {
          serviceId: 'svc-1',
          pricingModel: PricingModel.FIXED,
          amount: 100,
        }),
      ).rejects.toThrow(ConflictException);
      expect(serviceService.assertExistsOrThrow).toHaveBeenCalledWith('svc-1');
      expect(prisma.providerOffering.create).not.toHaveBeenCalled();
    });

    it('validates the variant belongs to the service when provided', async () => {
      prisma.providerOffering.findFirst.mockResolvedValue(null);
      prisma.providerOffering.create.mockResolvedValue({ id: 'offering-1' });

      await service.create('user-1', {
        serviceId: 'svc-1',
        variantId: 'var-1',
        pricingModel: PricingModel.FIXED,
        amount: 100,
      });

      expect(variantService.assertBelongsToService).toHaveBeenCalledWith(
        'svc-1',
        'var-1',
      );
      expect(prisma.providerOffering.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: 'provider-1',
          serviceId: 'svc-1',
          variantId: 'var-1',
        }),
      });
    });

    it('checks for a duplicate scoped by the null variant when none is given', async () => {
      prisma.providerOffering.findFirst.mockResolvedValue(null);
      prisma.providerOffering.create.mockResolvedValue({ id: 'offering-1' });

      await service.create('user-1', {
        serviceId: 'svc-1',
        pricingModel: PricingModel.QUOTE_BASED,
      });

      expect(prisma.providerOffering.findFirst).toHaveBeenCalledWith({
        where: {
          providerId: 'provider-1',
          serviceId: 'svc-1',
          variantId: null,
        },
      });
    });
  });

  describe('findOwn / getOwnedOfferingOrThrow', () => {
    it('404s when the offering belongs to a different provider', async () => {
      prisma.providerOffering.findUnique.mockResolvedValue({
        id: 'offering-1',
        providerId: 'someone-elses-provider',
      });

      await expect(service.findOwn('user-1', 'offering-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('404s when the offering does not exist', async () => {
      prisma.providerOffering.findUnique.mockResolvedValue(null);

      await expect(service.findOwn('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('validates a new variantId against the existing serviceId when serviceId is not also changing', async () => {
      prisma.providerOffering.findUnique.mockResolvedValue({
        id: 'offering-1',
        providerId: 'provider-1',
        serviceId: 'svc-1',
      });
      prisma.providerOffering.update.mockResolvedValue({});

      await service.update('user-1', 'offering-1', { variantId: 'var-2' });

      expect(variantService.assertBelongsToService).toHaveBeenCalledWith(
        'svc-1',
        'var-2',
      );
    });

    it('validates a new variantId against the new serviceId when both change together', async () => {
      prisma.providerOffering.findUnique.mockResolvedValue({
        id: 'offering-1',
        providerId: 'provider-1',
        serviceId: 'svc-1',
      });
      prisma.providerOffering.update.mockResolvedValue({});

      await service.update('user-1', 'offering-1', {
        serviceId: 'svc-2',
        variantId: 'var-2',
      });

      expect(variantService.assertBelongsToService).toHaveBeenCalledWith(
        'svc-2',
        'var-2',
      );
    });
  });

  describe('remove', () => {
    it('404s before deleting when not owned by the caller', async () => {
      prisma.providerOffering.findUnique.mockResolvedValue({
        id: 'offering-1',
        providerId: 'someone-elses-provider',
      });

      await expect(service.remove('user-1', 'offering-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.providerOffering.delete).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('only returns active offerings', async () => {
      prisma.providerOffering.findMany.mockResolvedValue([]);

      await service.findAll({ serviceId: 'svc-1' });

      expect(prisma.providerOffering.findMany).toHaveBeenCalledWith({
        where: { serviceId: 'svc-1', providerId: undefined, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
