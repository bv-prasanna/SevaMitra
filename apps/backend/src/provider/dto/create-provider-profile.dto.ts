import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProviderProfileDto {
  @ApiProperty({ example: 'Ravi Kumar' })
  @IsString()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({ example: 'Kumar Electricals', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  businessName?: string;

  @ApiProperty({
    example:
      'Licensed electrician, 8 years residential and commercial wiring experience',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(80)
  experienceYears?: number;

  @ApiProperty({
    example: 'kn',
    required: false,
    description:
      'Language code — Kannada (kn) is the pilot default (BRD §30.4/§44)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  notificationOptIn?: boolean;
}
