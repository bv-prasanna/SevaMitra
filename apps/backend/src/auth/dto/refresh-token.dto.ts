import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example:
      '9c6e2a1f0b7d4e3c8a5f1b2d6e9c0a3f7b4d8e1c2a5f9b0d3e6c8a1f4b7d0e2c9a5f1b3d6e8c0a2f',
  })
  @IsString()
  refreshToken: string;
}
