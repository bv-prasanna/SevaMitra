import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../auth/token/jwt-payload.interface';
import { CommissionCalculationService } from '../commission-calculation.service';
import { CommissionCalculationDto } from '../dto/responses/commission-calculation.dto';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto';

@ApiTags('Commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'commission/calculations/provider/me', version: '1' })
export class ProviderCommissionController {
  constructor(
    private readonly commissionCalculationService: CommissionCalculationService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "List the commission/earning breakdown for the current provider's own bookings",
  })
  @ApiOkResponse({ type: CommissionCalculationDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.commissionCalculationService.listAsProvider(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Get one of the current provider's own commission calculations",
  })
  @ApiOkResponse({ type: CommissionCalculationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.commissionCalculationService.findAsProvider(user.id, id);
  }
}
