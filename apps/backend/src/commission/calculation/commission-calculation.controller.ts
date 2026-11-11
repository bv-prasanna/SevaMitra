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
import { CommissionCalculationService } from './commission-calculation.service';
import { CalculateCommissionDto } from './dto/calculate-commission.dto';
import { CommissionCalculationDto } from './dto/responses/commission-calculation.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'commission/calculations', version: '1' })
export class CommissionCalculationController {
  constructor(
    private readonly commissionCalculationService: CommissionCalculationService,
  ) {}

  @Post()
  @RequirePermissions('commission.calculation.manage')
  @ApiOperation({
    summary: 'Calculate and record the commission for a COMPLETED booking',
  })
  @ApiOkResponse({ type: CommissionCalculationDto })
  @ApiNotFoundResponse({
    description: 'Booking not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Booking is not COMPLETED, already has a calculation, or no commission rule (not even a PLATFORM default) applies',
    type: ErrorResponseDto,
  })
  calculate(@Body() dto: CalculateCommissionDto) {
    return this.commissionCalculationService.calculate(dto.bookingId);
  }

  @Get()
  @RequirePermissions('commission.calculation.view')
  @ApiOperation({ summary: 'List all commission calculations' })
  @ApiOkResponse({ type: CommissionCalculationDto, isArray: true })
  list() {
    return this.commissionCalculationService.list();
  }

  @Get(':id')
  @RequirePermissions('commission.calculation.view')
  @ApiOperation({ summary: 'Get one commission calculation' })
  @ApiOkResponse({ type: CommissionCalculationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.commissionCalculationService.findOne(id);
  }
}
