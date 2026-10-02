import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Booking, BookingParty, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerService } from '../customer/customer.service';
import { ProviderService } from '../provider/provider.service';
import { OfferingService } from '../provider-offering/offering.service';
import { TownVillageService } from '../geography/town-village/town-village.service';
import { CoverageCheckService } from '../serviceability/check/coverage-check.service';
import { AvailabilityCheckService } from '../availability/check/availability-check.service';
import { isTimeBefore } from '../common/util/time-of-day';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.REQUESTED,
  BookingStatus.ACCEPTED,
];

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly providerService: ProviderService,
    private readonly offeringService: OfferingService,
    private readonly townVillageService: TownVillageService,
    private readonly coverageCheckService: CoverageCheckService,
    private readonly availabilityCheckService: AvailabilityCheckService,
  ) {}

  // ---------------------------------------------------------------------
  // Customer-facing
  // ---------------------------------------------------------------------

  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);

    const offering = await this.offeringService.findOneActive(dto.offeringId);
    if (!offering.isActive) {
      throw new NotFoundException('Offering not found or inactive');
    }
    await this.townVillageService.findByIdOrThrow(dto.townVillageId);

    if (!isTimeBefore(dto.scheduledStartTime, dto.scheduledEndTime)) {
      throw new ConflictException(
        'scheduledStartTime must be before scheduledEndTime',
      );
    }

    const coverage = await this.coverageCheckService.isServiceable(
      offering.providerId,
      dto.townVillageId,
    );
    if (!coverage.serviceable) {
      throw new ConflictException(
        'This provider does not cover the requested location',
      );
    }

    const availability = await this.availabilityCheckService.getAvailability(
      offering.providerId,
      dto.scheduledDate,
    );
    const fitsAWindow = availability.windows.some(
      (w) => w.start <= dto.scheduledStartTime && dto.scheduledEndTime <= w.end,
    );
    if (!availability.available || !fitsAWindow) {
      throw new ConflictException(
        'This provider is not available at the requested time',
      );
    }

    return this.prisma.booking.create({
      data: {
        customerId: customer.id,
        offeringId: offering.id,
        townVillageId: dto.townVillageId,
        scheduledDate: new Date(dto.scheduledDate),
        scheduledStartTime: dto.scheduledStartTime,
        scheduledEndTime: dto.scheduledEndTime,
        pricingModel: offering.pricingModel,
        amount: offering.amount,
        visitFee: offering.visitFee,
        currency: offering.currency,
        notes: dto.notes,
      },
    });
  }

  async listAsCustomer(
    userId: string,
    status?: BookingStatus,
  ): Promise<Booking[]> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    return this.prisma.booking.findMany({
      where: { customerId: customer.id, status },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAsCustomer(userId: string, id: string): Promise<Booking> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    return this.getOwnedByCustomerOrThrow(customer.id, id);
  }

  async cancelAsCustomer(
    userId: string,
    id: string,
    dto: CancelBookingDto,
  ): Promise<Booking> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    const booking = await this.getOwnedByCustomerOrThrow(customer.id, id);
    return this.applyCancellation(booking, BookingParty.CUSTOMER, dto.reason);
  }

  async reportProviderNoShow(userId: string, id: string): Promise<Booking> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    const booking = await this.getOwnedByCustomerOrThrow(customer.id, id);
    return this.applyNoShow(booking, BookingParty.PROVIDER);
  }

  async confirmCompletionAsCustomer(
    userId: string,
    id: string,
  ): Promise<Booking> {
    const customer = await this.customerService.getActiveProfileOrThrow(userId);
    const booking = await this.getOwnedByCustomerOrThrow(customer.id, id);
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ConflictException(
        'Booking has not been marked complete by the provider yet',
      );
    }
    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { customerConfirmedCompletionAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------
  // Provider-facing
  // ---------------------------------------------------------------------

  async listAsProvider(
    userId: string,
    status?: BookingStatus,
  ): Promise<Booking[]> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.prisma.booking.findMany({
      where: { offering: { providerId: provider.id }, status },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAsProvider(userId: string, id: string): Promise<Booking> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    return this.getOwnedByProviderOrThrow(provider.id, id);
  }

  async acceptAsProvider(userId: string, id: string): Promise<Booking> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const booking = await this.getOwnedByProviderOrThrow(provider.id, id);
    return this.applyTransition(booking, [BookingStatus.REQUESTED], {
      status: BookingStatus.ACCEPTED,
    });
  }

  async rejectAsProvider(
    userId: string,
    id: string,
    dto: RejectBookingDto,
  ): Promise<Booking> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const booking = await this.getOwnedByProviderOrThrow(provider.id, id);
    return this.applyTransition(booking, [BookingStatus.REQUESTED], {
      status: BookingStatus.REJECTED,
      rejectionReason: dto.reason,
    });
  }

  async cancelAsProvider(
    userId: string,
    id: string,
    dto: CancelBookingDto,
  ): Promise<Booking> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const booking = await this.getOwnedByProviderOrThrow(provider.id, id);
    return this.applyCancellation(booking, BookingParty.PROVIDER, dto.reason);
  }

  async reportCustomerNoShow(userId: string, id: string): Promise<Booking> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const booking = await this.getOwnedByProviderOrThrow(provider.id, id);
    return this.applyNoShow(booking, BookingParty.CUSTOMER);
  }

  async completeAsProvider(userId: string, id: string): Promise<Booking> {
    const provider = await this.providerService.getActiveProfileOrThrow(userId);
    const booking = await this.getOwnedByProviderOrThrow(provider.id, id);
    return this.applyTransition(booking, [BookingStatus.ACCEPTED], {
      status: BookingStatus.COMPLETED,
      providerConfirmedCompletionAt: new Date(),
    });
  }

  // ---------------------------------------------------------------------
  // Admin / system (no ownership check — for cross-cutting modules like
  // Commission that operate on a booking regardless of which party made it)
  // ---------------------------------------------------------------------

  async findByIdOrThrow(id: string): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  // ---------------------------------------------------------------------
  // Shared
  // ---------------------------------------------------------------------

  private applyCancellation(
    booking: Booking,
    party: BookingParty,
    reason: string | undefined,
  ): Promise<Booking> {
    return this.applyTransition(booking, ACTIVE_STATUSES, {
      status: BookingStatus.CANCELLED,
      cancelledBy: party,
      cancelledAt: new Date(),
      cancellationReason: reason,
    });
  }

  private applyNoShow(
    booking: Booking,
    noShowParty: BookingParty,
  ): Promise<Booking> {
    return this.applyTransition(booking, [BookingStatus.ACCEPTED], {
      status: BookingStatus.NO_SHOW,
      noShowBy: noShowParty,
    });
  }

  private applyTransition(
    booking: Booking,
    allowedFrom: BookingStatus[],
    data: Prisma.BookingUncheckedUpdateInput,
  ): Promise<Booking> {
    if (!allowedFrom.includes(booking.status)) {
      throw new ConflictException(
        `Booking cannot move to this state from its current status (${booking.status})`,
      );
    }
    return this.prisma.booking.update({ where: { id: booking.id }, data });
  }

  private async getOwnedByCustomerOrThrow(
    customerId: string,
    id: string,
  ): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.customerId !== customerId) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  private async getOwnedByProviderOrThrow(
    providerId: string,
    id: string,
  ): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { offering: true },
    });
    if (!booking || booking.offering.providerId !== providerId) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }
}
