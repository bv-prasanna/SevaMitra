import { ApiProperty } from '@nestjs/swagger';
import { SettlementStatus } from '@prisma/client';

export class SettlementDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  providerId: string;

  @ApiProperty({ example: '1078.25' })
  totalAmount: string;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ enum: SettlementStatus, example: SettlementStatus.PAID })
  status: SettlementStatus;

  @ApiProperty({ required: false, nullable: true })
  payoutReference: string | null;

  @ApiProperty({ required: false, nullable: true })
  failureReason: string | null;

  @ApiProperty({ required: false, nullable: true })
  paidAt: Date | null;

  @ApiProperty({
    type: [String],
    description:
      'Ids of the CommissionCalculation rows this settlement paid out (empty if FAILED)',
  })
  commissionCalculationIds: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
