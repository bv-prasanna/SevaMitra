import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BookingStatus,
  CommissionCalculation,
  CommissionRule,
  CommissionScopeType,
  CommissionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingService } from '../../booking/booking.service';
import { PaymentService } from '../../payment/payment.service';
import { OfferingService } from '../../provider-offering/offering.service';
import { ServiceService } from '../../catalogue/service/service.service';
import { ProviderService } from '../../provider/provider.service';

interface ResolvedScope {
  providerId: string;
  serviceId: string;
  categoryId: string;
  townVillageId: string;
}

const PRECEDENCE: {
  scopeType: CommissionScopeType;
  field: keyof ResolvedScope | null;
}[] = [
  { scopeType: CommissionScopeType.PROVIDER, field: 'providerId' },
  { scopeType: CommissionScopeType.SERVICE, field: 'serviceId' },
  { scopeType: CommissionScopeType.CATEGORY, field: 'categoryId' },
  { scopeType: CommissionScopeType.GEOGRAPHY, field: 'townVillageId' },
  { scopeType: CommissionScopeType.PLATFORM, field: null },
];

@Injectable()
export class CommissionCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingService: BookingService,
    private readonly paymentService: PaymentService,
    private readonly offeringService: OfferingService,
    private readonly serviceService: ServiceService,
    private readonly providerService: ProviderService,
  ) {}

  async calculate(bookingId: string): Promise<CommissionCalculation> {
    const booking = await this.bookingService.findByIdOrThrow(bookingId);
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ConflictException(
        'Commission can only be calculated for a COMPLETED booking',
      );
    }

    const existing = await this.prisma.commissionCalculation.findUnique({
      where: { bookingId },
    });
    if (existing) {
      throw new ConflictException(
        'Commission has already been calculated for this booking',
      );
    }

    const offering = await this.offeringService.findOneActive(
      booking.offeringId,
    );
    const service = await this.serviceService.findOne(offering.serviceId);

    const rule = await this.resolveApplicableRule({
      providerId: offering.providerId,
      serviceId: offering.serviceId,
      categoryId: service.categoryId,
      townVillageId: booking.townVillageId,
    });

    const grossAmount = await this.paymentService.sumSucceededAmount(bookingId);
    const commissionAmount = this.computeCommissionAmount(rule, grossAmount);
    const providerEarningAmount = grossAmount - commissionAmount;

    return this.prisma.commissionCalculation.create({
      data: {
        bookingId,
        appliedRuleId: rule.id,
        grossAmount,
        commissionAmount,
        providerEarningAmount,
        currency: booking.currency,
      },
    });
  }

  list(): Promise<CommissionCalculation[]> {
    return this.prisma.commissionCalculation.findMany({
      orderBy: { calculatedAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<CommissionCalculation> {
    const calculation = await this.prisma.commissionCalculation.findUnique({
      where: { id },
    });
    if (!calculation) {
      throw new NotFoundException('Commission calculation not found');
    }
    return calculation;
  }

  async listAsProvider(userId: string): Promise<CommissionCalculation[]> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.prisma.commissionCalculation.findMany({
      where: { booking: { offering: { providerId: provider.id } } },
      orderBy: { calculatedAt: 'desc' },
    });
  }

  async findAsProvider(
    userId: string,
    id: string,
  ): Promise<CommissionCalculation> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const calculation = await this.prisma.commissionCalculation.findUnique({
      where: { id },
      include: { booking: { include: { offering: true } } },
    });
    if (
      !calculation ||
      calculation.booking.offering.providerId !== provider.id
    ) {
      throw new NotFoundException('Commission calculation not found');
    }
    return calculation;
  }

  /**
   * Most-specific-wins, in a fixed order: a provider's personally
   * negotiated rate overrides a service rate, which overrides its
   * category's rate, which overrides a geography rate, which falls back
   * to the platform default. See docs/modules/COMMISSION_IMPLEMENTATION.md
   * §1 for why this order was chosen — BRD §18.2 requires *a* defined
   * precedence but does not specify one.
   */
  private async resolveApplicableRule(
    scope: ResolvedScope,
  ): Promise<CommissionRule> {
    for (const { scopeType, field } of PRECEDENCE) {
      const rule = await this.prisma.commissionRule.findFirst({
        where: {
          scopeType,
          isActive: true,
          ...(field ? { [field]: scope[field] } : {}),
        },
      });
      if (rule) {
        return rule;
      }
    }
    throw new ConflictException(
      'No commission rule applies to this booking and no PLATFORM default is configured',
    );
  }

  /**
   * A FIXED_AMOUNT commission is capped at the gross amount actually
   * collected — commission can never exceed what was paid, which would
   * otherwise leave a negative provider earning.
   */
  private computeCommissionAmount(
    rule: CommissionRule,
    grossAmount: number,
  ): number {
    if (rule.commissionType === CommissionType.PERCENTAGE) {
      return (
        Math.round(grossAmount * (Number(rule.percentage) / 100) * 100) / 100
      );
    }
    return Math.min(Number(rule.fixedAmount), grossAmount);
  }
}
