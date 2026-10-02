import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsPhoneNumber, IsString, Length } from 'class-validator';
import { RequestOtpPurpose } from './request-otp.dto';

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(4, 10)
  otp: string;

  @ApiProperty({ enum: RequestOtpPurpose, default: RequestOtpPurpose.LOGIN })
  @IsEnum(RequestOtpPurpose)
  purpose: RequestOtpPurpose;
}
