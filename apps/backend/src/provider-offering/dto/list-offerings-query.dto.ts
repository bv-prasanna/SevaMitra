import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListOfferingsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
