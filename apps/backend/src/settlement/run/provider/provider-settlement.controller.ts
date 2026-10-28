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
import { SettlementService } from '../settlement.service';
import { SettlementDto } from '../dto/responses/settlement.dto';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto';

@ApiTags('Settlement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'settlement/provider/me', version: '1' })
export class ProviderSettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get()
  @ApiOperation({ summary: "List the current provider's own settlements" })
  @ApiOkResponse({ type: SettlementDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.settlementService.listAsProvider(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Get one of the current provider's own settlements",
  })
  @ApiOkResponse({ type: SettlementDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.settlementService.findAsProvider(user.id, id);
  }
}
