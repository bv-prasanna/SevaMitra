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
  OrganizationStatus,
  Prisma,
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
  stateId?:string;
  providerCompanyId?:string;
  providerGroupId?:string;
}

const PRECEDENCE: {
  scopeType: CommissionScopeType;
  field: keyof ResolvedScope | null;
}[] = [
  { scopeType: CommissionScopeType.PROVIDER, field: 'providerId' },
  { scopeType: CommissionScopeType.PROVIDER_GROUP, field: 'providerGroupId' },
  { scopeType: CommissionScopeType.PROVIDER_COMPANY, field: 'providerCompanyId' },
  { scopeType: CommissionScopeType.SERVICE, field: 'serviceId' },
  { scopeType: CommissionScopeType.CATEGORY, field: 'categoryId' },
  { scopeType: CommissionScopeType.GEOGRAPHY, field: 'townVillageId' },
  { scopeType: CommissionScopeType.STATE, field: 'stateId' },
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

    const [membership, town] = await Promise.all([
      this.prisma.providerMembership.findUnique({
        where: {providerId: offering.providerId}, include: {company: true},
      }),
      this.prisma.townVillage.findUnique({
        where: {id: booking.townVillageId},
        include: {taluk: {include: {district: true}}},
      }),
    ]);
    const organizationActive = membership?.status === OrganizationStatus.ACTIVE &&
      membership.company.status === OrganizationStatus.ACTIVE;
    const bookingAsOf = booking.createdAt ?? new Date();
    const rule = await this.resolveApplicableRule({
      providerId: offering.providerId,
      serviceId: offering.serviceId,
      categoryId: service.categoryId,
      townVillageId: booking.townVillageId,
      stateId: town?.taluk.district.stateId,
      providerCompanyId: organizationActive ? membership.companyId : undefined,
      providerGroupId: organizationActive ? membership.groupId ?? undefined : undefined,
    }, bookingAsOf);

    const grossAmount = await this.paymentService.sumSucceededAmount(bookingId);
    const commissionAmount = this.computeCommissionAmount(rule, grossAmount);
    const providerEarningAmount = grossAmount - commissionAmount;

    return this.prisma.commissionCalculation.create({
      data: {
        bookingId,
        appliedRuleId: rule.id,
        appliedRuleSnapshot: {
          ruleId: rule.id, scopeType: rule.scopeType,
          commissionType: rule.commissionType,
          percentage: rule.percentage?.toString() ?? null,
          fixedAmount: rule.fixedAmount?.toString() ?? null,
          effectiveFrom: rule.effectiveFrom?.toISOString() ?? null,
          version: rule.version ?? 1,
          bookingAsOf: bookingAsOf.toISOString(),
        },
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
    asOf: Date,
  ): Promise<CommissionRule> {
    for (const { scopeType, field } of PRECEDENCE) {
      if (field && !scope[field]) continue;
      const rule = await this.prisma.commissionRule.findFirst({
        where: {
          scopeType,
          isActive: true,
          effectiveFrom: {lte: asOf},
          OR: [{effectiveTo: null}, {effectiveTo: {gt: asOf}}],
          ...(field ? { [field]: scope[field] } : {}),
        },
        orderBy: [{version: 'desc'}, {createdAt: 'desc'}],
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
  private computeCommissionAmount(rule: CommissionRule,grossAmount:number):number{
    // Decimal arithmetic avoids binary floating-point leakage into ledgers.
    const gross=new Prisma.Decimal(grossAmount.toFixed(2));
    if(gross.lte(0))return 0;
    if(rule.commissionType===CommissionType.PERCENTAGE){
      const percentage=new Prisma.Decimal(rule.percentage ?? 0);
      return Prisma.Decimal.min(gross,Prisma.Decimal.max(0,gross.mul(percentage).div(100))).toDecimalPlaces(2).toNumber();
    }
    return Prisma.Decimal.min(gross,Prisma.Decimal.max(0,new Prisma.Decimal(rule.fixedAmount ?? 0))).toDecimalPlaces(2).toNumber();
  }

}
