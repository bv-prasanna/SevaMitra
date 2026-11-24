import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { SettlementConfigService } from './settlement-config.service';
import { CreateSettlementConfigDto } from './dto/create-settlement-config.dto';
import { UpdateSettlementConfigDto } from './dto/update-settlement-config.dto';
import { ListSettlementConfigsQueryDto } from './dto/list-settlement-configs-query.dto';
import { SettlementConfigDto } from './dto/responses/settlement-config.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Settlement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'settlement/config', version: '1' })
export class SettlementConfigController {
  constructor(
    private readonly settlementConfigService: SettlementConfigService,
  ) {}

  @Post()
  @RequirePermissions('settlement.config.manage')
  @ApiOperation({
    summary: 'Configure the settlement cycle length at a given scope',
  })
  @ApiOkResponse({ type: SettlementConfigDto })
  @ApiNotFoundResponse({
    description:
      'Referenced category/service/provider/town-village does not exist',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'An active config already exists at this exact scope',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateSettlementConfigDto) {
    return this.settlementConfigService.create(dto);
  }

  @Get()
  @RequirePermissions('settlement.config.view')
  @ApiOperation({
    summary: 'List settlement configs, optionally filtered by scope type',
  })
  @ApiOkResponse({ type: SettlementConfigDto, isArray: true })
  list(@Query() query: ListSettlementConfigsQueryDto) {
    return this.settlementConfigService.list(query.scopeType);
  }

  @Get(':id')
  @RequirePermissions('settlement.config.view')
  @ApiOperation({ summary: 'Get one settlement config' })
  @ApiOkResponse({ type: SettlementConfigDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.settlementConfigService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('settlement.config.manage')
  @ApiOperation({ summary: "Update a config's cycle length or active state" })
  @ApiOkResponse({ type: SettlementConfigDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description:
      'Reactivating would collide with another active config at the same scope',
    type: ErrorResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: UpdateSettlementConfigDto) {
    return this.settlementConfigService.update(id, dto);
  }
}
