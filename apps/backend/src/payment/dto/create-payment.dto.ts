import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    required: false,
    format: 'uuid',
    description: 'Stable idempotency key across offline retries; reuse for the same amount, method and booking.',
  })
  @IsOptional()
  @IsUUID()
  clientRequestId?: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  bookingId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.ONLINE })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    example: 499,
    description:
      'Amount being paid in this transaction — may be partial (an advance)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}
