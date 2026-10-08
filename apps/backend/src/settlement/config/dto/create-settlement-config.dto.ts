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

  @ApiProperty({required:false,description:'State UUID for STATE scope'})
  @ValidateIf((dto:CreateSettlementConfigDto)=>dto.scopeType===CommissionScopeType.STATE)
  @IsUUID() stateId?:string;
  @ApiProperty({required:false,description:'Provider company UUID for PROVIDER_COMPANY scope'})
  @ValidateIf((dto:CreateSettlementConfigDto)=>dto.scopeType===CommissionScopeType.PROVIDER_COMPANY)
  @IsUUID() providerCompanyId?:string;
  @ApiProperty({required:false,description:'Provider group UUID for PROVIDER_GROUP scope'})
  @ValidateIf((dto:CreateSettlementConfigDto)=>dto.scopeType===CommissionScopeType.PROVIDER_GROUP)
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
