import { ApiProperty } from '@nestjs/swagger';
import { TokenPairDto } from './token-pair.dto';
import { PublicUserDto } from './public-user.dto';

/** Returned by POST /auth/otp/verify when purpose=LOGIN. */
export class OtpVerifyTokensResponseDto {
  @ApiProperty({ enum: ['tokens'], example: 'tokens' })
  kind: 'tokens';

  @ApiProperty({ type: TokenPairDto })
  tokens: TokenPairDto;

  @ApiProperty({ type: PublicUserDto })
  user: PublicUserDto;
}
