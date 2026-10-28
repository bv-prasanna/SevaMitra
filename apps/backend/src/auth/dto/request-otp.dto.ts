import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsPhoneNumber } from 'class-validator';

export enum RequestOtpPurpose {
  LOGIN = 'LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export class RequestOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({ enum: RequestOtpPurpose, default: RequestOtpPurpose.LOGIN })
  @IsEnum(RequestOtpPurpose)
  purpose: RequestOtpPurpose;
}
