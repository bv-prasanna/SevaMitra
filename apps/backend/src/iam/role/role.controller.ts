import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { PermissionsGuard } from '../authorization/permissions.guard';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { RoleService } from './role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleDto } from '../dto/responses/role.dto';

@ApiTags('IAM')
@ApiBearerAuth()
@Controller({ path: 'iam/roles', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions('iam.role.manage')
  @ApiOperation({ summary: 'Create a role with an initial permission bundle' })
  @ApiOkResponse({ type: RoleDto })
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Get()
  @RequirePermissions('iam.role.view')
  @ApiOperation({ summary: 'List all roles' })
  @ApiOkResponse({ type: RoleDto, isArray: true })
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  @RequirePermissions('iam.role.view')
  @ApiOperation({ summary: 'Get a role by id' })
  @ApiOkResponse({ type: RoleDto })
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('iam.role.manage')
  @ApiOperation({
    summary:
      'Update a role — omitting permissionKeys leaves the bundle unchanged, passing it replaces the bundle wholesale',
    description: 'System roles cannot be modified',
  })
  @ApiOkResponse({ type: RoleDto })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('iam.role.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete a role — fails if it is a system role or has active assignments',
  })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string) {
    await this.roleService.remove(id);
  }
}
