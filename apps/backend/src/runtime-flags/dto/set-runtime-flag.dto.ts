import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class SetRuntimeFlagDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Audit reason for this operational change' })
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  reason: string;
}
