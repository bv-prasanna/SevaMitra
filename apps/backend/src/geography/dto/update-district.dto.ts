import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDistrictDto } from './create-district.dto';

/** isActive is the only deactivation path — there is no delete endpoint. stateId may be changed to re-parent the district. */
export class UpdateDistrictDto extends PartialType(CreateDistrictDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
