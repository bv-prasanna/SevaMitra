import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { ScheduleController } from './schedule/schedule.controller';
import { ScheduleService } from './schedule/schedule.service';
import { WorkingHoursController } from './working-hours/working-hours.controller';
import { WorkingHoursService } from './working-hours/working-hours.service';
import { ExceptionController } from './exception/exception.controller';
import { ExceptionService } from './exception/exception.service';
import { CheckController } from './check/check.controller';
import { AvailabilityCheckService } from './check/availability-check.service';

@Module({
  imports: [ProviderModule],
  controllers: [
    ScheduleController,
    WorkingHoursController,
    ExceptionController,
    CheckController,
  ],
  providers: [
    ScheduleService,
    WorkingHoursService,
    ExceptionService,
    AvailabilityCheckService,
  ],
  exports: [AvailabilityCheckService],
})
export class AvailabilityModule {}
