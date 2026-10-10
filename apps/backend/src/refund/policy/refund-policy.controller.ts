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
import { RefundPolicyService } from './refund-policy.service';
import { CreateRefundPolicyDto } from './dto/create-refund-policy.dto';
import { UpdateRefundPolicyDto } from './dto/update-refund-policy.dto';
import { ListRefundPoliciesQueryDto } from './dto/list-refund-policies-query.dto';
import { RefundPolicyDto } from './dto/responses/refund-policy.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Refund')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'refund/policies', version: '1' })
export class RefundPolicyController {
  constructor(private readonly refundPolicyService: RefundPolicyService) {}

  @Post()
  @RequirePermissions('refund.policy.manage')
  @ApiOperation({
    summary: 'Create a refund policy for a given reason at a given scope',
  })
  @ApiOkResponse({ type: RefundPolicyDto })
  @ApiNotFoundResponse({
    description:
      'Referenced category/service/provider/town-village does not exist',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'An active policy already exists for this reason at this exact scope',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateRefundPolicyDto) {
    return this.refundPolicyService.create(dto);
  }

  @Get()
  @RequirePermissions('refund.policy.view')
  @ApiOperation({
    summary:
      'List refund policies, optionally filtered by scope type and/or reason',
  })
  @ApiOkResponse({ type: RefundPolicyDto, isArray: true })
  list(@Query() query: ListRefundPoliciesQueryDto) {
    return this.refundPolicyService.list(query.scopeType, query.reason);
  }

  @Get(':id')
  @RequirePermissions('refund.policy.view')
  @ApiOperation({ summary: 'Get one refund policy' })
  @ApiOkResponse({ type: RefundPolicyDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.refundPolicyService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('refund.policy.manage')
  @ApiOperation({
    summary: "Update a policy's refund percentage or active state",
  })
  @ApiOkResponse({ type: RefundPolicyDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description:
      'Reactivating would collide with another active policy for the same reason at the same scope',
    type: ErrorResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: UpdateRefundPolicyDto) {
    return this.refundPolicyService.update(id, dto);
  }
}
