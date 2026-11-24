import { ApiProperty } from '@nestjs/swagger';

export class PermissionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'iam.role.manage' })
  key: string;

  @ApiProperty({
    example: 'Create, update, delete roles and edit their permission bundles',
  })
  description: string;

  @ApiProperty()
  createdAt: Date;
}
