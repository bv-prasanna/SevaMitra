import { ApiProperty } from '@nestjs/swagger';
import { CommissionScopeType, RefundReason } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateRefundPolicyDto {
  @ApiProperty({
    enum: CommissionScopeType,
    example: CommissionScopeType.PLATFORM,
  })
  @IsEnum(CommissionScopeType)
  scopeType: CommissionScopeType;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
    description: 'Required when scopeType=CATEGORY',
  })
  @ValidateIf(
    (dto: CreateRefundPolicyDto) =>
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
    (dto: CreateRefundPolicyDto) =>
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
    (dto: CreateRefundPolicyDto) =>
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
    (dto: CreateRefundPolicyDto) =>
      dto.scopeType === CommissionScopeType.GEOGRAPHY,
  )
  @IsUUID()
  townVillageId?: string;

  @ApiProperty({ enum: RefundReason, example: RefundReason.CUSTOMER_CANCELLED })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiProperty({
    example: 50,
    description: '0 = no refund, 100 = full refund, anything between = partial',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  refundPercentage: number;
}
