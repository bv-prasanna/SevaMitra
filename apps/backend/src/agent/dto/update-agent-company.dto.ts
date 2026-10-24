import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAgentCompanyDto } from './create-agent-company.dto';

/** isActive is the only way to deactivate a company — there is no delete endpoint. */
export class UpdateAgentCompanyDto extends PartialType(CreateAgentCompanyDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
