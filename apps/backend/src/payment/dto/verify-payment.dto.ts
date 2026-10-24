import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'stub_pay_1234567890' })
  @IsString()
  @IsNotEmpty()
  gatewayPaymentId: string;

  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  @IsString()
  @IsNotEmpty()
  gatewaySignature: string;
}
