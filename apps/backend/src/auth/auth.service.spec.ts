import * as bcrypt from 'bcryptjs';
import { OtpPurpose, UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { RequestOtpPurpose } from './dto/request-otp.dto';
import type { PrismaService } from '../prisma/prisma.service';
import type { OtpService } from './otp/otp.service';
import type { TokenService } from './token/token.service';
import type { SocialAuthService } from './social/social-auth.service';

const testUser = {
  id: 'user-1',
  phoneNumber: '+919876543210',
  email: null,
  status: UserStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
    };
    credential: { findUnique: jest.Mock; upsert: jest.Mock };
    oauthIdentity: { findUnique: jest.Mock; create: jest.Mock };
  };
  let otpService: jest.Mocked<Pick<OtpService, 'requestOtp' | 'verifyOtp'>>;
  let tokenService: jest.Mocked<
    Pick<
      TokenService,
      | 'issueTokenPair'
      | 'signResetToken'
      | 'verifyResetToken'
      | 'revokeAllForUser'
      | 'rotateRefreshToken'
      | 'revokeRefreshToken'
    >
  >;
  let socialAuthService: jest.Mocked<
    Pick<SocialAuthService, 'verifyGoogleIdToken' | 'verifyAppleIdToken'>
  >;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
      credential: { findUnique: jest.fn(), upsert: jest.fn() },
      oauthIdentity: { findUnique: jest.fn(), create: jest.fn() },
    };
    otpService = {
      requestOtp: jest.fn(),
      verifyOtp: jest.fn().mockResolvedValue(undefined),
    };
    tokenService = {
      issueTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresIn: 900,
      }),
      signResetToken: jest.fn().mockReturnValue('reset-token'),
      verifyResetToken: jest.fn(),
      revokeAllForUser: jest.fn(),
      rotateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
    };
    socialAuthService = {
      verifyGoogleIdToken: jest.fn(),
      verifyAppleIdToken: jest.fn(),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      otpService as unknown as OtpService,
      tokenService as unknown as TokenService,
      socialAuthService,
    );
  });

  describe('requestOtp', () => {
    it('requires an existing account for PASSWORD_RESET', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestOtp({
          phoneNumber: '+919876543210',
          purpose: RequestOtpPurpose.PASSWORD_RESET,
        }),
      ).rejects.toThrow('No account found for this phone number');

      expect(otpService.requestOtp).not.toHaveBeenCalled();
    });

    it('does not require an existing account for LOGIN (auto-register)', async () => {
      await service.requestOtp({
        phoneNumber: '+919876543210',
        purpose: RequestOtpPurpose.LOGIN,
      });

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(otpService.requestOtp).toHaveBeenCalledWith(
        '+919876543210',
        OtpPurpose.LOGIN,
      );
    });
  });

  describe('verifyOtp', () => {
    it('auto-creates a user on first LOGIN verification and issues tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(testUser);

      const result = await service.verifyOtp({
        phoneNumber: '+919876543210',
        otp: '123456',
        purpose: RequestOtpPurpose.LOGIN,
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { phoneNumber: '+919876543210', status: UserStatus.ACTIVE },
      });
      expect(result.kind).toBe('tokens');
      expect(tokenService.issueTokenPair).toHaveBeenCalledWith(
        testUser,
        undefined,
      );
    });

    it('never issues OTP login tokens to a suspended user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...testUser,
        status: UserStatus.SUSPENDED,
      });
      await expect(
        service.verifyOtp({
          phoneNumber: '+919876543210',
          otp: '123456',
          purpose: RequestOtpPurpose.LOGIN,
        }),
      ).rejects.toThrow('Account is not active');
      expect(tokenService.issueTokenPair).not.toHaveBeenCalled();
    });

    it('reuses an existing user on subsequent LOGIN verification', async () => {
      prisma.user.findUnique.mockResolvedValue(testUser);

      await service.verifyOtp({
        phoneNumber: '+919876543210',
        otp: '123456',
        purpose: RequestOtpPurpose.LOGIN,
      });

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('returns a reset token (not login tokens) for PASSWORD_RESET', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(testUser);

      const result = await service.verifyOtp({
        phoneNumber: '+919876543210',
        otp: '123456',
        purpose: RequestOtpPurpose.PASSWORD_RESET,
      });

      expect(result).toEqual({
        kind: 'resetToken',
        resetToken: 'reset-token',
        expiresIn: '10m',
      });
      expect(tokenService.issueTokenPair).not.toHaveBeenCalled();
    });
  });

  describe('social account status', () => {
    it('rejects a suspended Google-linked account before token issuance', async () => {
      socialAuthService.verifyGoogleIdToken.mockResolvedValue({
        providerUserId: 'google-user-1',
        email: 'user@example.com',
      });
      prisma.oauthIdentity.findUnique.mockResolvedValue({
        user: {...testUser, status: UserStatus.SUSPENDED},
      });
      await expect(service.loginWithGoogle('id-token')).rejects.toThrow(
        'Account is not active',
      );
      expect(tokenService.issueTokenPair).not.toHaveBeenCalled();
    });
  });

  describe('loginWithPassword', () => {
    it('rejects when the account has no password credential', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...testUser,
        credential: null,
      });

      await expect(
        service.loginWithPassword({
          identifier: '+919876543210',
          password: 'whatever1',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('rejects an incorrect password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        ...testUser,
        credential: { passwordHash },
      });

      await expect(
        service.loginWithPassword({
          identifier: '+919876543210',
          password: 'wrong-password',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('issues tokens on a correct password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      prisma.user.findUnique.mockResolvedValue({
        ...testUser,
        credential: { passwordHash },
      });

      const result = await service.loginWithPassword({
        identifier: '+919876543210',
        password: 'correct-password',
      });

      expect(result.tokens.accessToken).toBe('access');
    });
  });

  describe('setPassword', () => {
    it('requires currentPassword when a credential already exists', async () => {
      prisma.credential.findUnique.mockResolvedValue({
        passwordHash: 'hash',
      });

      await expect(
        service.setPassword('user-1', { newPassword: 'newpassword1' }),
      ).rejects.toThrow('currentPassword is required');
    });

    it('allows setting a password for the first time with no currentPassword', async () => {
      prisma.credential.findUnique.mockResolvedValue(null);
      prisma.credential.upsert.mockResolvedValue({});

      await service.setPassword('user-1', { newPassword: 'newpassword1' });

      expect(prisma.credential.upsert).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('revokes all refresh tokens after a successful reset', async () => {
      tokenService.verifyResetToken.mockReturnValue('user-1');
      prisma.credential.upsert.mockResolvedValue({});

      await service.resetPassword({
        resetToken: 'reset-token',
        newPassword: 'newpassword1',
      });

      expect(tokenService.revokeAllForUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getPublicUserByIdOrThrow', () => {
    it('returns the public projection of an existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(testUser);

      const result = await service.getPublicUserByIdOrThrow('user-1');

      expect(result).toEqual({
        id: 'user-1',
        phoneNumber: '+919876543210',
        email: null,
        status: UserStatus.ACTIVE,
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getPublicUserByIdOrThrow('missing')).rejects.toThrow(
        'User not found',
      );
    });
  });
});
