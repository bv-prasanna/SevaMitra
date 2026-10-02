import { ApiProperty } from '@nestjs/swagger';
import { CommissionScopeType } from '@prisma/client';
import { IsEnum, IsInt, IsPositive, IsUUID, ValidateIf } from 'class-validator';

export class CreateSettlementConfigDto {
  @ApiProperty({
    enum: CommissionScopeType,
    example: CommissionScopeType.PROVIDER,
  })
  @IsEnum(CommissionScopeType)
  scopeType: CommissionScopeType;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
    description: 'Required when scopeType=CATEGORY',
  })
  @ValidateIf(
    (dto: CreateSettlementConfigDto) =>
      dto.scopeType === CommissionScopeType.CATEGORY,
  )
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
    description: 'Required when scopeType=SERVICE',
  })
  @ValidateIf(
    (dto: CreateSettlementConfigDto) =>
      dto.scopeType === CommissionScopeType.SERVICE,
  )
  @IsUUID()
  serviceId?: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
    description: 'Required when scopeType=PROVIDER',
  })
  @ValidateIf(
    (dto: CreateSettlementConfigDto) =>
      dto.scopeType === CommissionScopeType.PROVIDER,
  )
  @IsUUID()
  providerId?: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
    description: 'Required when scopeType=GEOGRAPHY',
  })
  @ValidateIf(
    (dto: CreateSettlementConfigDto) =>
      dto.scopeType === CommissionScopeType.GEOGRAPHY,
  )
  @IsUUID()
  townVillageId?: string;

  @ApiProperty({
    example: 7,
    description:
      'Days between settlement runs, e.g. 7 for weekly, 30 for monthly',
  })
  @IsInt()
  @IsPositive()
  cycleDays: number;
}
