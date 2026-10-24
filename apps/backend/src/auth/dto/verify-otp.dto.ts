import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsPhoneNumber, IsString, Length, IsIn, IsOptional, MaxLength } from 'class-validator';
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

  @ApiProperty({required:false,enum:['android','ios']})
  @IsOptional() @IsIn(['android','ios'])
  devicePlatform?:'android'|'ios';

  @ApiProperty({required:false,description:'Displayed on trusted-device management page'})
  @IsOptional() @IsString() @MaxLength(80)
  deviceLabel?:string;

}
