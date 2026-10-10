import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({ example: '3 BHK' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'Up to 3 bedrooms, hall, and kitchen',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
