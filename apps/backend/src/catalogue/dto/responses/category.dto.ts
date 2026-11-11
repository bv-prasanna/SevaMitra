import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Home Repair & Maintenance' })
  name: string;

  @ApiProperty({
    example: 'Plumbing, electrical, carpentry, painting, masonry',
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
