import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateWorkingHoursDto } from './create-working-hours.dto';

export class UpdateWorkingHoursDto extends PartialType(CreateWorkingHoursDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
