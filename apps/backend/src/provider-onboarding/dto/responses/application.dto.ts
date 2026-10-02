import { ApiProperty } from '@nestjs/swagger';
import { OnboardingChannel, OnboardingStatus } from '@prisma/client';
import { DocumentDto } from './document.dto';

export class ApplicationDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  providerId: string;

  @ApiProperty({ enum: OnboardingChannel, example: OnboardingChannel.SELF })
  channel: OnboardingChannel;

  @ApiProperty({ example: null, required: false, nullable: true })
  referredByAgentId: string | null;

  @ApiProperty({ enum: OnboardingStatus, example: OnboardingStatus.SUBMITTED })
  status: OnboardingStatus;

  @ApiProperty({ example: null, required: false, nullable: true })
  reviewNote: string | null;

  @ApiProperty({ example: null, required: false, nullable: true })
  reviewedBy: string | null;

  @ApiProperty()
  submittedAt: Date;

  @ApiProperty({ example: null, required: false, nullable: true })
  reviewedAt: Date | null;

  @ApiProperty({ type: [DocumentDto], required: false })
  documents?: DocumentDto[];
}
