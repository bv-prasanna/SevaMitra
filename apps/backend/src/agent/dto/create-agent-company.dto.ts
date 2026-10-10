import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAgentCompanyDto {
  @ApiProperty({ example: 'Karnataka Field Partners Pvt Ltd' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'U74999KA2024PTC123456', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;
}
