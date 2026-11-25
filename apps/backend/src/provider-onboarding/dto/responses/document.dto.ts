import { ApiProperty } from '@nestjs/swagger';
import { OnboardingDocumentReviewStatus, OnboardingDocumentType } from '@prisma/client';

export class DocumentDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  applicationId: string;

  @ApiProperty({
    enum: OnboardingDocumentType,
    example: OnboardingDocumentType.IDENTITY,
  })
  type: OnboardingDocumentType;

  @ApiProperty({ example: 'https://example.com/uploads/aadhaar-front.jpg' })
  fileUrl: string;

  @ApiProperty({
    example: 'Aadhaar card, front',
    required: false,
    nullable: true,
  })
  label: string | null;

  @ApiProperty({ required: false, nullable: true })
  categoryId: string | null;

  @ApiProperty({ required: false, nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ required: false, nullable: true })
  expiredAt: Date | null;

  @ApiProperty({ enum: OnboardingDocumentReviewStatus })
  reviewStatus: OnboardingDocumentReviewStatus;

  @ApiProperty({ required: false, nullable: true })
  reviewedAt: Date | null;

  @ApiProperty({ required: false, nullable: true })
  reviewNote: string | null;

  @ApiProperty({ required: false, nullable: true })
  renewalOfId: string | null;

  @ApiProperty()
  createdAt: Date;
}
