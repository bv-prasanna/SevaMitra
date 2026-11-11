import { ApiProperty } from '@nestjs/swagger';
import { OnboardingStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListApplicationsQueryDto {
  @ApiProperty({ enum: OnboardingStatus, required: false })
  @IsOptional()
  @IsEnum(OnboardingStatus)
  status?: OnboardingStatus;
}
