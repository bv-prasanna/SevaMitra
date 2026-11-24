import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTownVillageDto } from './create-town-village.dto';

/** isActive is the only deactivation path — there is no delete endpoint. */
export class UpdateTownVillageDto extends PartialType(CreateTownVillageDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
