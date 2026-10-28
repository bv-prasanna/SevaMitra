import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

export class UpdateCommissionRuleDto {
  @ApiProperty({
    example: 18,
    required: false,
    description: 'Only valid on a PERCENTAGE rule',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiProperty({
    example: 60,
    required: false,
    description: 'Only valid on a FIXED_AMOUNT rule',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  fixedAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
