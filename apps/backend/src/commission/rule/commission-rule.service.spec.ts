import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommissionScopeType, CommissionType } from '@prisma/client';
import { CommissionRuleService } from './commission-rule.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CategoryService } from '../../catalogue/category/category.service';
import type { ServiceService } from '../../catalogue/service/service.service';
import type { ProviderService } from '../../provider/provider.service';
import type { TownVillageService } from '../../geography/town-village/town-village.service';

describe('CommissionRuleService', () => {
  let prisma: {
    commissionRule: {
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
  let service: CommissionRuleService;

  beforeEach(() => {
    prisma = {
      commissionRule: {
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

    service = new CommissionRuleService(
      prisma as unknown as PrismaService,
      categoryService as unknown as CategoryService,
      serviceService as unknown as ServiceService,
      providerService as unknown as ProviderService,
      townVillageService as unknown as TownVillageService,
    );
  });

  describe('create', () => {
    it('creates a PLATFORM rule with no referenced entity', async () => {
      prisma.commissionRule.findFirst.mockResolvedValue(null);
      prisma.commissionRule.create.mockResolvedValue({ id: 'rule-1' });

      await service.create({
        scopeType: CommissionScopeType.PLATFORM,
        commissionType: CommissionType.PERCENTAGE,
        percentage: 15,
      });

      expect(prisma.commissionRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scopeType: CommissionScopeType.PLATFORM,
          percentage: 15,
        }),
      });
    });

    it('validates the referenced service exists for a SERVICE-scoped rule', async () => {
      prisma.commissionRule.findFirst.mockResolvedValue(null);
      prisma.commissionRule.create.mockResolvedValue({ id: 'rule-1' });

      await service.create({
        scopeType: CommissionScopeType.SERVICE,
        serviceId: 'service-1',
        commissionType: CommissionType.PERCENTAGE,
        percentage: 10,
      });

      expect(serviceService.assertExistsOrThrow).toHaveBeenCalledWith(
        'service-1',
      );
    });

    it('rejects when the referenced provider does not exist', async () => {
      providerService.findById.mockRejectedValue(
        new NotFoundException('Provider profile not found'),
      );

      await expect(
        service.create({
          scopeType: CommissionScopeType.PROVIDER,
          providerId: 'missing',
          commissionType: CommissionType.PERCENTAGE,
          percentage: 10,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.commissionRule.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate active rule at the same scope', async () => {
      prisma.commissionRule.findFirst.mockResolvedValue({
        id: 'existing-rule',
      });

      await expect(
        service.create({
          scopeType: CommissionScopeType.CATEGORY,
          categoryId: 'category-1',
          commissionType: CommissionType.PERCENTAGE,
          percentage: 10,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.commissionRule.create).not.toHaveBeenCalled();
    });

    it('allows a second rule at the same scope once the first is inactive', async () => {
      prisma.commissionRule.findFirst.mockResolvedValue(null);
      prisma.commissionRule.create.mockResolvedValue({ id: 'rule-2' });

      await service.create({
        scopeType: CommissionScopeType.CATEGORY,
        categoryId: 'category-1',
        commissionType: CommissionType.PERCENTAGE,
        percentage: 10,
      });

      expect(prisma.commissionRule.findFirst).toHaveBeenCalledWith({
        where: {
          scopeType: CommissionScopeType.CATEGORY,
          isActive: true,
          id: undefined,
          categoryId: 'category-1',
        },
      });
    });
  });

  describe('update', () => {
    const percentageRule = {
      id: 'rule-1',
      scopeType: CommissionScopeType.PLATFORM,
      commissionType: CommissionType.PERCENTAGE,
      percentage: 15,
      fixedAmount: null,
      isActive: true,
    };

    it('rejects setting percentage on a FIXED_AMOUNT rule', async () => {
      prisma.commissionRule.findUnique.mockResolvedValue({
        ...percentageRule,
        commissionType: CommissionType.FIXED_AMOUNT,
      });

      await expect(
        service.update('rule-1', { percentage: 20 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.commissionRule.update).not.toHaveBeenCalled();
    });

    it('rejects setting fixedAmount on a PERCENTAGE rule', async () => {
      prisma.commissionRule.findUnique.mockResolvedValue(percentageRule);

      await expect(
        service.update('rule-1', { fixedAmount: 50 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.commissionRule.update).not.toHaveBeenCalled();
    });

    it('updates the rate on a matching rule', async () => {
      prisma.commissionRule.findUnique.mockResolvedValue(percentageRule);
      prisma.commissionRule.update.mockResolvedValue({
        ...percentageRule,
        percentage: 20,
      });

      await service.update('rule-1', { percentage: 20 });

      expect(prisma.commissionRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: { percentage: 20, fixedAmount: undefined, isActive: undefined },
      });
    });

    it('rejects reactivating a rule that would collide with another active rule at the same scope', async () => {
      prisma.commissionRule.findUnique.mockResolvedValue({
        ...percentageRule,
        isActive: false,
      });
      prisma.commissionRule.findFirst.mockResolvedValue({
        id: 'other-active-rule',
      });

      await expect(
        service.update('rule-1', { isActive: true }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.commissionRule.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a missing rule', async () => {
      prisma.commissionRule.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list/findOne', () => {
    it('lists filtered by scopeType', async () => {
      prisma.commissionRule.findMany.mockResolvedValue([]);

      await service.list(CommissionScopeType.SERVICE);

      expect(prisma.commissionRule.findMany).toHaveBeenCalledWith({
        where: { scopeType: CommissionScopeType.SERVICE },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('throws NotFoundException when the rule does not exist', async () => {
      prisma.commissionRule.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
