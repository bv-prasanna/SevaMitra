import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/** Omitting permissionKeys leaves the role's current bundle untouched; passing it replaces the bundle wholesale. */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
