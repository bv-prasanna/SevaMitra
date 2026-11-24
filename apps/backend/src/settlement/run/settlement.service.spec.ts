import { ConflictException, NotFoundException } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { SettlementService } from './settlement.service';
import { PayoutNotConfiguredException } from '../gateway/payout-gateway.interface';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProviderService } from '../../provider/provider.service';

describe('SettlementService', () => {
  let prisma: {
    settlement: { update: jest.Mock; updateMany: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    $executeRaw: jest.Mock;
    commissionCalculation: { findMany: jest.Mock; updateMany: jest.Mock };
    settlement: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
    auditLog: { create: jest.Mock };
  };
  let providerService: { findById: jest.Mock; getActiveProfileOrThrow: jest.Mock };
  let payoutGateway: { initiatePayout: jest.Mock };
  let service: SettlementService;

  const unsettled = [
    { id: 'calc-1', providerEarningAmount: 500, currency: 'INR' },
    { id: 'calc-2', providerEarningAmount: 300, currency: 'INR' },
  ];
  const claimed = {
    id: 'settlement-1', providerId: 'provider-1', totalAmount: 800,
    currency: 'INR', status: SettlementStatus.PENDING,
    idempotencyKey: 'a'.repeat(64), commissionCalculations: [{ id: 'calc-1' }, { id: 'calc-2' }], updatedAt: new Date(),
  };

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn(),
      commissionCalculation: {
        findMany: jest.fn().mockResolvedValue(unsettled),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      settlement: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(claimed),
        update: jest.fn().mockResolvedValue(claimed),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    prisma = {
      settlement: {
        update: jest.fn().mockResolvedValue({
          ...claimed, status: SettlementStatus.PAID, payoutReference: 'payout-idem-1',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({
          ...claimed, status: SettlementStatus.PAID, payoutReference: 'payout-idem-1',
        }),
      },
      $transaction: jest.fn(async (callback: (client: unknown) => unknown) => callback(tx)),
    };
    providerService = {
      findById: jest.fn().mockResolvedValue({ id: 'provider-1' }),
      getActiveProfileOrThrow: jest.fn().mockResolvedValue({ id: 'provider-1' }),
    };
    payoutGateway = {
      initiatePayout: jest.fn().mockResolvedValue({ payoutReference: 'payout-idem-1' }),
    };
    service = new SettlementService(
      prisma as unknown as PrismaService,
      providerService as unknown as ProviderService,
      payoutGateway as never,
    );
  });

  describe('run', () => {
    it('claims commission rows under a provider lock and sends a stable idempotency key', async () => {
      tx.settlement.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(claimed);

      const result = await service.run('provider-1');

      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(tx.commissionCalculation.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['calc-1', 'calc-2'] }, settlementId: null },
        data: { settlementId: 'settlement-1' },
      });
      expect(payoutGateway.initiatePayout).toHaveBeenCalledWith(
        'provider-1', 800, 'INR', expect.stringMatching(/^[a-f0-9]{64}$/),
      );
      expect(result.status).toBe(SettlementStatus.PAID);
      expect(result).not.toHaveProperty('idempotencyKey');
      expect(result.commissionCalculationIds).toEqual(['calc-1', 'calc-2']);
    });

    it('rejects mixed-currency commission rows before creating a settlement', async () => {
      tx.commissionCalculation.findMany.mockResolvedValue([
        ...unsettled, { id: 'calc-3', providerEarningAmount: 20, currency: 'USD' },
      ]);
      await expect(service.run('provider-1')).rejects.toThrow(ConflictException);
      expect(tx.settlement.create).not.toHaveBeenCalled();
      expect(payoutGateway.initiatePayout).not.toHaveBeenCalled();
    });

    it('does not initiate a second payout while a settlement is PENDING', async () => {
      tx.settlement.findFirst.mockResolvedValue(claimed);
      await expect(service.run('provider-1')).resolves.toMatchObject({
        id: 'settlement-1', status: SettlementStatus.PENDING,
      });
      expect(payoutGateway.initiatePayout).not.toHaveBeenCalled();
      expect(tx.commissionCalculation.findMany).not.toHaveBeenCalled();
    });

    it('moves a stale PENDING payout to UNKNOWN instead of initiating a second transfer', async () => {
      tx.settlement.findFirst.mockResolvedValue({
        ...claimed, status: SettlementStatus.PENDING,
        updatedAt: new Date(Date.now() - 6 * 60_000),
      });
      tx.settlement.update.mockResolvedValue({
        ...claimed, status: SettlementStatus.UNKNOWN,
      });

      const result = await service.run('provider-1');

      expect(result.status).toBe(SettlementStatus.UNKNOWN);
      expect(payoutGateway.initiatePayout).not.toHaveBeenCalled();
    });

    it('does not retry a payout with an UNKNOWN external outcome', async () => {
      const unknown = { ...claimed, status: SettlementStatus.UNKNOWN };
      tx.settlement.findFirst.mockResolvedValue(unknown);
      await expect(service.run('provider-1')).resolves.toMatchObject({
        status: SettlementStatus.UNKNOWN,
      });
      expect(payoutGateway.initiatePayout).not.toHaveBeenCalled();
    });

    it('releases commission rows only when the gateway proves no payout was submitted', async () => {
      payoutGateway.initiatePayout.mockRejectedValue(new PayoutNotConfiguredException());
      tx.settlement.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(claimed).mockResolvedValueOnce({
        ...claimed, status: SettlementStatus.FAILED, commissionCalculations: [],
      });

      const result = await service.run('provider-1');

      expect(result.status).toBe(SettlementStatus.FAILED);
      expect(tx.settlement.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'settlement-1', status: SettlementStatus.PENDING },
      }));
      expect(tx.commissionCalculation.updateMany).toHaveBeenLastCalledWith({
        where: { settlementId: 'settlement-1' },
        data: { settlementId: null },
      });
    });

    it('keeps commission rows claimed when the payout outcome is unknown', async () => {
      payoutGateway.initiatePayout.mockRejectedValue(new Error('network timeout'));
      tx.settlement.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(claimed).mockResolvedValueOnce({
        ...claimed, status: SettlementStatus.UNKNOWN,
      });

      const result = await service.run('provider-1');

      expect(result.status).toBe(SettlementStatus.UNKNOWN);
      expect(tx.commissionCalculation.updateMany).toHaveBeenCalledTimes(1);
    });

    it('rejects when there is nothing unsettled for the provider', async () => {
      tx.commissionCalculation.findMany.mockResolvedValue([]);
      await expect(service.run('provider-1')).rejects.toThrow(ConflictException);
      expect(tx.settlement.create).not.toHaveBeenCalled();
    });
  });

  describe('resolveManual', () => {
    it('audits a manual failed resolution and releases the claimed calculations', async () => {
      tx.settlement.findUnique.mockResolvedValue({
        ...claimed, status: SettlementStatus.UNKNOWN,
      });
      tx.settlement.update.mockResolvedValue({
        ...claimed, status: SettlementStatus.FAILED,
        manualResolutionNote: 'Provider confirmed no transfer was made',
      });

      const result = await service.resolveManual(
        'settlement-1', 'admin-1', 'FAILED',
        'Provider confirmed no transfer was made',
      );

      expect(result.status).toBe(SettlementStatus.FAILED);
      expect(tx.commissionCalculation.updateMany).toHaveBeenCalledWith({
        where: { settlementId: 'settlement-1' },
        data: { settlementId: null },
      });
      expect(tx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: 'admin-1', entityId: 'settlement-1',
          routePath: '/api/v1/settlement/:id/resolve',
        }),
      });
    });

    it('keeps commission rows linked when an unknown payout is manually confirmed paid', async () => {
      tx.settlement.findUnique.mockResolvedValue({
        ...claimed, status: SettlementStatus.UNKNOWN,
      });
      tx.settlement.update.mockResolvedValue({
        ...claimed, status: SettlementStatus.PAID,
      });

      await service.resolveManual('settlement-1', 'admin-1', 'PAID', 'Bank statement matched');

      expect(tx.commissionCalculation.updateMany).not.toHaveBeenCalled();
      expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('does not allow manual resolution of non-UNKNOWN settlements', async () => {
      tx.settlement.findUnique.mockResolvedValue(claimed);
      await expect(service.resolveManual(
        'settlement-1', 'admin-1', 'PAID', 'Checked',
      )).rejects.toThrow(ConflictException);
      expect(tx.auditLog.create).not.toHaveBeenCalled();
    });

    it('returns not found for an unknown settlement id', async () => {
      tx.settlement.findUnique.mockResolvedValue(null);
      await expect(service.resolveManual(
        'missing', 'admin-1', 'FAILED', 'Checked',
      )).rejects.toThrow(NotFoundException);
    });
  });

  describe('provider response privacy', () => {
    it('omits payout idempotency keys and internal resolution evidence', async () => {
      prisma.settlement.findMany.mockResolvedValue([{
        ...claimed,
        manualResolutionNote: 'internal finance evidence',
        manualResolvedBy: 'admin-1',
        manualResolvedAt: new Date(),
      }]);
      const result = await service.listAsProvider('user-1');
      expect(result[0].manualResolutionNote).toBeNull();
      expect(result[0].manualResolvedAt).toBeNull();
      expect(result[0]).not.toHaveProperty('manualResolvedBy');
      expect(result[0]).not.toHaveProperty('idempotencyKey');
    });
  });

  describe('findAsProvider', () => {
    it("throws NotFoundException for another provider's settlement", async () => {
      prisma.settlement.findUnique.mockResolvedValue({
        id: 'settlement-1', providerId: 'someone-else', commissionCalculations: [],
      });
      await expect(service.findAsProvider('user-1', 'settlement-1'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('list', () => {
    it('maps commissionCalculations to commissionCalculationIds', async () => {
      prisma.settlement.findMany.mockResolvedValue([
        { id: 'settlement-1', commissionCalculations: [{ id: 'calc-1' }] },
      ]);
      const result = await service.list();
      expect(result[0].commissionCalculationIds).toEqual(['calc-1']);
      expect((result[0] as { commissionCalculations?: unknown }).commissionCalculations)
        .toBeUndefined();
    });
  });
});
