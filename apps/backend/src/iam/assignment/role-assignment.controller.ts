import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';
import { PermissionsGuard } from '../authorization/permissions.guard';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { RoleAssignmentService } from './role-assignment.service';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { RoleAssignmentDto } from '../dto/responses/role-assignment.dto';

@ApiTags('IAM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ version: '1' })
export class RoleAssignmentController {
  constructor(private readonly assignmentService: RoleAssignmentService) {}

  @Post('iam/assignments')
  @RequirePermissions('iam.assignment.manage')
  @ApiOperation({
    summary:
      'Assign a role (with scope) to a user — idempotent for an identical active assignment',
  })
  @ApiOkResponse({ type: RoleAssignmentDto })
  assign(@Body() dto: AssignRoleDto, @CurrentUser() caller: AuthenticatedUser) {
    return this.assignmentService.assign(dto, caller.id);
  }

  @Delete('iam/assignments/:id')
  @RequirePermissions('iam.assignment.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a role assignment' })
  @ApiNoContentResponse()
  async revoke(@Param('id') id: string) {
    await this.assignmentService.revoke(id);
  }

  @Get('iam/users/:userId/assignments')
  @RequirePermissions('iam.assignment.view')
  @ApiOperation({
    summary: "List a user's role assignments (active and revoked)",
  })
  @ApiOkResponse({ type: RoleAssignmentDto, isArray: true })
  listForUser(@Param('userId') userId: string) {
    return this.assignmentService.listForUser(userId);
  }
}
