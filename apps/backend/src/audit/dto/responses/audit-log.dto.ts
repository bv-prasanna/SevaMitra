import { ApiProperty } from '@nestjs/swagger';

export class AuditLogDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  actorUserId: string;

  @ApiProperty({ example: 'POST' })
  httpMethod: string;

  @ApiProperty({ example: '/bookings/me/:id/cancel' })
  routePath: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  entityId: string | null;

  @ApiProperty({ example: 201 })
  statusCode: number;

  @ApiProperty({ required: false, nullable: true })
  ipAddress: string | null;

  @ApiProperty()
  createdAt: Date;
}
