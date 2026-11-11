import { ApiProperty } from '@nestjs/swagger';
import { VariantDto } from './variant.dto';

export class ServiceDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  categoryId: string;

  @ApiProperty({ example: 'Ceiling Fan Installation' })
  name: string;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty({ required: false, nullable: true })
  exclusionsNote: string | null;

  @ApiProperty({ example: 45, required: false, nullable: true })
  expectedDurationMinutes: number | null;

  @ApiProperty({ required: false, nullable: true })
  customerPreparationNote: string | null;

  @ApiProperty({ required: false, nullable: true })
  providerSkillNote: string | null;

  @ApiProperty({ type: [String], example: ['electrical', 'installation'] })
  tags: string[];

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: [VariantDto], required: false })
  variants?: VariantDto[];
}
