import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

export class UpdateSettlementConfigDto {
  @ApiProperty({ example: 14, required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  cycleDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
