import { ApiProperty } from '@nestjs/swagger';
import { CommissionScopeType, CommissionType } from '@prisma/client';

export class CommissionRuleDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({
    enum: CommissionScopeType,
    example: CommissionScopeType.SERVICE,
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

  @ApiProperty({ enum: CommissionType, example: CommissionType.PERCENTAGE })
  commissionType: CommissionType;

  @ApiProperty({ required: false, nullable: true, example: '15.00' })
  percentage: string | null;

  @ApiProperty({ required: false, nullable: true })
  fixedAmount: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
