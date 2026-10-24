import { ApiProperty } from '@nestjs/swagger';
import { ProviderStatus, VerificationStatus } from '@prisma/client';

export class ProviderProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ example: 'Ravi Kumar' })
  fullName: string;

  @ApiProperty({
    example: 'Kumar Electricals',
    required: false,
    nullable: true,
  })
  businessName: string | null;

  @ApiProperty({
    example:
      'Licensed electrician, 8 years residential and commercial wiring experience',
    required: false,
    nullable: true,
  })
  bio: string | null;

  @ApiProperty({ example: 8, required: false, nullable: true })
  experienceYears: number | null;

  @ApiProperty({ example: 'kn' })
  preferredLanguage: string;

  @ApiProperty({ example: true })
  notificationOptIn: boolean;

  @ApiProperty({ enum: ProviderStatus, example: ProviderStatus.PENDING })
  status: ProviderStatus;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.UNVERIFIED,
  })
  verificationStatus: VerificationStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
