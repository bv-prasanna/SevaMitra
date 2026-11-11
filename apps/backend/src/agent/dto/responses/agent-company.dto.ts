import { ApiProperty } from '@nestjs/swagger';

export class AgentCompanyDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Karnataka Field Partners Pvt Ltd' })
  name: string;

  @ApiProperty({
    example: 'U74999KA2024PTC123456',
    required: false,
    nullable: true,
  })
  registrationNumber: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
