import { ApiProperty } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTownVillageDto {
  @ApiProperty({ example: 'Nanjangud' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '571301', description: '6-digit Indian PIN code' })
  @Matches(/^\d{6}$/, { message: 'pincode must be a 6-digit Indian PIN code' })
  pincode: string;

  @ApiProperty({ example: 12.1188, required: false })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ example: 76.6817, required: false })
  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
