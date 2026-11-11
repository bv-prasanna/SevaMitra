import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTalukDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  districtId: string;

  @ApiProperty({ example: 'Mysuru Taluk' })
  @IsString()
  @MaxLength(100)
  name: string;
}
