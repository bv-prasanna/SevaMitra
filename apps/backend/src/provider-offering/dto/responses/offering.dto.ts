import { ApiProperty } from '@nestjs/swagger';
import { PricingModel } from '@prisma/client';

export class OfferingDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  providerId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  serviceId: string;

  @ApiProperty({ example: null, required: false, nullable: true })
  variantId: string | null;

  @ApiProperty({ enum: PricingModel, example: PricingModel.FIXED })
  pricingModel: PricingModel;

  @ApiProperty({ example: '499.00', required: false, nullable: true })
  amount: string | null;

  @ApiProperty({ example: '100.00', required: false, nullable: true })
  visitFee: string | null;

  @ApiProperty({ required: false, nullable: true })
  travelFeeNote: string | null;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ required: false, nullable: true })
  notes: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
