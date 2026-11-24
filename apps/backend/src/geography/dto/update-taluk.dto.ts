import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTalukDto } from './create-taluk.dto';

/** isActive is the only deactivation path — there is no delete endpoint. districtId may be changed to re-parent the taluk. */
export class UpdateTalukDto extends PartialType(CreateTalukDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
