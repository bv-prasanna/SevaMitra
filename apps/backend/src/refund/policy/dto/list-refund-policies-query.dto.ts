import { ApiProperty } from '@nestjs/swagger';
import { CommissionScopeType, RefundReason } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListRefundPoliciesQueryDto {
  @ApiProperty({ enum: CommissionScopeType, required: false })
  @IsOptional()
  @IsEnum(CommissionScopeType)
  scopeType?: CommissionScopeType;

  @ApiProperty({ enum: RefundReason, required: false })
  @IsOptional()
  @IsEnum(RefundReason)
  reason?: RefundReason;
}
