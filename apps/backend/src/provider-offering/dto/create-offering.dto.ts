import { ApiProperty } from '@nestjs/swagger';
import { PricingModel } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const AMOUNT_REQUIRED_MODELS: PricingModel[] = [
  PricingModel.FIXED,
  PricingModel.STARTING_AT,
  PricingModel.HOURLY,
  PricingModel.DAILY,
];

export class CreateOfferingDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({
    example: null,
    required: false,
    nullable: true,
    description:
      'An existing variant of that service — omit to offer the base service',
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ enum: PricingModel, example: PricingModel.FIXED })
  @IsEnum(PricingModel)
  pricingModel: PricingModel;

  @ApiProperty({
    example: 499,
    required: false,
    description:
      'Required for FIXED/STARTING_AT/HOURLY/DAILY; optional for QUOTE_BASED/PROJECT_BASED',
  })
  @ValidateIf(
    (dto: CreateOfferingDto) =>
      AMOUNT_REQUIRED_MODELS.includes(dto.pricingModel) ||
      dto.amount !== undefined,
  )
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({
    example: 100,
    required: false,
    description: 'Inspection/visit charge',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  visitFee?: number;

  @ApiProperty({
    example: "Beyond 10km from the provider's primary location, ₹5/km applies",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  travelFeeNote?: string;

  @ApiProperty({ example: 'INR', required: false, default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({
    example: 'Price excludes materials — billed separately at cost',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
