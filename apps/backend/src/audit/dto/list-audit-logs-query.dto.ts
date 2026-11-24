import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListAuditLogsQueryDto {
  @ApiProperty({
    required: false,
    description: 'Restrict to actions performed by a specific user',
  })
  @IsOptional()
  @IsUUID()
  actorUserId?: string;
}
