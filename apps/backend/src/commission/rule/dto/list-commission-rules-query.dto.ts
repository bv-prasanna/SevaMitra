import { ApiProperty } from '@nestjs/swagger';
import { CommissionScopeType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListCommissionRulesQueryDto {
  @ApiProperty({ enum: CommissionScopeType, required: false })
  @IsOptional()
  @IsEnum(CommissionScopeType)
  scopeType?: CommissionScopeType;
}
