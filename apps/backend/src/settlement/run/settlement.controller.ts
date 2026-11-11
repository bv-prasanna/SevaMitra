import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
