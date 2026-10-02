import { ApiProperty } from '@nestjs/swagger';

/** Returned by POST /auth/otp/verify when purpose=PASSWORD_RESET. */
export class OtpVerifyResetResponseDto {
  @ApiProperty({ enum: ['resetToken'], example: 'resetToken' })
  kind: 'resetToken';

  @ApiProperty({
    description: 'Pass this to POST /auth/password/reset',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJjOWUzNC0yYjdiLTRkM2EtOWYxYS02YTJmMGM4YjkxZDQiLCJwdXJwb3NlIjoicGFzc3dvcmRfcmVzZXQifQ.dGVzdC1zaWduYXR1cmUtZXhhbXBsZQ',
  })
  resetToken: string;

  @ApiProperty({ example: '10m' })
  expiresIn: string;
}
