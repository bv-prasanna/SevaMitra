import { ApiProperty } from '@nestjs/swagger';
import { WindowDto } from './window.dto';

export class CheckResultDto {
  @ApiProperty({ example: true })
  available: boolean;

  @ApiProperty({ type: [WindowDto] })
  windows: WindowDto[];

  @ApiProperty({
    enum: [
      'WEEKLY_HOURS',
      'CUSTOM_HOURS',
      'EXCEPTION_UNAVAILABLE',
      'NO_SCHEDULE',
    ],
    example: 'WEEKLY_HOURS',
  })
  reason:
    'WEEKLY_HOURS' | 'CUSTOM_HOURS' | 'EXCEPTION_UNAVAILABLE' | 'NO_SCHEDULE';
}
