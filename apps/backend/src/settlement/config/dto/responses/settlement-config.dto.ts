import { ApiProperty } from '@nestjs/swagger';
import { CommissionScopeType } from '@prisma/client';

export class SettlementConfigDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({
    enum: CommissionScopeType,
    example: CommissionScopeType.PROVIDER,
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

  @ApiProperty({ example: 7 })
  cycleDays: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
