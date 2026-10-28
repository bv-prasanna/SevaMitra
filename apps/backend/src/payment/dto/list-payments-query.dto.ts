import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListPaymentsQueryDto {
  @ApiProperty({ enum: PaymentStatus, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({
    required: false,
    description: 'Restrict to payments against a specific booking',
  })
  @IsOptional()
  @IsUUID()
  bookingId?: string;
}
