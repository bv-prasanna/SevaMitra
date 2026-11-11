import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomerProfileDto {
  @ApiProperty({ example: 'Ananya Sharma' })
  @IsString()
  @MaxLength(150)
  fullName: string;

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
