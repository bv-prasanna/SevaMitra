import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { ProviderModule } from '../provider/provider.module';
import { ProviderOfferingModule } from '../provider-offering/provider-offering.module';
import { GeographyModule } from '../geography/geography.module';
import { ServiceabilityModule } from '../serviceability/serviceability.module';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingService } from './booking.service';
import { RuntimeFlagsModule } from '../runtime-flags/runtime-flags.module';
import { CustomerBookingController } from './customer/customer-booking.controller';
import { ProviderBookingController } from './provider/provider-booking.controller';

@Module({
  imports: [
    CustomerModule,
    ProviderModule,
    ProviderOfferingModule,
    GeographyModule,
    ServiceabilityModule,
    AvailabilityModule,
    RuntimeFlagsModule,
  ],
  controllers: [CustomerBookingController, ProviderBookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
