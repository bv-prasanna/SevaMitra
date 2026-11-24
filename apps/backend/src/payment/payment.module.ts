import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingModule } from '../booking/booking.module';
import { CustomerModule } from '../customer/customer.module';
import { ProviderModule } from '../provider/provider.module';
import { PaymentService } from './payment.service';
import { CustomerPaymentController } from './customer/customer-payment.controller';
import { ProviderPaymentController } from './provider/provider-payment.controller';
import { PAYMENT_GATEWAY } from './gateway/payment-gateway.interface';
import { StubPaymentGateway } from './gateway/stub-payment.gateway';
import { RazorpayPaymentGateway } from './gateway/razorpay-payment.gateway';
import { DisabledPaymentGateway } from './gateway/disabled-payment.gateway';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { RazorpayWebhookService } from './razorpay-webhook.service';
import { PaymentReconciliationController } from './payment-reconciliation.controller';

@Module({
  imports: [BookingModule, CustomerModule, ProviderModule],
  controllers: [CustomerPaymentController, ProviderPaymentController, RazorpayWebhookController, PaymentReconciliationController],
  providers: [
    PaymentService,
    RazorpayWebhookService,
    {
      provide: PAYMENT_GATEWAY, inject: [ConfigService],
      useFactory:(cfg:ConfigService)=>{
        const provider=cfg.get<string>('PAYMENT_PROVIDER') ||
          (cfg.get<string>('NODE_ENV')==='development'||cfg.get<string>('NODE_ENV')==='test'?'stub':'disabled');
        if(provider==='razorpay')return new RazorpayPaymentGateway(cfg);
        if(provider==='stub' && !['production','staging'].includes(cfg.get<string>('NODE_ENV')||''))return new StubPaymentGateway();
        return new DisabledPaymentGateway();
      },
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
