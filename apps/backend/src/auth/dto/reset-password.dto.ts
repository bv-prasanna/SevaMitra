import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description:
      'Short-lived token returned by POST /auth/otp/verify for purpose=PASSWORD_RESET',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJjOWUzNC0yYjdiLTRkM2EtOWYxYS02YTJmMGM4YjkxZDQiLCJwdXJwb3NlIjoicGFzc3dvcmRfcmVzZXQifQ.dGVzdC1zaWduYXR1cmUtZXhhbXBsZQ',
  })
  @IsString()
  resetToken: string;

  @ApiProperty({ example: 'new-correct-horse-battery' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
