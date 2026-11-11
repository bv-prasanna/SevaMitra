import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDistrictDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  stateId: string;

  @ApiProperty({ example: 'Mysuru' })
  @IsString()
  @MaxLength(100)
  name: string;
}
