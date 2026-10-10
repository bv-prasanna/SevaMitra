import { ApiProperty } from '@nestjs/swagger';
import { CustomerStatus } from '@prisma/client';

export class CustomerProfileDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ example: 'Ananya Sharma' })
  fullName: string;

  @ApiProperty({ example: 'kn' })
  preferredLanguage: string;

  @ApiProperty({ example: true })
  notificationOptIn: boolean;

  @ApiProperty({ enum: CustomerStatus, example: CustomerStatus.ACTIVE })
  status: CustomerStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
