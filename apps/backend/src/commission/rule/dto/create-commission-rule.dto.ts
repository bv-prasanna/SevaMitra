import { ApiProperty } from '@nestjs/swagger';
import { CommissionScopeType, CommissionType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsISO8601,
  IsNumber,
  IsPositive,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateCommissionRuleDto {
  @ApiProperty({
    enum: CommissionScopeType,
    example: CommissionScopeType.SERVICE,
  })
  @IsEnum(CommissionScopeType)
  scopeType: CommissionScopeType;

  @ApiProperty({required:false,description:'State UUID for STATE scope'})
  @ValidateIf((dto:CreateCommissionRuleDto)=>dto.scopeType===CommissionScopeType.STATE)
  @IsUUID() stateId?:string;
  @ApiProperty({required:false,description:'Provider company UUID for PROVIDER_COMPANY scope'})
  @ValidateIf((dto:CreateCommissionRuleDto)=>dto.scopeType===CommissionScopeType.PROVIDER_COMPANY)
  @IsUUID() providerCompanyId?:string;
  @ApiProperty({required:false,description:'Provider group UUID for PROVIDER_GROUP scope'})
  @ValidateIf((dto:CreateCommissionRuleDto)=>dto.scopeType===CommissionScopeType.PROVIDER_GROUP)
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
    (dto: CreateCommissionRuleDto) =>
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
    (dto: CreateCommissionRuleDto) =>
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
    (dto: CreateCommissionRuleDto) =>
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
    (dto: CreateCommissionRuleDto) =>
      dto.scopeType === CommissionScopeType.GEOGRAPHY,
  )
  @IsUUID()
  townVillageId?: string;

  @ApiProperty({ enum: CommissionType, example: CommissionType.PERCENTAGE })
  @IsEnum(CommissionType)
  commissionType: CommissionType;

  @ApiProperty({
    example: 15,
    required: false,
    description: 'Required when commissionType=PERCENTAGE. 0-100.',
  })
  @ValidateIf(
    (dto: CreateCommissionRuleDto) =>
      dto.commissionType === CommissionType.PERCENTAGE,
  )
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiProperty({
    example: 50,
    required: false,
    description: 'Required when commissionType=FIXED_AMOUNT',
  })
  @ValidateIf(
    (dto: CreateCommissionRuleDto) =>
      dto.commissionType === CommissionType.FIXED_AMOUNT,
  )
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  fixedAmount?: number;
}
