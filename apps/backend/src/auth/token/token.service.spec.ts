import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { TokenService } from './token.service';
import type { PrismaService } from '../../prisma/prisma.service';

function buildConfig(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_SECRET: 'refresh-secret',
    JWT_REFRESH_TTL: '30d',
    JWT_RESET_SECRET: 'reset-secret',
    JWT_RESET_TTL: '10m',
    ...overrides,
  };
  return {
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
}

const testUser = {
  id: 'user-1',
  phoneNumber: '+919876543210',
  email: null,
  status: UserStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TokenService', () => {
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwtService: JwtService;
  let service: TokenService;

  beforeEach(() => {
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    jwtService = new JwtService();
    service = new TokenService(
      jwtService,
      buildConfig(),
      prisma as unknown as PrismaService,
    );
  });

  it('issues an access token and a persisted, hashed refresh token', async () => {
    const pair = await service.issueTokenPair(testUser, '127.0.0.1');

    expect(pair.accessToken).toEqual(expect.any(String));
    expect(pair.expiresIn).toBe(15 * 60);

    const decoded = jwtService.decode<{ sub: string }>(pair.accessToken);
    expect(decoded.sub).toBe(testUser.id);

    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: testUser.id,
        createdByIp: '127.0.0.1',
      }),
    });
    // The plaintext refresh token must never equal what's persisted (hash).
    const persistedHash = (
      prisma.refreshToken.create.mock.calls[0][0] as {
        data: { tokenHash: string };
      }
    ).data.tokenHash;
    expect(persistedHash).not.toBe(pair.refreshToken);
  });

  it('rejects rotating a revoked refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 100_000),
      user: testUser,
    });

    await expect(service.rotateRefreshToken('some-token')).rejects.toThrow(
      'Invalid or expired refresh token',
    );
  });

  it('rejects rotating an expired refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: testUser,
    });

    await expect(service.rotateRefreshToken('some-token')).rejects.toThrow(
      'Invalid or expired refresh token',
    );
  });

  it('refuses refresh token rotation for suspended users', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
      user: {...testUser, status: UserStatus.SUSPENDED},
    });
    await expect(service.rotateRefreshToken('some-token')).rejects.toThrow(
      'Account is not active',
    );
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh token: revokes the old one, issues a new pair', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
      user: testUser,
    });

    const pair = await service.rotateRefreshToken('some-token');

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(pair.accessToken).toEqual(expect.any(String));
  });

  describe('reset tokens', () => {
    it('round-trips a valid reset token', () => {
      const token = service.signResetToken('user-1');
      expect(service.verifyResetToken(token)).toBe('user-1');
    });

    it('rejects a reset token signed with a different secret', () => {
      const foreignJwt = new JwtService();
      const forged = foreignJwt.sign(
        { sub: 'user-1', purpose: 'password_reset' },
        { secret: 'not-the-real-secret', expiresIn: '10m' },
      );

      expect(() => service.verifyResetToken(forged)).toThrow(
        'Invalid or expired reset token',
      );
    });

    it('rejects a normal access token presented as a reset token', () => {
      // Signed with JWT_ACCESS_SECRET, not JWT_RESET_SECRET — must not verify.
      const accessLikeToken = jwtService.sign(
        { sub: 'user-1', phoneNumber: null, email: null },
        { secret: 'access-secret', expiresIn: '15m' },
      );

      expect(() => service.verifyResetToken(accessLikeToken)).toThrow(
        'Invalid or expired reset token',
      );
    });
  });
});
