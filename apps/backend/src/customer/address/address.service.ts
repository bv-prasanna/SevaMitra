import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomerAddress } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerService } from '../customer.service';
import { CreateAddressDto } from '../dto/create-address.dto';
import { UpdateAddressDto } from '../dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
  ) {}

  async create(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<CustomerAddress> {
    const profile = await this.customerService.getActiveProfileOrThrow(userId);
    const existingCount = await this.prisma.customerAddress.count({
      where: { customerId: profile.id },
    });
    const isDefault = dto.isDefault === true || existingCount === 0;

    if (isDefault && existingCount > 0) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId: profile.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.create({
      data: {
        customerId: profile.id,
        label: dto.label,
        line1: dto.line1,
        line2: dto.line2,
        landmark: dto.landmark,
        town: dto.town,
        district: dto.district,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault,
      },
    });
  }

  async list(userId: string): Promise<CustomerAddress[]> {
    const profile = await this.customerService.getActiveProfileOrThrow(userId);
    return this.prisma.customerAddress.findMany({
      where: { customerId: profile.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(userId: string, addressId: string): Promise<CustomerAddress> {
    const profile = await this.customerService.getActiveProfileOrThrow(userId);
    return this.getOwnedAddressOrThrow(profile.id, addressId);
  }

  async update(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<CustomerAddress> {
    const profile = await this.customerService.getActiveProfileOrThrow(userId);
    await this.getOwnedAddressOrThrow(profile.id, addressId);

    if (dto.isDefault === true) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId: profile.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        label: dto.label,
        line1: dto.line1,
        line2: dto.line2,
        landmark: dto.landmark,
        town: dto.town,
        district: dto.district,
        state: dto.state,
        pincode: dto.pincode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: dto.isDefault,
      },
    });
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const profile = await this.customerService.getActiveProfileOrThrow(userId);
    await this.getOwnedAddressOrThrow(profile.id, addressId);
    await this.prisma.customerAddress.delete({ where: { id: addressId } });
  }

  /** Ownership check collapsed into a 404 (not 403) — never confirms another customer's address exists. */
  private async getOwnedAddressOrThrow(
    customerId: string,
    addressId: string,
  ): Promise<CustomerAddress> {
    const address = await this.prisma.customerAddress.findUnique({
      where: { id: addressId },
    });
    if (!address || address.customerId !== customerId) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }
}
