import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../iam/authorization/permissions.guard';
import { RequirePermissions } from '../iam/authorization/require-permissions.decorator';
import { AuditService } from './audit.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLogDto } from './dto/responses/audit-log.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('audit.view')
@Controller({ path: 'audit/logs', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary:
      'List recent audit log entries, newest first (capped at 100 rows, no pagination yet)',
  })
  @ApiOkResponse({ type: AuditLogDto, isArray: true })
  list(@Query() query: ListAuditLogsQueryDto) {
    return this.auditService.list(query.actorUserId);
  }
}
