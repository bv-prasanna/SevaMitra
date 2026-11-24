import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DiscoverOfferingsDto {
  @ApiProperty({description:"Active service ID"})
  @IsUUID()
  serviceId: string;

  @ApiProperty({description:"Town/Village UUID from the geography catalogue"})
  @IsUUID()
  townVillageId: string;
}
