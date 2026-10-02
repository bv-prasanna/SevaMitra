import { ApiProperty } from '@nestjs/swagger';
import { CoverageStatus } from '@prisma/client';
import { IsIn } from 'class-validator';

export class ReviewCoverageAreaDto {
  @ApiProperty({ enum: [CoverageStatus.APPROVED, CoverageStatus.REJECTED] })
  @IsIn([CoverageStatus.APPROVED, CoverageStatus.REJECTED])
  decision: typeof CoverageStatus.APPROVED | typeof CoverageStatus.REJECTED;
}
