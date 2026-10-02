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
import { BookingService } from '../booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { ListBookingsQueryDto } from '../dto/list-bookings-query.dto';
import { BookingDto } from '../dto/responses/booking.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'bookings/me', version: '1' })
export class CustomerBookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({
    summary:
      'Book a specific offering — checks the provider is serviceable and available first',
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiConflictResponse({
    description:
      'Provider does not cover the location, is not available at that time, or the times are invalid',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'No customer profile, or offeringId/townVillageId does not exist',
    type: ErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bookings made by the current customer' })
  @ApiOkResponse({ type: BookingDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingService.listAsCustomer(user.id, query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current customer's bookings" })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingService.findAsCustomer(user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a REQUESTED or ACCEPTED booking' })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Booking is not cancellable from its current status',
    type: ErrorResponseDto,
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelAsCustomer(user.id, id, dto);
  }

  @Post(':id/report-no-show')
  @ApiOperation({
    summary: 'Report that the provider did not show up for an ACCEPTED booking',
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  reportNoShow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.bookingService.reportProviderNoShow(user.id, id);
  }

  @Post(':id/confirm-completion')
  @ApiOperation({
    summary:
      "Acknowledge a COMPLETED booking — corroborates the provider's completion, does not change status",
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Booking is not COMPLETED yet',
    type: ErrorResponseDto,
  })
  confirmCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.bookingService.confirmCompletionAsCustomer(user.id, id);
  }
}
