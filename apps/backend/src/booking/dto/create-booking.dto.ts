import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { TIME_OF_DAY_PATTERN } from '../../common/util/time-of-day';

export class CreateBookingDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  offeringId: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'The Geography town/village where the service is needed',
  })
  @IsUUID()
  townVillageId: string;

  @ApiProperty({ example: '2026-10-20' })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_OF_DAY_PATTERN, {
    message: 'scheduledStartTime must be a 24-hour HH:mm value',
  })
  scheduledStartTime: string;

  @ApiProperty({ example: '10:00' })
  @Matches(TIME_OF_DAY_PATTERN, {
    message: 'scheduledEndTime must be a 24-hour HH:mm value',
  })
  scheduledEndTime: string;

  @ApiProperty({
    example: 'Please call before arriving — gate code is 4521',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
