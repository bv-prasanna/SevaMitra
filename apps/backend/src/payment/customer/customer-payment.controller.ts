import {
  Body,
  Controller,
  Get,
  Param,
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';
import { PaymentService } from '../payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';
import { ListPaymentsQueryDto } from '../dto/list-payments-query.dto';
import { PaymentDto } from '../dto/responses/payment.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Payment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'payments/me', version: '1' })
export class CustomerPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({
    summary: 'Initiate a payment against one of your own bookings',
  })
  @ApiOkResponse({ type: PaymentDto })
  @ApiNotFoundResponse({
    description: 'Booking not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description:
      'Booking cannot accept payment, or the amount exceeds the outstanding balance',
    type: ErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.initiateAsCustomer(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payments you have made' })
  @ApiOkResponse({ type: PaymentDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.paymentService.listAsCustomer(
      user.id,
      query.status,
      query.bookingId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of your own payments' })
  @ApiOkResponse({ type: PaymentDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.paymentService.findAsCustomer(user.id, id);
  }

  @Post(':id/verify')
  @ApiOperation({
    summary:
      'Confirm an ONLINE payment after completing checkout with the gateway',
  })
  @ApiOkResponse({ type: PaymentDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Payment is not ONLINE, or is not in INITIATED status',
    type: ErrorResponseDto,
  })
  verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentService.verifyAsCustomer(user.id, id, dto);
  }
}
