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
import { RefundService } from './refund.service';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { RefundDto } from './dto/responses/refund.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Refund')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'refund', version: '1' })
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post('process')
  @RequirePermissions('refund.manage')
  @ApiOperation({
    summary:
      "Process a refund for a booking's cancellation, no-show, or rejection",
  })
  @ApiOkResponse({ type: RefundDto })
  @ApiNotFoundResponse({
    description: 'Booking not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Booking is not in a refund-eligible status, already has a REFUNDED/PENDING refund, nothing was paid, or no refund policy (not even a PLATFORM default) applies',
    type: ErrorResponseDto,
  })
  process(@Body() dto: ProcessRefundDto) {
    return this.refundService.process(dto.bookingId);
  }

  @Get()
  @RequirePermissions('refund.view')
  @ApiOperation({ summary: 'List all refunds' })
  @ApiOkResponse({ type: RefundDto, isArray: true })
  list() {
    return this.refundService.list();
  }

  @Get(':id')
  @RequirePermissions('refund.view')
  @ApiOperation({ summary: 'Get one refund' })
  @ApiOkResponse({ type: RefundDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.refundService.findOne(id);
  }
}
