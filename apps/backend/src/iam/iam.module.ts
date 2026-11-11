import { Module } from '@nestjs/common';
import { RoleController } from './role/role.controller';
import { RoleService } from './role/role.service';
import { PermissionController } from './permission/permission.controller';
import { PermissionService } from './permission/permission.service';
import { RoleAssignmentController } from './assignment/role-assignment.controller';
import { RoleAssignmentService } from './assignment/role-assignment.service';
import { AuthorizationService } from './authorization/authorization.service';
import { PermissionsGuard } from './authorization/permissions.guard';

@Module({
  controllers: [RoleController, PermissionController, RoleAssignmentController],
  providers: [
    RoleService,
    PermissionService,
    RoleAssignmentService,
    AuthorizationService,
    PermissionsGuard,
  ],
  // PermissionsGuard is exported so other modules can @UseGuards(PermissionsGuard)
  // after importing IamModule — see docs/modules/IAM_IMPLEMENTATION.md §7.
  exports: [AuthorizationService, PermissionsGuard],
})
export class IamModule {}
