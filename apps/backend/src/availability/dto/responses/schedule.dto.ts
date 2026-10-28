import { ApiProperty } from '@nestjs/swagger';

export class ScheduleDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  providerId: string;

  @ApiProperty({ example: 6, required: false, nullable: true })
  maxDailyBookings: number | null;

  @ApiProperty({ example: 2, required: false, nullable: true })
  maxConcurrentBookings: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
