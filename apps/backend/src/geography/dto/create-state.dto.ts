import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStateDto {
  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'KA', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;
}
