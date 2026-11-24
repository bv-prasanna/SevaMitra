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
import { CommissionRuleService } from './commission-rule.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';
import { ListCommissionRulesQueryDto } from './dto/list-commission-rules-query.dto';
import { CommissionRuleDto } from './dto/responses/commission-rule.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'commission/rules', version: '1' })
export class CommissionRuleController {
  constructor(private readonly commissionRuleService: CommissionRuleService) {}

  @Post()
  @RequirePermissions('commission.rule.manage')
  @ApiOperation({ summary: 'Create a commission rule at a given scope' })
  @ApiOkResponse({ type: CommissionRuleDto })
  @ApiNotFoundResponse({
    description:
      'Referenced category/service/provider/town-village does not exist',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'An active rule already exists at this exact scope',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateCommissionRuleDto) {
    return this.commissionRuleService.create(dto);
  }

  @Get()
  @RequirePermissions('commission.rule.view')
  @ApiOperation({
    summary: 'List commission rules, optionally filtered by scope type',
  })
  @ApiOkResponse({ type: CommissionRuleDto, isArray: true })
  list(@Query() query: ListCommissionRulesQueryDto) {
    return this.commissionRuleService.list(query.scopeType);
  }

  @Get(':id')
  @RequirePermissions('commission.rule.view')
  @ApiOperation({ summary: 'Get one commission rule' })
  @ApiOkResponse({ type: CommissionRuleDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.commissionRuleService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('commission.rule.manage')
  @ApiOperation({
    summary:
      "Update a rule's rate or active state (no isActive-only DELETE — see docs)",
  })
  @ApiOkResponse({ type: CommissionRuleDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description:
      "Rate field does not match the rule's commissionType, or reactivating would collide with another active rule at the same scope",
    type: ErrorResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: UpdateCommissionRuleDto) {
    return this.commissionRuleService.update(id, dto);
  }
}
