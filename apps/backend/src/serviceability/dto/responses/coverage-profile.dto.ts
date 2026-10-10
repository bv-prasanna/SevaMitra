import { ApiProperty } from '@nestjs/swagger';

export class CoverageProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  providerId: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
    nullable: true,
  })
  primaryTownVillageId: string | null;

  @ApiProperty({ example: 12.2958, required: false, nullable: true })
  primaryLatitude: number | null;

  @ApiProperty({ example: 76.6394, required: false, nullable: true })
  primaryLongitude: number | null;

  @ApiProperty({ example: 15, required: false, nullable: true })
  radiusKm: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
