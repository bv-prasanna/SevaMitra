import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import { IsEnum, Matches } from 'class-validator';
import { TIME_OF_DAY_PATTERN } from '../../common/util/time-of-day';

export class CreateWorkingHoursDto {
  @ApiProperty({ enum: DayOfWeek, example: DayOfWeek.MONDAY })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_OF_DAY_PATTERN, {
    message: 'startTime must be a 24-hour HH:mm value',
  })
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @Matches(TIME_OF_DAY_PATTERN, {
    message: 'endTime must be a 24-hour HH:mm value',
  })
  endTime: string;
}
