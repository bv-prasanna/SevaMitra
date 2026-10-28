import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/token/jwt-payload.interface';
import { PermissionsGuard } from '../iam/authorization/permissions.guard';
import { RequirePermissions } from '../iam/authorization/require-permissions.decorator';
import { RuntimeFlagsService } from './runtime-flags.service';
import { SetRuntimeFlagDto } from './dto/set-runtime-flag.dto';

@ApiTags('Runtime flags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('iam.role.manage')
@Controller({ path: 'runtime-flags', version: '1' })
export class RuntimeFlagsController {
  constructor(private readonly flags: RuntimeFlagsService) {}

  @Get()
  list() {
    return this.flags.list();
  }

  @Put(':key')
  set(@Param('key') key: string, @Body() dto: SetRuntimeFlagDto,
      @CurrentUser() actor: AuthenticatedUser) {
    return this.flags.set(key, dto.enabled, dto.reason, actor.id);
  }
}
