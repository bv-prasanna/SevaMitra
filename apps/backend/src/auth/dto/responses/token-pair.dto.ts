import { ApiProperty } from '@nestjs/swagger';

export class TokenPairDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZjJjOWUzNC0yYjdiLTRkM2EtOWYxYS02YTJmMGM4YjkxZDQiLCJwaG9uZU51bWJlciI6Iis5MTk4NzY1NDMyMTAiLCJlbWFpbCI6bnVsbH0.dGVzdC1zaWduYXR1cmUtZXhhbXBsZQ',
  })
  accessToken: string;

  @ApiProperty({
    example:
      '9c6e2a1f0b7d4e3c8a5f1b2d6e9c0a3f7b4d8e1c2a5f9b0d3e6c8a1f4b7d0e2c9a5f1b3d6e8c0a2f',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Access token lifetime, in seconds',
    example: 900,
  })
  expiresIn: number;
}
