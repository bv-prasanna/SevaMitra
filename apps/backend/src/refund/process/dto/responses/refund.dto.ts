import { ApiProperty } from '@nestjs/swagger';
import { RefundReason, RefundStatus } from '@prisma/client';

export class RefundDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  bookingId: string;

  @ApiProperty({ enum: RefundReason, example: RefundReason.CUSTOMER_CANCELLED })
  reason: RefundReason;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  appliedPolicyId: string;

  @ApiProperty({ example: '599.00' })
  grossPaidAmount: string;

  @ApiProperty({ example: '299.50' })
  refundAmount: string;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ enum: RefundStatus, example: RefundStatus.REFUNDED })
  status: RefundStatus;

  @ApiProperty({ required: false, nullable: true })
  refundReference: string | null;

  @ApiProperty({ required: false, nullable: true })
  failureReason: string | null;

  @ApiProperty({ required: false, nullable: true })
  refundedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
