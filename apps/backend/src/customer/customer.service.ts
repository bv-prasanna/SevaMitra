import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerProfile, CustomerStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerProfileDto } from './dto/create-customer-profile.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

const ANONYMIZED_NAME = 'Deleted Customer';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateCustomerProfileDto,
  ): Promise<CustomerProfile> {
    const existing = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Customer profile already exists');
    }

    return this.prisma.customerProfile.create({
      data: {
        userId,
        fullName: dto.fullName,
        preferredLanguage: dto.preferredLanguage,
        notificationOptIn: dto.notificationOptIn,
      },
    });
  }

  async findByUserId(userId: string): Promise<CustomerProfile> {
    return this.getActiveProfileOrThrow(userId);
  }

  async update(
    userId: string,
    dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfile> {
    const profile = await this.getActiveProfileOrThrow(userId);

    return this.prisma.customerProfile.update({
      where: { id: profile.id },
      data: {
        fullName: dto.fullName,
        preferredLanguage: dto.preferredLanguage,
        notificationOptIn: dto.notificationOptIn,
      },
    });
  }

  /**
   * BRD §14.4: account deletion anonymizes PII rather than deleting the
   * row — a future Booking module will hold a durable customerId
   * reference. Addresses carry no such retention need, so they're hard-
   * deleted.
   */
  async softDelete(userId: string): Promise<void> {
    const profile = await this.getActiveProfileOrThrow(userId);

    await this.prisma.$transaction([
      this.prisma.customerAddress.deleteMany({
        where: { customerId: profile.id },
      }),
      this.prisma.customerProfile.update({
        where: { id: profile.id },
        data: {
          status: CustomerStatus.DELETED,
          deletedAt: new Date(),
          fullName: ANONYMIZED_NAME,
          preferredLanguage: 'kn',
          notificationOptIn: false,
        },
      }),
    ]);
  }

  /** Internal — used by AddressService to resolve the owning profile. Treats a soft-deleted profile as not found. */
  async getActiveProfileOrThrow(userId: string): Promise<CustomerProfile> {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (!profile || profile.status === CustomerStatus.DELETED) {
      throw new NotFoundException(
        'Customer profile not found — create one first (POST /customers/me)',
      );
    }
    return profile;
  }
}
