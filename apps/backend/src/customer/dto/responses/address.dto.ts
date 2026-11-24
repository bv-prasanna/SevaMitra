import { ApiProperty } from '@nestjs/swagger';
import { AddressLabel } from '@prisma/client';

export class AddressDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  customerId: string;

  @ApiProperty({ enum: AddressLabel, example: AddressLabel.HOME })
  label: AddressLabel;

  @ApiProperty({ example: '221B Temple Street' })
  line1: string;

  @ApiProperty({ example: '2nd Cross', required: false, nullable: true })
  line2: string | null;

  @ApiProperty({
    example: 'Opposite bus stand',
    required: false,
    nullable: true,
  })
  landmark: string | null;

  @ApiProperty({ example: 'Mysuru' })
  town: string;

  @ApiProperty({ example: 'Mysuru', required: false, nullable: true })
  district: string | null;

  @ApiProperty({ example: 'Karnataka', required: false, nullable: true })
  state: string | null;

  @ApiProperty({ example: '570001' })
  pincode: string;

  @ApiProperty({ example: 12.2958, required: false, nullable: true })
  latitude: number | null;

  @ApiProperty({ example: 76.6394, required: false, nullable: true })
  longitude: number | null;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
