import { ApiProperty } from '@nestjs/swagger';
import { ScopeType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsUUID()
  roleId: string;

  @ApiProperty({ enum: ScopeType, default: ScopeType.PLATFORM })
  @IsEnum(ScopeType)
  scopeType: ScopeType;

  @ApiProperty({
    example: null,
    required: false,
    nullable: true,
    description:
      "Opaque reference into another module's entity (e.g. a taluk id). Required unless scopeType=PLATFORM.",
  })
  @ValidateIf((dto: AssignRoleDto) => dto.scopeType !== ScopeType.PLATFORM)
  @IsString()
  @IsNotEmpty()
  scopeId?: string;
}
