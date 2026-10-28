import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IamModule } from '../iam/iam.module';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { ProviderModule } from '../provider/provider.module';
import { GeographyModule } from '../geography/geography.module';
import { CustomerModule } from '../customer/customer.module';
import { BookingModule } from '../booking/booking.module';
import { PaymentModule } from '../payment/payment.module';
import { ProviderOfferingModule } from '../provider-offering/provider-offering.module';
import { RefundPolicyService } from './policy/refund-policy.service';
import { RefundPolicyController } from './policy/refund-policy.controller';
import { RefundService } from './process/refund.service';
import { RefundController } from './process/refund.controller';
import { CustomerRefundController } from './process/customer/customer-refund.controller';
import { REFUND_GATEWAY } from './gateway/refund-gateway.interface';
import { StubRefundGateway } from './gateway/stub-refund.gateway';
import { DisabledRefundGateway } from './gateway/disabled-refund.gateway';

@Module({
  imports: [
    IamModule,
    CatalogueModule,
    ProviderModule,
    GeographyModule,
    CustomerModule,
    BookingModule,
    PaymentModule,
    ProviderOfferingModule,
  ],
  controllers: [
    // RefundPolicyController (/refund/policies) and CustomerRefundController
    // (/refund/me) must be registered before RefundController, whose
    // GET /refund/:id would otherwise swallow "policies" and "me" as an
    // :id — same reasoning as settlement.module.ts.
    RefundPolicyController,
    CustomerRefundController,
    RefundController,
  ],
  providers: [
    RefundPolicyService,
    RefundService,
    {
      provide: REFUND_GATEWAY, inject:[ConfigService],
      useFactory:(cfg:ConfigService)=>{
        const provider=cfg.get<string>('REFUND_PROVIDER');
        return (provider==='stub' || (!provider&&['development','test'].includes(cfg.get<string>('NODE_ENV')||''))) &&
          !['production','staging'].includes(cfg.get<string>('NODE_ENV')||'')
          ? new StubRefundGateway():new DisabledRefundGateway();
      },
    },
  ],
})
export class RefundModule {}
