import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Settlement, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../../provider/provider.service';
import { PAYOUT_GATEWAY, PayoutNotConfiguredException } from '../gateway/payout-gateway.interface';
import type { PayoutGateway } from '../gateway/payout-gateway.interface';

type SettlementWithLineItems = Settlement & {
  commissionCalculations: { id: string }[];
};

export type SettlementResponse = Omit<Settlement, 'idempotencyKey' | 'manualResolvedBy'> & {
  commissionCalculationIds: string[];
};

const WITH_LINE_ITEMS = {
  include: { commissionCalculations: { select: { id: true } } },
} as const;

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
    @Inject(PAYOUT_GATEWAY) private readonly payoutGateway: PayoutGateway,
  ) {}

  async run(providerId: string): Promise<SettlementResponse> {
    await this.providerService.findById(providerId);

    // Claim commission rows under a provider-scoped transaction lock before
    // calling an external payout rail. Concurrent requests cannot pay the
    // same calculations twice.
    const claim = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`settlement:${providerId}`}))`;

      const inFlight = await tx.settlement.findFirst({
        where: {
          providerId,
          status: { in: [SettlementStatus.PENDING, SettlementStatus.UNKNOWN] },
        },
        orderBy: { createdAt: 'desc' },
        ...WITH_LINE_ITEMS,
      });
      if (inFlight) {
        return { settlement: inFlight, shouldInitiate: false };
      }

      const unsettled = await tx.commissionCalculation.findMany({
        where: { settlementId: null, booking: { offering: { providerId } } },
        orderBy: { id: 'asc' },
      });
      if (unsettled.length === 0) {
        throw new ConflictException('Nothing to settle for this provider');
      }
      const currencies = [...new Set(unsettled.map((item) => item.currency))];
      if (currencies.length !== 1) {
        throw new ConflictException('A settlement cannot mix currencies');
      }

      const calculationIds = unsettled.map((item) => item.id);
      const totalAmount = unsettled.reduce(
        (sum, item) => sum + Number(item.providerEarningAmount),
        0,
      );
      const currency = currencies[0];
      const idempotencyKey = createHash('sha256')
        .update(providerId + ':' + calculationIds.join(','))
        .digest('hex');

      const previous = await tx.settlement.findUnique({
        where: { idempotencyKey },
        ...WITH_LINE_ITEMS,
      });
      if (previous && previous.status === SettlementStatus.PAID) {
        throw new ConflictException(
          'A previously paid settlement has unlinked commission rows; manual reconciliation is required',
        );
      }
      if (previous && previous.status !== SettlementStatus.FAILED) {
        return { settlement: previous, shouldInitiate: false };
      }

      const settlement = previous
        ? await tx.settlement.update({
            where: { id: previous.id },
            data: { status: SettlementStatus.PENDING, failureReason: null },
            ...WITH_LINE_ITEMS,
          })
        : await tx.settlement.create({
            data: {
              providerId,
              totalAmount,
              currency,
              idempotencyKey,
              status: SettlementStatus.PENDING,
            },
            ...WITH_LINE_ITEMS,
          });

      const linked = await tx.commissionCalculation.updateMany({
        where: { id: { in: calculationIds }, settlementId: null },
        data: { settlementId: settlement.id },
      });
      if (linked.count !== calculationIds.length) {
        throw new ConflictException('Commission calculations changed while claiming settlement');
      }
      const withLines = await tx.settlement.findUnique({
        where: { id: settlement.id },
        ...WITH_LINE_ITEMS,
      });
      if (!withLines) throw new NotFoundException('Settlement disappeared during claim');
      return { settlement: withLines, shouldInitiate: true };
    });

    if (!claim.shouldInitiate) return this.toResponse(claim.settlement);

    try {
      const { payoutReference } = await this.payoutGateway.initiatePayout(
        providerId,
        Number(claim.settlement.totalAmount),
        claim.settlement.currency,
        claim.settlement.idempotencyKey,
      );
      const paid = await this.prisma.settlement.update({
        where: { id: claim.settlement.id },
        data: {
          status: SettlementStatus.PAID,
          payoutReference,
          paidAt: new Date(),
          failureReason: null,
        },
        ...WITH_LINE_ITEMS,
      });
      return this.toResponse(paid);
    } catch (error) {
      // Only the disabled gateway can prove that no payout request was sent.
      // A timeout/5xx/unknown exception may have happened after submission:
      // retain the commission claim in UNKNOWN and never automatically pay it
      // again until an operator reconciles the provider outcome.
      const definitelyNotSubmitted = error instanceof PayoutNotConfiguredException;
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.settlement.update({
          where: { id: claim.settlement.id },
          data: {
            status: definitelyNotSubmitted ? SettlementStatus.FAILED : SettlementStatus.UNKNOWN,
            failureReason: error instanceof Error
              ? error.message.slice(0, 300)
              : 'Payout outcome is unknown; manual reconciliation is required',
          },
          ...WITH_LINE_ITEMS,
        });
        if (definitelyNotSubmitted) {
          await tx.commissionCalculation.updateMany({
            where: { settlementId: claim.settlement.id },
            data: { settlementId: null },
          });
        }
        return result;
      });
      return this.toResponse(updated);
    }
  }

  async resolveManual(
    id: string,
    actorUserId: string,
    outcome: 'PAID' | 'FAILED',
    note: string,
  ): Promise<SettlementResponse> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.settlement.findUnique({
        where: { id },
        ...WITH_LINE_ITEMS,
      });
      if (!current) throw new NotFoundException('Settlement not found');
      if (current.status !== SettlementStatus.UNKNOWN) {
        throw new ConflictException('Only UNKNOWN settlements can be manually resolved');
      }
      const now = new Date();
      const updated = await tx.settlement.update({
        where: { id },
        data: {
          status: outcome === 'PAID' ? SettlementStatus.PAID : SettlementStatus.FAILED,
          manualResolutionNote: note,
          manualResolvedBy: actorUserId,
          manualResolvedAt: now,
          ...(outcome === 'PAID'
            ? { paidAt: now, failureReason: null }
            : { paidAt: null, failureReason: 'Payout manually confirmed as not completed' }),
        },
        ...WITH_LINE_ITEMS,
      });
      if (outcome === 'FAILED') {
        await tx.commissionCalculation.updateMany({
          where: { settlementId: id },
          data: { settlementId: null },
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId,
          httpMethod: 'POST',
          routePath: '/api/v1/settlement/:id/resolve',
          entityId: id,
          statusCode: 200,
          ipAddress: null,
          outcome: 'SUCCESS',
        },
      });
      return this.toResponse(updated);
    });
  }

  async list(): Promise<SettlementResponse[]> {
    const settlements = await this.prisma.settlement.findMany({
      orderBy: { createdAt: 'desc' },
      ...WITH_LINE_ITEMS,
    });
    return settlements.map((settlement) => this.toResponse(settlement));
  }

  async findOne(id: string): Promise<SettlementResponse> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      ...WITH_LINE_ITEMS,
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return this.toResponse(settlement);
  }

  async listAsProvider(userId: string): Promise<SettlementResponse[]> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const settlements = await this.prisma.settlement.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      ...WITH_LINE_ITEMS,
    });
    return settlements.map((settlement) => this.toProviderResponse(settlement));
  }

  async findAsProvider(userId: string, id: string): Promise<SettlementResponse> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      ...WITH_LINE_ITEMS,
    });
    if (!settlement || settlement.providerId !== provider.id) {
      throw new NotFoundException('Settlement not found');
    }
    return this.toProviderResponse(settlement);
  }

  private toProviderResponse(settlement: SettlementWithLineItems): SettlementResponse {
    const response = this.toResponse(settlement);
    return {
      ...response,
      manualResolutionNote: null,
      manualResolvedAt: null,
    };
  }

  private toResponse(settlement: SettlementWithLineItems): SettlementResponse {
    const { commissionCalculations, idempotencyKey, manualResolvedBy, ...rest } = settlement;
    void idempotencyKey;
    void manualResolvedBy;
    return {
      ...rest,
      commissionCalculationIds: commissionCalculations.map((item) => item.id),
    };
  }
}
