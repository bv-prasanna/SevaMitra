import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';

/** isActive is the only deactivation path — there is no delete endpoint. categoryId may be changed to re-categorize the service. */
export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
