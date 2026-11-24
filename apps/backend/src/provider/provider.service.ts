import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProviderProfile,
  ProviderStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';

const ANONYMIZED_NAME = 'Deleted Provider';

@Injectable()
export class ProviderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateProviderProfileDto,
  ): Promise<ProviderProfile> {
    const existing = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Provider profile already exists');
    }

    return this.prisma.providerProfile.create({
      data: {
        userId,
        fullName: dto.fullName,
        businessName: dto.businessName,
        bio: dto.bio,
        experienceYears: dto.experienceYears,
        preferredLanguage: dto.preferredLanguage,
        notificationOptIn: dto.notificationOptIn,
      },
    });
  }

  async findByUserId(userId: string): Promise<ProviderProfile> {
    return this.getActiveProfileOrThrow(userId);
  }

  async update(
    userId: string,
    dto: UpdateProviderProfileDto,
  ): Promise<ProviderProfile> {
    const profile = await this.getActiveProfileOrThrow(userId);

    return this.prisma.providerProfile.update({
      where: { id: profile.id },
      data: {
        fullName: dto.fullName,
        businessName: dto.businessName,
        bio: dto.bio,
        experienceYears: dto.experienceYears,
        preferredLanguage: dto.preferredLanguage,
        notificationOptIn: dto.notificationOptIn,
      },
    });
  }

  /** BRD §14.4: account deletion anonymizes PII rather than deleting the row — a future Booking/Settlement module will hold a durable providerId reference. */
  async softDelete(userId: string): Promise<void> {
    const profile = await this.getActiveProfileOrThrow(userId);

    await this.prisma.providerProfile.update({
      where: { id: profile.id },
      data: {
        status: ProviderStatus.DELETED,
        deletedAt: new Date(),
        fullName: ANONYMIZED_NAME,
        businessName: null,
        bio: null,
        preferredLanguage: 'kn',
        notificationOptIn: false,
      },
    });
  }

  /** Internal — for future modules (Offering, Booking) to resolve the owning profile. Treats a soft-deleted profile as not found. */
  async getActiveProfileOrThrow(userId: string): Promise<ProviderProfile> {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile || profile.status === ProviderStatus.DELETED) {
      throw new NotFoundException(
        'Provider profile not found — create one first (POST /providers/me)',
      );
    }
    return profile;
  }

  /** Internal — by profile id rather than userId, for modules (Provider Onboarding) that hold a providerId, not a userId. */
  async findById(id: string): Promise<ProviderProfile> {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id },
    });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }
    return profile;
  }

  /**
   * The only place ProviderStatus/VerificationStatus ever move off their
   * PENDING/UNVERIFIED defaults — called by Provider Onboarding once an
   * application is approved (see docs/modules/PROVIDER_ONBOARDING_IMPLEMENTATION.md
   * §4). Deliberately not reachable from any self-service DTO (§5 of the
   * Provider module's own docs) — only another module's service layer
   * calls this, never a controller directly.
   */
  markVerified(id: string): Promise<ProviderProfile> {
    return this.prisma.providerProfile.update({
      where: { id },
      data: {
        status: ProviderStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });
  }

  /** Records a rejected verification attempt. Leaves `status` at PENDING — rejection means "not verified yet", not "removed"; the provider may resubmit. */
  markRejected(id: string): Promise<ProviderProfile> {
    return this.prisma.providerProfile.update({
      where: { id },
      data: { verificationStatus: VerificationStatus.REJECTED },
    });
  }
}
