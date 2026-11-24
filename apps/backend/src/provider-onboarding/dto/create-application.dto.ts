import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: 'A1B2C3D4',
    required: false,
    description:
      "An existing agent's agentCode — sets channel to AGENT_REFERRED and attributes this application to them",
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  referredByAgentCode?: string;
}
