import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginWithPasswordDto {
  @ApiProperty({
    example: 'admin@sevamitra.in',
    description: 'Email or E.164 phone number',
  })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'correct-horse-battery-staple' })
  @IsString()
  @MinLength(8)
  password: string;
}
