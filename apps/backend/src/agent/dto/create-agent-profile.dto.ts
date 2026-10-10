import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAgentProfileDto {
  @ApiProperty({ example: 'Suresh Gowda' })
  @IsString()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    required: false,
    description:
      'An existing, active AgentCompany id — omit for an individual agent',
  })
  @IsOptional()
  @IsUUID()
  agentCompanyId?: string;

  @ApiProperty({
    example: 'Mysuru taluk',
    required: false,
    description:
      'Free text for now — no Geography module to normalize against yet',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  geographyNote?: string;

  @ApiProperty({
    example: 'kn',
    required: false,
    description:
      'Language code — Kannada (kn) is the pilot default (BRD §30.4/§44)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  notificationOptIn?: boolean;
}
