import { ApiProperty } from '@nestjs/swagger';

export class CommissionCalculationDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  bookingId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  appliedRuleId: string;

  @ApiProperty({ example: '599.00' })
  grossAmount: string;

  @ApiProperty({ example: '89.85' })
  commissionAmount: string;

  @ApiProperty({ example: '509.15' })
  providerEarningAmount: string;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty()
  calculatedAt: Date;
}
