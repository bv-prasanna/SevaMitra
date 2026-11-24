import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ example: 6, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxDailyBookings?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxConcurrentBookings?: number;
}
