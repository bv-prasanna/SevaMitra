import { ApiProperty } from '@nestjs/swagger';
import { CommissionScopeType, RefundReason } from '@prisma/client';

export class RefundPolicyDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({
    enum: CommissionScopeType,
    example: CommissionScopeType.PLATFORM,
  })
  scopeType: CommissionScopeType;

  @ApiProperty({ required: false, nullable: true })
  categoryId: string | null;

  @ApiProperty({ required: false, nullable: true })
  serviceId: string | null;

  @ApiProperty({ required: false, nullable: true })
  providerId: string | null;

  @ApiProperty({ required: false, nullable: true })
  townVillageId: string | null;

  @ApiProperty({ enum: RefundReason, example: RefundReason.CUSTOMER_CANCELLED })
  reason: RefundReason;

  @ApiProperty({ example: '50.00' })
  refundPercentage: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
