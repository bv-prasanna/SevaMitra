import { ApiProperty } from '@nestjs/swagger';
import { CoverageStatus } from '@prisma/client';

export class CoverageAreaDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  providerId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  townVillageId: string;

  @ApiProperty({ enum: CoverageStatus, example: CoverageStatus.PENDING })
  status: CoverageStatus;

  @ApiProperty({ example: null, required: false, nullable: true })
  reviewedBy: string | null;

  @ApiProperty({ example: null, required: false, nullable: true })
  reviewedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
