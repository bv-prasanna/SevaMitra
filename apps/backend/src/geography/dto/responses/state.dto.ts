import { ApiProperty } from '@nestjs/swagger';

export class StateDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Karnataka' })
  name: string;

  @ApiProperty({ example: 'KA', required: false, nullable: true })
  code: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
