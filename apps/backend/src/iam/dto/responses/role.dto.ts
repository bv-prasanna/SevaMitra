import { ApiProperty } from '@nestjs/swagger';

export class RoleDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Taluk Ops Manager' })
  name: string;

  @ApiProperty({
    example: 'Manages bookings and providers within a taluk',
    required: false,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: false })
  isSystem: boolean;

  @ApiProperty({ type: [String], example: ['iam.role.view'] })
  permissionKeys: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
