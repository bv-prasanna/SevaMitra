import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class PaymentDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  bookingId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.ONLINE })
  method: PaymentMethod;

  @ApiProperty({ example: '499.00' })
  amount: string;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.INITIATED })
  status: PaymentStatus;

  @ApiProperty({ required: false, nullable: true })
  gatewayOrderId: string | null;

  @ApiProperty({ required: false, nullable: true })
  gatewayPaymentId: string | null;

  @ApiProperty({ required: false, nullable: true })
  failureReason: string | null;

  @ApiProperty({ required: false, nullable: true })
  settledAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
