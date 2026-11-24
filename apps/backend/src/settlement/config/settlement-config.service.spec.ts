import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommissionScopeType } from '@prisma/client';
import { SettlementConfigService } from './settlement-config.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CategoryService } from '../../catalogue/category/category.service';
import type { ServiceService } from '../../catalogue/service/service.service';
import type { ProviderService } from '../../provider/provider.service';
import type { TownVillageService } from '../../geography/town-village/town-village.service';

describe('SettlementConfigService', () => {
  let prisma: {
    settlementConfig: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let categoryService: { assertExistsOrThrow: jest.Mock };
  let serviceService: { assertExistsOrThrow: jest.Mock };
  let providerService: { findById: jest.Mock };
  let townVillageService: { findByIdOrThrow: jest.Mock };
  let service: SettlementConfigService;

  beforeEach(() => {
    prisma = {
      settlementConfig: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    categoryService = {
      assertExistsOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    serviceService = {
      assertExistsOrThrow: jest.fn().mockResolvedValue(undefined),
    };
    providerService = {
      findById: jest.fn().mockResolvedValue({ id: 'provider-1' }),
    };
    townVillageService = {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'town-1' }),
    };

    service = new SettlementConfigService(
      prisma as unknown as PrismaService,
      categoryService as unknown as CategoryService,
      serviceService as unknown as ServiceService,
      providerService as unknown as ProviderService,
      townVillageService as unknown as TownVillageService,
    );
  });

  describe('create', () => {
    it('creates a PLATFORM config with no referenced entity', async () => {
      prisma.settlementConfig.findFirst.mockResolvedValue(null);
      prisma.settlementConfig.create.mockResolvedValue({ id: 'config-1' });

      await service.create({
        scopeType: CommissionScopeType.PLATFORM,
        cycleDays: 7,
      });

      expect(prisma.settlementConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scopeType: CommissionScopeType.PLATFORM,
          cycleDays: 7,
        }),
      });
    });

    it('rejects when the referenced provider does not exist', async () => {
      providerService.findById.mockRejectedValue(
        new NotFoundException('Provider profile not found'),
      );

      await expect(
        service.create({
          scopeType: CommissionScopeType.PROVIDER,
          providerId: 'missing',
          cycleDays: 7,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.settlementConfig.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate active config at the same scope', async () => {
      prisma.settlementConfig.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          scopeType: CommissionScopeType.CATEGORY,
          categoryId: 'category-1',
          cycleDays: 30,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.settlementConfig.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates cycleDays', async () => {
      prisma.settlementConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        scopeType: CommissionScopeType.PLATFORM,
        cycleDays: 7,
        isActive: true,
      });
      prisma.settlementConfig.update.mockResolvedValue({
        id: 'config-1',
        cycleDays: 14,
      });

      await service.update('config-1', { cycleDays: 14 });

      expect(prisma.settlementConfig.update).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: { cycleDays: 14, isActive: undefined },
      });
    });

    it('rejects reactivating a config that would collide with another active config at the same scope', async () => {
      prisma.settlementConfig.findUnique.mockResolvedValue({
        id: 'config-1',
        scopeType: CommissionScopeType.PLATFORM,
        cycleDays: 7,
        isActive: false,
      });
      prisma.settlementConfig.findFirst.mockResolvedValue({
        id: 'other-active',
      });

      await expect(
        service.update('config-1', { isActive: true }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.settlementConfig.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a missing config', async () => {
      prisma.settlementConfig.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { cycleDays: 7 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('list/findOne', () => {
    it('lists filtered by scopeType', async () => {
      prisma.settlementConfig.findMany.mockResolvedValue([]);

      await service.list(CommissionScopeType.PROVIDER);

      expect(prisma.settlementConfig.findMany).toHaveBeenCalledWith({
        where: { scopeType: CommissionScopeType.PROVIDER },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('throws NotFoundException when the config does not exist', async () => {
      prisma.settlementConfig.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
