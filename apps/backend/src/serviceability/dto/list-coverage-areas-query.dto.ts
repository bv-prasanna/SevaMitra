import { ApiProperty } from '@nestjs/swagger';
import { CoverageStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListCoverageAreasQueryDto {
  @ApiProperty({ enum: CoverageStatus, required: false })
  @IsOptional()
  @IsEnum(CoverageStatus)
  status?: CoverageStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
