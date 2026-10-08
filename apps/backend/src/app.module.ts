import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './common/config/env.validation';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { IamModule } from './iam/iam.module';
import { CustomerModule } from './customer/customer.module';
import { ProviderModule } from './provider/provider.module';
import { OrganizationModule } from './provider-organization/organization.module';
import { TaxAssessmentModule } from './tax/tax.module';
import { AgentModule } from './agent/agent.module';
import { ProviderOnboardingModule } from './provider-onboarding/provider-onboarding.module';
import { CatalogueModule } from './catalogue/catalogue.module';
import { GeographyModule } from './geography/geography.module';
import { ServiceabilityModule } from './serviceability/serviceability.module';
import { ProviderOfferingModule } from './provider-offering/provider-offering.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingModule } from './booking/booking.module';
import { PaymentModule } from './payment/payment.module';
import { AuditModule } from './audit/audit.module';
import { NotificationModule } from './notification/notification.module';
import { CommissionModule } from './commission/commission.module';
import { SettlementModule } from './settlement/settlement.module';
import { RefundModule } from './refund/refund.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    IamModule,
    CustomerModule,
    ProviderModule,
    OrganizationModule,
    TaxAssessmentModule,
    AgentModule,
    ProviderOnboardingModule,
    CatalogueModule,
    GeographyModule,
    ServiceabilityModule,
    ProviderOfferingModule,
    AvailabilityModule,
    BookingModule,
    PaymentModule,
    AuditModule,
    NotificationModule,
    CommissionModule,
    SettlementModule,
    RefundModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
