import { ApiProperty } from '@nestjs/swagger';
import { OnboardingDocumentType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    enum: OnboardingDocumentType,
    example: OnboardingDocumentType.IDENTITY,
  })
  @IsEnum(OnboardingDocumentType)
  type: OnboardingDocumentType;

  @ApiProperty({
    example: 'r2://sevamitra-private/onboarding/application-id/document-id.pdf',
    description:
      'Private storage key returned by the upload service; public URLs are not accepted',
  })
  @IsString()
  @MaxLength(500)
  fileUrl: string;

  @ApiProperty({ required: false, description: 'Optional service category scope; omit to apply to all provider services' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ required: false, example: '2027-12-31', description: 'Expiry date, valid through the end of the date in Asia/Kolkata' })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  expiresAt?: string;

  @ApiProperty({ required: false, description: 'Existing document being renewed' })
  @IsOptional()
  @IsUUID()
  renewalOfId?: string;

  @ApiProperty({ example: 'Aadhaar card, front', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}
