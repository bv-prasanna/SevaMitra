import { ApiProperty } from '@nestjs/swagger';
import { OnboardingDocumentType } from '@prisma/client';

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

  @ApiProperty()
  createdAt: Date;
}
