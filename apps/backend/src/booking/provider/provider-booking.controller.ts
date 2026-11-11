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
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { RejectBookingDto } from '../dto/reject-booking.dto';
import { ListBookingsQueryDto } from '../dto/list-bookings-query.dto';
import { BookingDto } from '../dto/responses/booking.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Booking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'bookings/provider/me', version: '1' })
export class ProviderBookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @ApiOperation({
    summary: "List bookings against the current provider's offerings",
  })
  @ApiOkResponse({ type: BookingDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingService.listAsProvider(user.id, query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current provider's bookings" })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingService.findAsProvider(user.id, id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a REQUESTED booking' })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Booking is not in REQUESTED status',
    type: ErrorResponseDto,
  })
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingService.acceptAsProvider(user.id, id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a REQUESTED booking' })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Booking is not in REQUESTED status',
    type: ErrorResponseDto,
  })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectBookingDto,
  ) {
    return this.bookingService.rejectAsProvider(user.id, id, dto);
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
    return this.bookingService.cancelAsProvider(user.id, id, dto);
  }

  @Post(':id/report-no-show')
  @ApiOperation({
    summary: 'Report that the customer did not show up for an ACCEPTED booking',
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  reportNoShow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.bookingService.reportCustomerNoShow(user.id, id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark an ACCEPTED booking as completed' })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Booking is not in ACCEPTED status',
    type: ErrorResponseDto,
  })
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.bookingService.completeAsProvider(user.id, id);
  }
}
