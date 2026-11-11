import { ConflictException, NotFoundException } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { SettlementService } from './settlement.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProviderService } from '../../provider/provider.service';

describe('SettlementService', () => {
  let prisma: {
    commissionCalculation: { findMany: jest.Mock; updateMany: jest.Mock };
    settlement: {
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let providerService: {
    findById: jest.Mock;
    getActiveProfileOrThrow: jest.Mock;
  };
  let payoutGateway: { initiatePayout: jest.Mock };
  let service: SettlementService;

  const unsettledCalculations = [
    { id: 'calc-1', providerEarningAmount: 500, currency: 'INR' },
    { id: 'calc-2', providerEarningAmount: 300, currency: 'INR' },
  ];

  beforeEach(() => {
    prisma = {
      commissionCalculation: {
        findMany: jest.fn().mockResolvedValue(unsettledCalculations),
        updateMany: jest.fn(),
      },
      settlement: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    providerService = {
      findById: jest.fn().mockResolvedValue({ id: 'provider-1' }),
      getActiveProfileOrThrow: jest
        .fn()
        .mockResolvedValue({ id: 'provider-1' }),
    };
    payoutGateway = {
      initiatePayout: jest
        .fn()
        .mockResolvedValue({ payoutReference: 'stub_payout_1' }),
    };

    service = new SettlementService(
      prisma as unknown as PrismaService,
      providerService as unknown as ProviderService,
      payoutGateway,
    );
  });

  describe('run', () => {
    it('rejects when there is nothing unsettled for the provider', async () => {
      prisma.commissionCalculation.findMany.mockResolvedValue([]);

      await expect(service.run('provider-1')).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.settlement.create).not.toHaveBeenCalled();
    });

    it('creates a PENDING settlement, pays out, and links the calculations on success', async () => {
      prisma.settlement.create.mockResolvedValue({ id: 'settlement-1' });
      prisma.$transaction.mockResolvedValue([
        { count: 2 },
        {
          id: 'settlement-1',
          providerId: 'provider-1',
          totalAmount: 800,
          currency: 'INR',
          status: SettlementStatus.PAID,
          payoutReference: 'stub_payout_1',
          commissionCalculations: [{ id: 'calc-1' }, { id: 'calc-2' }],
        },
      ]);

      const result = await service.run('provider-1');

      expect(prisma.settlement.create).toHaveBeenCalledWith({
        data: {
          providerId: 'provider-1',
          totalAmount: 800,
          currency: 'INR',
          status: SettlementStatus.PENDING,
        },
      });
      expect(payoutGateway.initiatePayout).toHaveBeenCalledWith(
        'provider-1',
        800,
        'INR',
      );
      expect(result.status).toBe(SettlementStatus.PAID);
      expect(result.commissionCalculationIds).toEqual(['calc-1', 'calc-2']);
    });

    it('marks the settlement FAILED and leaves calculations unlinked when the gateway throws', async () => {
      payoutGateway.initiatePayout.mockRejectedValue(
        new Error('payout rail down'),
      );
      prisma.settlement.create.mockResolvedValue({ id: 'settlement-1' });
      prisma.settlement.update.mockResolvedValue({
        id: 'settlement-1',
        providerId: 'provider-1',
        totalAmount: 800,
        currency: 'INR',
        status: SettlementStatus.FAILED,
        failureReason: 'payout rail down',
        commissionCalculations: [],
      });

      const result = await service.run('provider-1');

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.settlement.update).toHaveBeenCalledWith({
        where: { id: 'settlement-1' },
        data: {
          status: SettlementStatus.FAILED,
          failureReason: 'payout rail down',
        },
        include: { commissionCalculations: { select: { id: true } } },
      });
      expect(result.status).toBe(SettlementStatus.FAILED);
      expect(result.commissionCalculationIds).toEqual([]);
    });
  });

  describe('findAsProvider', () => {
    it("throws NotFoundException for another provider's settlement", async () => {
      prisma.settlement.findUnique.mockResolvedValue({
        id: 'settlement-1',
        providerId: 'someone-else',
        commissionCalculations: [],
      });

      await expect(
        service.findAsProvider('user-1', 'settlement-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('maps commissionCalculations to commissionCalculationIds', async () => {
      prisma.settlement.findMany.mockResolvedValue([
        { id: 'settlement-1', commissionCalculations: [{ id: 'calc-1' }] },
      ]);

      const result = await service.list();

      expect(result[0].commissionCalculationIds).toEqual(['calc-1']);
      expect(
        (result[0] as { commissionCalculations?: unknown })
          .commissionCalculations,
      ).toBeUndefined();
    });
  });
});
