import { ApiProperty } from '@nestjs/swagger';
import { OnboardingDocumentReviewStatus } from '@prisma/client';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class ReviewDocumentDto {
  @ApiProperty({ enum: [OnboardingDocumentReviewStatus.APPROVED, OnboardingDocumentReviewStatus.REJECTED] })
  @IsIn([OnboardingDocumentReviewStatus.APPROVED, OnboardingDocumentReviewStatus.REJECTED])
  decision: typeof OnboardingDocumentReviewStatus.APPROVED | typeof OnboardingDocumentReviewStatus.REJECTED;

  @ApiProperty({
    example: 'License number is not readable',
    required: false,
    description: 'Required when decision=REJECTED',
  })
  @ValidateIf((dto: ReviewDocumentDto) =>
    dto.decision === OnboardingDocumentReviewStatus.REJECTED || dto.reviewNote !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1000)
  reviewNote?: string;
}
