import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateVariantDto } from './create-variant.dto';

/** isActive is the only deactivation path — there is no delete endpoint. */
export class UpdateVariantDto extends PartialType(CreateVariantDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
