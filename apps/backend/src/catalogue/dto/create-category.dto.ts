import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Home Repair & Maintenance' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    example: 'Plumbing, electrical, carpentry, painting, masonry',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
