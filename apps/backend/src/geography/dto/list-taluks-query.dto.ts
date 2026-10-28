import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListTaluksQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  districtId?: string;
}
