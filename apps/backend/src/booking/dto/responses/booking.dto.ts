import { ApiProperty } from '@nestjs/swagger';
import { BookingParty, BookingStatus, PricingModel } from '@prisma/client';

export class BookingDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  customerId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  offeringId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  townVillageId: string;

  @ApiProperty()
  scheduledDate: Date;

  @ApiProperty({ example: '09:00' })
  scheduledStartTime: string;

  @ApiProperty({ example: '10:00' })
  scheduledEndTime: string;

  @ApiProperty({ enum: PricingModel, example: PricingModel.FIXED })
  pricingModel: PricingModel;

  @ApiProperty({ example: '499.00', required: false, nullable: true })
  amount: string | null;

  @ApiProperty({ example: '100.00', required: false, nullable: true })
  visitFee: string | null;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.REQUESTED })
  status: BookingStatus;

  @ApiProperty({ enum: BookingParty, required: false, nullable: true })
  cancelledBy: BookingParty | null;

  @ApiProperty({ required: false, nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({ required: false, nullable: true })
  cancellationReason: string | null;

  @ApiProperty({ required: false, nullable: true })
  rejectionReason: string | null;

  @ApiProperty({ enum: BookingParty, required: false, nullable: true })
  noShowBy: BookingParty | null;

  @ApiProperty({ required: false, nullable: true })
  providerConfirmedCompletionAt: Date | null;

  @ApiProperty({ required: false, nullable: true })
  customerConfirmedCompletionAt: Date | null;

  @ApiProperty({ required: false, nullable: true })
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
