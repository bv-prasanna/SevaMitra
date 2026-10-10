import { ApiProperty } from '@nestjs/swagger';

export class TownVillageDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  talukId: string;

  @ApiProperty({ example: 'Nanjangud' })
  name: string;

  @ApiProperty({ example: '571301' })
  pincode: string;

  @ApiProperty({ example: 12.1188, required: false, nullable: true })
  latitude: number | null;

  @ApiProperty({ example: 76.6817, required: false, nullable: true })
  longitude: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
