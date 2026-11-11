import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'Ceiling Fan Installation' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    example:
      'Mounting and wiring of a customer-supplied ceiling fan, includes a 1-year workmanship check',
    required: false,
    description: "What's included",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example:
      'Does not include the fan itself, new wiring runs, or false-ceiling work',
    required: false,
    description: "What's excluded",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  exclusionsNote?: string;

  @ApiProperty({ example: 45, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  expectedDurationMinutes?: number;

  @ApiProperty({
    example:
      'Please ensure the installation area is accessible and power is switched off',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerPreparationNote?: string;

  @ApiProperty({ example: 'Licensed electrician preferred', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  providerSkillNote?: string;

  @ApiProperty({
    type: [String],
    example: ['electrical', 'installation'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}
