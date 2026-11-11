import { ApiProperty } from '@nestjs/swagger';

export class OtpRequestResponseDto {
  @ApiProperty({
    description: 'How long the OTP stays valid for',
    example: 300,
  })
  expiresInSeconds: number;
}
