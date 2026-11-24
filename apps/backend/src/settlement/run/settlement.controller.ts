import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';
import { ResolveSettlementDto } from './dto/resolve-settlement.dto';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../iam/authorization/permissions.guard';
import { RequirePermissions } from '../../iam/authorization/require-permissions.decorator';
import { SettlementService } from './settlement.service';
import { RunSettlementDto } from './dto/run-settlement.dto';
import { SettlementDto } from './dto/responses/settlement.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Settlement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'settlement', version: '1' })
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post('run')
  @RequirePermissions('settlement.manage')
  @ApiOperation({
    summary:
      'Run a settlement payout for a provider, covering every commission calculation not yet settled',
  })
  @ApiOkResponse({ type: SettlementDto })
  @ApiNotFoundResponse({
    description: 'Provider not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Nothing unsettled for this provider',
    type: ErrorResponseDto,
  })
  run(@Body() dto: RunSettlementDto) {
    return this.settlementService.run(dto.providerId);
  }

  @Post(':id/resolve')
  @RequirePermissions('settlement.manage')
  @ApiOperation({ summary: 'Manually resolve an UNKNOWN payout after checking provider evidence' })
  @ApiOkResponse({ type: SettlementDto })
  @ApiConflictResponse({ description: 'Only UNKNOWN settlements can be manually resolved', type: ErrorResponseDto })
  resolve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveSettlementDto,
  ) {
    return this.settlementService.resolveManual(id, user.id, dto.outcome, dto.note);
  }

  @Get()
  @RequirePermissions('settlement.view')
  @ApiOperation({ summary: 'List all settlements' })
  @ApiOkResponse({ type: SettlementDto, isArray: true })
  list() {
    return this.settlementService.list();
  }

  @Get(':id')
  @RequirePermissions('settlement.view')
  @ApiOperation({ summary: 'Get one settlement' })
  @ApiOkResponse({ type: SettlementDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.settlementService.findOne(id);
  }
}
