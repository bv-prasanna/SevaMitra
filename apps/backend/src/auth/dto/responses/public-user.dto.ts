import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class PublicUserDto {
  @ApiProperty({ example: '5f2c9e34-2b7b-4d3a-9f1a-6a2f0c8b91d4' })
  id: string;

  @ApiProperty({ example: '+919876543210', nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ example: null, nullable: true })
  email: string | null;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;
}
