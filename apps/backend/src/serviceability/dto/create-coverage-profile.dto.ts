import { ApiProperty } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateCoverageProfileDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
    description:
      'An existing Geography TownVillage id to use as the primary operating location',
  })
  @IsOptional()
  @IsUUID()
  primaryTownVillageId?: string;

  @ApiProperty({
    example: 12.2958,
    required: false,
    description:
      "Overrides primaryTownVillage's own coordinates if both are set",
  })
  @IsOptional()
  @IsLatitude()
  primaryLatitude?: number;

  @ApiProperty({ example: 76.6394, required: false })
  @IsOptional()
  @IsLongitude()
  primaryLongitude?: number;

  @ApiProperty({
    example: 15,
    required: false,
    description: 'Travel radius in km',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  radiusKm?: number;
}
