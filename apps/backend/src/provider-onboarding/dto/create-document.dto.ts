import { ApiProperty } from '@nestjs/swagger';
import { OnboardingDocumentType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    enum: OnboardingDocumentType,
    example: OnboardingDocumentType.IDENTITY,
  })
  @IsEnum(OnboardingDocumentType)
  type: OnboardingDocumentType;

  @ApiProperty({
    example: 'https://example.com/uploads/aadhaar-front.jpg',
    description:
      'A reference URL — no upload endpoint exists yet (Media/Document module is Phase 1b), this is trusted as given for now',
  })
  @IsUrl()
  fileUrl: string;

  @ApiProperty({ example: 'Aadhaar card, front', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}
