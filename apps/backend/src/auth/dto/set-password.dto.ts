import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiPropertyOptional({
    description:
      'Required only if the account already has a password set (i.e. this is a change, not a first-time set).',
    example: 'correct-horse-battery-staple',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: 'new-correct-horse-battery' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
