import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';
import { PaymentService } from '../payment.service';
import { ListPaymentsQueryDto } from '../dto/list-payments-query.dto';
import { PaymentDto } from '../dto/responses/payment.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Payment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'payments/provider/me', version: '1' })
export class ProviderPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiOperation({
    summary: "List payments against the current provider's bookings",
  })
  @ApiOkResponse({ type: PaymentDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.paymentService.listAsProvider(
      user.id,
      query.status,
      query.bookingId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current provider's payments" })
  @ApiOkResponse({ type: PaymentDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paymentService.findAsProvider(user.id, id);
  }

  @Post(':id/mark-collected')
  @ApiOperation({
    summary: 'Record that a CASH payment was physically collected',
  })
  @ApiOkResponse({ type: PaymentDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Payment is not CASH, or is not in INITIATED status',
    type: ErrorResponseDto,
  })
  markCollected(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.paymentService.markCashCollectedAsProvider(user.id, id);
  }
}
