import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { ProviderModule } from '../provider/provider.module';
import { GeographyModule } from '../geography/geography.module';
import { BookingModule } from '../booking/booking.module';
import { PaymentModule } from '../payment/payment.module';
import { ProviderOfferingModule } from '../provider-offering/provider-offering.module';
import { CommissionRuleService } from './rule/commission-rule.service';
import { CommissionRuleController } from './rule/commission-rule.controller';
import { CommissionCalculationService } from './calculation/commission-calculation.service';
import { CommissionCalculationController } from './calculation/commission-calculation.controller';
import { ProviderCommissionController } from './calculation/provider/provider-commission.controller';

@Module({
  imports: [
    IamModule,
    CatalogueModule,
    ProviderModule,
    GeographyModule,
    BookingModule,
    PaymentModule,
    ProviderOfferingModule,
  ],
  controllers: [
    CommissionRuleController,
    CommissionCalculationController,
    ProviderCommissionController,
  ],
  providers: [CommissionRuleService, CommissionCalculationService],
})
export class CommissionModule {}
