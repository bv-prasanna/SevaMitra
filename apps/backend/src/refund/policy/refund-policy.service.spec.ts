import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommissionScopeType, RefundReason } from '@prisma/client';
import { RefundPolicyService } from './refund-policy.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CategoryService } from '../../catalogue/category/category.service';
import type { ServiceService } from '../../catalogue/service/service.service';
import type { ProviderService } from '../../provider/provider.service';
import type { TownVillageService } from '../../geography/town-village/town-village.service';

describe('RefundPolicyService', () => {
  let prisma: {
    refundPolicy: {
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
  let service: RefundPolicyService;

  beforeEach(() => {
    prisma = {
      refundPolicy: {
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

    service = new RefundPolicyService(
      prisma as unknown as PrismaService,
      categoryService as unknown as CategoryService,
      serviceService as unknown as ServiceService,
      providerService as unknown as ProviderService,
      townVillageService as unknown as TownVillageService,
    );
  });

  describe('create', () => {
    it('creates a PLATFORM policy for a given reason', async () => {
      prisma.refundPolicy.findFirst.mockResolvedValue(null);
      prisma.refundPolicy.create.mockResolvedValue({ id: 'policy-1' });

      await service.create({
        scopeType: CommissionScopeType.PLATFORM,
        reason: RefundReason.CUSTOMER_CANCELLED,
        refundPercentage: 50,
      });

      expect(prisma.refundPolicy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scopeType: CommissionScopeType.PLATFORM,
          reason: RefundReason.CUSTOMER_CANCELLED,
          refundPercentage: 50,
        }),
      });
    });

    it('allows two different reasons active at the same scope simultaneously', async () => {
      prisma.refundPolicy.findFirst.mockResolvedValue(null);
      prisma.refundPolicy.create.mockResolvedValue({ id: 'policy-2' });

      await service.create({
        scopeType: CommissionScopeType.PLATFORM,
        reason: RefundReason.PROVIDER_NO_SHOW,
        refundPercentage: 100,
      });

      expect(prisma.refundPolicy.findFirst).toHaveBeenCalledWith({
        where: {
          scopeType: CommissionScopeType.PLATFORM,
          reason: RefundReason.PROVIDER_NO_SHOW,
          isActive: true,
          id: undefined,
        },
      });
    });

    it('rejects a duplicate active policy for the same reason at the same scope', async () => {
      prisma.refundPolicy.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          scopeType: CommissionScopeType.PLATFORM,
          reason: RefundReason.CUSTOMER_CANCELLED,
          refundPercentage: 50,
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.refundPolicy.create).not.toHaveBeenCalled();
    });

    it('rejects when the referenced provider does not exist', async () => {
      providerService.findById.mockRejectedValue(
        new NotFoundException('Provider profile not found'),
      );

      await expect(
        service.create({
          scopeType: CommissionScopeType.PROVIDER,
          providerId: 'missing',
          reason: RefundReason.CUSTOMER_CANCELLED,
          refundPercentage: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates refundPercentage', async () => {
      prisma.refundPolicy.findUnique.mockResolvedValue({
        id: 'policy-1',
        scopeType: CommissionScopeType.PLATFORM,
        reason: RefundReason.CUSTOMER_CANCELLED,
        refundPercentage: 50,
        isActive: true,
      });
      prisma.refundPolicy.update.mockResolvedValue({
        id: 'policy-1',
        refundPercentage: 75,
      });

      await service.update('policy-1', { refundPercentage: 75 });

      expect(prisma.refundPolicy.update).toHaveBeenCalledWith({
        where: { id: 'policy-1' },
        data: { refundPercentage: 75, isActive: undefined },
      });
    });

    it('rejects reactivating a policy that would collide at the same (scope, reason)', async () => {
      prisma.refundPolicy.findUnique.mockResolvedValue({
        id: 'policy-1',
        scopeType: CommissionScopeType.PLATFORM,
        reason: RefundReason.CUSTOMER_CANCELLED,
        refundPercentage: 50,
        isActive: false,
      });
      prisma.refundPolicy.findFirst.mockResolvedValue({ id: 'other-active' });

      await expect(
        service.update('policy-1', { isActive: true }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for a missing policy', async () => {
      prisma.refundPolicy.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { refundPercentage: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('filters by scopeType and reason', async () => {
      prisma.refundPolicy.findMany.mockResolvedValue([]);

      await service.list(
        CommissionScopeType.SERVICE,
        RefundReason.PROVIDER_CANCELLED,
      );

      expect(prisma.refundPolicy.findMany).toHaveBeenCalledWith({
        where: {
          scopeType: CommissionScopeType.SERVICE,
          reason: RefundReason.PROVIDER_CANCELLED,
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
