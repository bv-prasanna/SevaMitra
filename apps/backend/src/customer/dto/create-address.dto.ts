import { ApiProperty } from '@nestjs/swagger';
import { AddressLabel } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    enum: AddressLabel,
    default: AddressLabel.HOME,
    required: false,
  })
  @IsOptional()
  @IsEnum(AddressLabel)
  label?: AddressLabel;

  @ApiProperty({ example: '221B Temple Street' })
  @IsString()
  @MaxLength(200)
  line1: string;

  @ApiProperty({ example: '2nd Cross', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @ApiProperty({ example: 'Opposite bus stand', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  landmark?: string;

  @ApiProperty({ example: 'Mysuru' })
  @IsString()
  @MaxLength(100)
  town: string;

  @ApiProperty({ example: 'Mysuru', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiProperty({ example: 'Karnataka', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: '570001', description: '6-digit Indian PIN code' })
  @Matches(/^\d{6}$/, { message: 'pincode must be a 6-digit Indian PIN code' })
  pincode: string;

  @ApiProperty({ example: 12.2958, required: false })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ example: 76.6394, required: false })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({
    default: false,
    required: false,
    description:
      'The first address a customer adds always becomes default regardless of this flag',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
