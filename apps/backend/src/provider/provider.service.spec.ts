import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProviderStatus, VerificationStatus } from '@prisma/client';
import { ProviderService } from './provider.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('ProviderService', () => {
  let prisma: {
    providerProfile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: ProviderService;

  beforeEach(() => {
    prisma = {
      providerProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new ProviderService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('rejects when a profile already exists for this user', async () => {
      prisma.providerProfile.findUnique.mockResolvedValue({ id: 'profile-1' });

      await expect(
        service.create('user-1', { fullName: 'Ravi Kumar' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.providerProfile.create).not.toHaveBeenCalled();
    });

    it('creates a profile defaulting to PENDING/UNVERIFIED (schema defaults, not set explicitly here)', async () => {
      prisma.providerProfile.findUnique.mockResolvedValue(null);
      prisma.providerProfile.create.mockResolvedValue({ id: 'profile-1' });

      await service.create('user-1', { fullName: 'Ravi Kumar' });

      expect(prisma.providerProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          fullName: 'Ravi Kumar',
          businessName: undefined,
          bio: undefined,
          experienceYears: undefined,
          preferredLanguage: undefined,
          notificationOptIn: undefined,
        },
      });
    });
  });

  describe('getActiveProfileOrThrow', () => {
    it('throws NotFound when no profile exists', async () => {
      prisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getActiveProfileOrThrow('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFound for a soft-deleted profile', async () => {
      prisma.providerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        status: ProviderStatus.DELETED,
      });

      await expect(service.getActiveProfileOrThrow('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns a PENDING profile (not just ACTIVE ones — only DELETED is excluded)', async () => {
      const profile = { id: 'profile-1', status: ProviderStatus.PENDING };
      prisma.providerProfile.findUnique.mockResolvedValue(profile);

      await expect(service.getActiveProfileOrThrow('user-1')).resolves.toBe(
        profile,
      );
    });
  });

  describe('softDelete', () => {
    it('anonymizes the profile in place', async () => {
      prisma.providerProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        status: ProviderStatus.ACTIVE,
      });
      prisma.providerProfile.update.mockResolvedValue({});

      await service.softDelete('user-1');

      expect(prisma.providerProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: expect.objectContaining({
          status: ProviderStatus.DELETED,
          fullName: 'Deleted Provider',
          businessName: null,
          bio: null,
          notificationOptIn: false,
        }),
      });
    });
  });

  describe('findById', () => {
    it('throws NotFound for a missing profile', async () => {
      prisma.providerProfile.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the profile when found', async () => {
      const profile = { id: 'profile-1' };
      prisma.providerProfile.findUnique.mockResolvedValue(profile);

      await expect(service.findById('profile-1')).resolves.toBe(profile);
    });
  });

  describe('markVerified', () => {
    it('sets status ACTIVE and verificationStatus VERIFIED', async () => {
      prisma.providerProfile.update.mockResolvedValue({});

      await service.markVerified('profile-1');

      expect(prisma.providerProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: {
          status: ProviderStatus.ACTIVE,
          verificationStatus: VerificationStatus.VERIFIED,
        },
      });
    });
  });

  describe('markRejected', () => {
    it('sets verificationStatus REJECTED without touching status', async () => {
      prisma.providerProfile.update.mockResolvedValue({});

      await service.markRejected('profile-1');

      expect(prisma.providerProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: { verificationStatus: VerificationStatus.REJECTED },
      });
    });
  });
});
