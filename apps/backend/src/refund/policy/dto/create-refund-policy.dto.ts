import { ApiProperty } from '@nestjs/swagger';
import { CommissionScopeType, RefundReason } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsISO8601,
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

  @ApiProperty({required:false,description:'State UUID for STATE scope'})
  @ValidateIf((dto:CreateRefundPolicyDto)=>dto.scopeType===CommissionScopeType.STATE)
  @IsUUID() stateId?:string;
  @ApiProperty({required:false,description:'Provider company UUID for PROVIDER_COMPANY scope'})
  @ValidateIf((dto:CreateRefundPolicyDto)=>dto.scopeType===CommissionScopeType.PROVIDER_COMPANY)
  @IsUUID() providerCompanyId?:string;
  @ApiProperty({required:false,description:'Provider group UUID for PROVIDER_GROUP scope'})
  @ValidateIf((dto:CreateRefundPolicyDto)=>dto.scopeType===CommissionScopeType.PROVIDER_GROUP)
  @IsUUID() providerGroupId?:string;
  @ApiProperty({required:false,description:'UTC effective start; defaults to creation time'})
  @IsOptional() @IsISO8601({strict:true}) effectiveFrom?:string;
  @ApiProperty({required:false,description:'UTC effective end, exclusive'})
  @IsOptional() @IsISO8601({strict:true}) effectiveTo?:string;

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
