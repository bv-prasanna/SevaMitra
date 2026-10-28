import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class CheckQueryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ example: '2026-10-20' })
  @IsDateString()
  date: string;
}
