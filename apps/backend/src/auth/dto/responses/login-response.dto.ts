import { ApiProperty } from '@nestjs/swagger';
import { TokenPairDto } from './token-pair.dto';
import { PublicUserDto } from './public-user.dto';

export class LoginResponseDto {
  @ApiProperty({ type: TokenPairDto })
  tokens: TokenPairDto;

  @ApiProperty({ type: PublicUserDto })
  user: PublicUserDto;
}
