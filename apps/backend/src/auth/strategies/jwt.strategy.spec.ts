
import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy account-status checks', () => {
  const config = { getOrThrow: jest.fn().mockReturnValue('a-valid-unit-test-only-secret') };
  const prisma = { user: { findUnique: jest.fn() } };
  const strategy = new JwtStrategy(config as unknown as ConfigService, prisma as unknown as PrismaService);
  const payload = { sub: 'user-1' } as Parameters<JwtStrategy['validate']>[0];

  beforeEach(() => jest.clearAllMocks());

  it('allows an active account and exposes public identity fields only', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', phoneNumber: '+919876543210', email: 'user@test.example',
      status: UserStatus.ACTIVE, credential: { passwordHash: 'SECRET' },
    });
    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'user-1', phoneNumber: '+919876543210', email: 'user@test.example',
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('rejects a deleted or nonexistent account immediately', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it.each([UserStatus.SUSPENDED, UserStatus.DELETED, UserStatus.PENDING])(
    'rejects a non-active account status %s even with a valid JWT', async (status) => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', status });
      await expect(strategy.validate(payload)).rejects.toThrow('Account is not active');
    },
  );
});
