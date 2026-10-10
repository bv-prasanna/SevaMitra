import { ApiProperty } from '@nestjs/swagger';
import { ExceptionType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TIME_OF_DAY_PATTERN } from '../../common/util/time-of-day';

export class CreateExceptionDto {
  @ApiProperty({ example: '2026-10-20', description: 'ISO date (inclusive)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-10-21',
    description: 'ISO date (inclusive) — same as startDate for a single day',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: ExceptionType, example: ExceptionType.UNAVAILABLE })
  @IsEnum(ExceptionType)
  type: ExceptionType;

  @ApiProperty({
    example: '10:00',
    required: false,
    description: 'Required when type=CUSTOM_HOURS',
  })
  @ValidateIf(
    (dto: CreateExceptionDto) => dto.type === ExceptionType.CUSTOM_HOURS,
  )
  @Matches(TIME_OF_DAY_PATTERN, {
    message: 'customStartTime must be a 24-hour HH:mm value',
  })
  customStartTime?: string;

  @ApiProperty({
    example: '14:00',
    required: false,
    description: 'Required when type=CUSTOM_HOURS',
  })
  @ValidateIf(
    (dto: CreateExceptionDto) => dto.type === ExceptionType.CUSTOM_HOURS,
  )
  @Matches(TIME_OF_DAY_PATTERN, {
    message: 'customEndTime must be a 24-hour HH:mm value',
  })
  customEndTime?: string;

  @ApiProperty({ example: 'Diwali holiday', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
