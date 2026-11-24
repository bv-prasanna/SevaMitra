import { ApiProperty } from '@nestjs/swagger';
import { ExceptionType } from '@prisma/client';

export class ExceptionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  providerId: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ enum: ExceptionType, example: ExceptionType.UNAVAILABLE })
  type: ExceptionType;

  @ApiProperty({ example: null, required: false, nullable: true })
  customStartTime: string | null;

  @ApiProperty({ example: null, required: false, nullable: true })
  customEndTime: string | null;

  @ApiProperty({ example: 'Diwali holiday', required: false, nullable: true })
  reason: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
