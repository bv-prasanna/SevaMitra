import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '@prisma/client';

export class AgentProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
    nullable: true,
  })
  agentCompanyId: string | null;

  @ApiProperty({ example: 'Suresh Gowda' })
  fullName: string;

  @ApiProperty({
    example: 'A1B2C3D4',
    description: 'Stable attribution code for future onboarding flows',
  })
  agentCode: string;

  @ApiProperty({ example: 'Mysuru taluk', required: false, nullable: true })
  geographyNote: string | null;

  @ApiProperty({ example: 'kn' })
  preferredLanguage: string;

  @ApiProperty({ example: true })
  notificationOptIn: boolean;

  @ApiProperty({ enum: AgentStatus, example: AgentStatus.PENDING })
  status: AgentStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
