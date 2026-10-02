import { Module } from '@nestjs/common';
import { BookingModule } from '../booking/booking.module';
import { CustomerModule } from '../customer/customer.module';
import { ProviderModule } from '../provider/provider.module';
import { PaymentService } from './payment.service';
import { CustomerPaymentController } from './customer/customer-payment.controller';
import { ProviderPaymentController } from './provider/provider-payment.controller';
import { PAYMENT_GATEWAY } from './gateway/payment-gateway.interface';
import { StubPaymentGateway } from './gateway/stub-payment.gateway';

@Module({
  imports: [BookingModule, CustomerModule, ProviderModule],
  controllers: [CustomerPaymentController, ProviderPaymentController],
  providers: [
    PaymentService,
    { provide: PAYMENT_GATEWAY, useClass: StubPaymentGateway },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
