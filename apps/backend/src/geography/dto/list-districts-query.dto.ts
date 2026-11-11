import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListDistrictsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  stateId?: string;
}
