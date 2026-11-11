import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateAgentProfileDto } from './create-agent-profile.dto';

/**
 * status is deliberately not here — self-service update never touches it
 * (mirrors Provider, see AGENT_IMPLEMENTATION.md §5). agentCompanyId
 * additionally accepts explicit `null` (not just omission) to support
 * leaving a company and going individual — @IsOptional() treats both
 * null and undefined as "skip validation", and Prisma treats undefined as
 * "leave column unchanged" vs null as "set column to NULL", so the two
 * are meaningfully different on the wire here, unlike every other field.
 */
export class UpdateAgentProfileDto extends PartialType(
  OmitType(CreateAgentProfileDto, ['agentCompanyId'] as const),
) {
  @ApiProperty({
    example: null,
    required: false,
    nullable: true,
    description:
      'An existing, active AgentCompany id, or null to leave the current company',
  })
  @IsOptional()
  @IsUUID()
  agentCompanyId?: string | null;
}
