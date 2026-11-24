import { ApiProperty } from '@nestjs/swagger';

export class VariantDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  serviceId: string;

  @ApiProperty({ example: '3 BHK' })
  name: string;

  @ApiProperty({
    example: 'Up to 3 bedrooms, hall, and kitchen',
    required: false,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
