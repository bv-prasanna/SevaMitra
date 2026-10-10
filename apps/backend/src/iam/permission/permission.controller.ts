import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../authorization/permissions.guard';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { PermissionService } from './permission.service';
import { PermissionDto } from '../dto/responses/permission.dto';

@ApiTags('IAM')
@ApiBearerAuth()
@Controller({ path: 'iam/permissions', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @RequirePermissions('iam.permission.view')
  @ApiOperation({ summary: 'List the fixed permission catalog' })
  @ApiOkResponse({ type: PermissionDto, isArray: true })
  list() {
    return this.permissionService.list();
  }
}
