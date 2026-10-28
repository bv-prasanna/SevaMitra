import { ApiProperty } from '@nestjs/swagger';
import { ScopeType } from '@prisma/client';

export class RoleAssignmentDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  roleId: string;

  @ApiProperty({ example: 'Taluk Ops Manager' })
  roleName: string;

  @ApiProperty({ enum: ScopeType, example: ScopeType.PLATFORM })
  scopeType: ScopeType;

  @ApiProperty({ example: null, required: false, nullable: true })
  scopeId: string | null;

  @ApiProperty({ example: null, required: false, nullable: true })
  assignedBy: string | null;

  @ApiProperty()
  assignedAt: Date;

  @ApiProperty({ example: null, required: false, nullable: true })
  revokedAt: Date | null;
}
