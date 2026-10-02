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
import { RefundService } from '../refund.service';
import { RefundDto } from '../dto/responses/refund.dto';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto';

@ApiTags('Refund')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'refund/me', version: '1' })
export class CustomerRefundController {
  constructor(private readonly refundService: RefundService) {}

  @Get()
  @ApiOperation({ summary: "List the current customer's own refunds" })
  @ApiOkResponse({ type: RefundDto, isArray: true })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.refundService.listAsCustomer(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current customer's own refunds" })
  @ApiOkResponse({ type: RefundDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.refundService.findAsCustomer(user.id, id);
  }
}
