import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Taluk Ops Manager' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'Manages bookings and providers within a taluk',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    type: [String],
    example: ['iam.role.view'],
    description:
      'Permission keys from GET /iam/permissions to bundle into this role',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys?: string[];
}
