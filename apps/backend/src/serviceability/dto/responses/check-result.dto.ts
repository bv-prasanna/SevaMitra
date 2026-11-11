import { ApiProperty } from '@nestjs/swagger';

export class CheckResultDto {
  @ApiProperty({ example: true })
  serviceable: boolean;

  @ApiProperty({
    enum: ['APPROVED_AREA', 'WITHIN_RADIUS', 'NOT_SERVICEABLE'],
    example: 'APPROVED_AREA',
  })
  reason: 'APPROVED_AREA' | 'WITHIN_RADIUS' | 'NOT_SERVICEABLE';
}
