import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Settlement, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../../provider/provider.service';
import { PAYOUT_GATEWAY } from '../gateway/payout-gateway.interface';
import type { PayoutGateway } from '../gateway/payout-gateway.interface';

type SettlementWithLineItems = Settlement & {
  commissionCalculations: { id: string }[];
};

export interface SettlementResponse extends Settlement {
  commissionCalculationIds: string[];
}

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

    const unsettled = await this.prisma.commissionCalculation.findMany({
      where: { settlementId: null, booking: { offering: { providerId } } },
    });
    if (unsettled.length === 0) {
      throw new ConflictException('Nothing to settle for this provider');
    }

    const totalAmount = unsettled.reduce(
      (sum, c) => sum + Number(c.providerEarningAmount),
      0,
    );
    const currency = unsettled[0].currency;

    const settlement = await this.prisma.settlement.create({
      data: {
        providerId,
        totalAmount,
        currency,
        status: SettlementStatus.PENDING,
      },
    });

    try {
      const { payoutReference } = await this.payoutGateway.initiatePayout(
        providerId,
        totalAmount,
        currency,
      );

      // Link the calculations FIRST — the settlement.update below re-reads
      // them via `include`, so it must run second within the transaction
      // to see the just-set settlementId.
      const [, paid] = await this.prisma.$transaction([
        this.prisma.commissionCalculation.updateMany({
          where: { id: { in: unsettled.map((c) => c.id) } },
          data: { settlementId: settlement.id },
        }),
        this.prisma.settlement.update({
          where: { id: settlement.id },
          data: {
            status: SettlementStatus.PAID,
            payoutReference,
            paidAt: new Date(),
          },
          ...WITH_LINE_ITEMS,
        }),
      ]);
      return this.toResponse(paid);
    } catch (err) {
      const failed = await this.prisma.settlement.update({
        where: { id: settlement.id },
        data: {
          status: SettlementStatus.FAILED,
          failureReason:
            err instanceof Error ? err.message : 'Unknown payout failure',
        },
        ...WITH_LINE_ITEMS,
      });
      return this.toResponse(failed);
    }
  }

  async list(): Promise<SettlementResponse[]> {
    const settlements = await this.prisma.settlement.findMany({
      orderBy: { createdAt: 'desc' },
      ...WITH_LINE_ITEMS,
    });
    return settlements.map((s) => this.toResponse(s));
  }

  async findOne(id: string): Promise<SettlementResponse> {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      ...WITH_LINE_ITEMS,
    });
    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }
    return this.toResponse(settlement);
  }

  async listAsProvider(userId: string): Promise<SettlementResponse[]> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const settlements = await this.prisma.settlement.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      ...WITH_LINE_ITEMS,
    });
    return settlements.map((s) => this.toResponse(s));
  }

  async findAsProvider(
    userId: string,
    id: string,
  ): Promise<SettlementResponse> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      ...WITH_LINE_ITEMS,
    });
    if (!settlement || settlement.providerId !== provider.id) {
      throw new NotFoundException('Settlement not found');
    }
    return this.toResponse(settlement);
  }

  private toResponse(settlement: SettlementWithLineItems): SettlementResponse {
    const { commissionCalculations, ...rest } = settlement;
    return {
      ...rest,
      commissionCalculationIds: commissionCalculations.map((c) => c.id),
    };
  }
}
