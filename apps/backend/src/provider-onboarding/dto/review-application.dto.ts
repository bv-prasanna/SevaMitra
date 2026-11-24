import { ApiProperty } from '@nestjs/swagger';
import { OnboardingStatus } from '@prisma/client';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class ReviewApplicationDto {
  @ApiProperty({ enum: [OnboardingStatus.APPROVED, OnboardingStatus.REJECTED] })
  @IsIn([OnboardingStatus.APPROVED, OnboardingStatus.REJECTED])
  decision: typeof OnboardingStatus.APPROVED | typeof OnboardingStatus.REJECTED;

  @ApiProperty({
    example: 'Aadhaar photo is blurry — please resubmit a clearer copy',
    required: false,
    description:
      'Required when decision=REJECTED; optional (but still validated) when APPROVED',
  })
  @ValidateIf(
    (dto: ReviewApplicationDto) =>
      dto.decision === OnboardingStatus.REJECTED ||
      dto.reviewNote !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reviewNote?: string;
}
