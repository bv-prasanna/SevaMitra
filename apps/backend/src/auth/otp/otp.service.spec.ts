import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { OtpPurpose } from '@prisma/client';
import { OtpService } from './otp.service';
import type { OtpSender } from './otp-sender.interface';
import type { PrismaService } from '../../prisma/prisma.service';

function buildConfig(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    OTP_LENGTH: 6,
    OTP_TTL_SECONDS: 300,
    OTP_MAX_ATTEMPTS: 5,
    OTP_REQUEST_COOLDOWN_SECONDS: 60,
    ...overrides,
  };
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('OtpService', () => {
  let prisma: {
    otpChallenge: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let otpSender: jest.Mocked<OtpSender>;
  let service: OtpService;

  beforeEach(() => {
    prisma = {
      otpChallenge: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    otpSender = { sendOtp: jest.fn().mockResolvedValue(undefined) };
    service = new OtpService(
      prisma as unknown as PrismaService,
      buildConfig(),
      otpSender,
    );
  });

  describe('requestOtp', () => {
    it('generates codes without using Math.random', async () => {
      const mathRandom = jest.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Insecure RNG invoked');
      });
      try {
        prisma.otpChallenge.findFirst.mockResolvedValue(null);
        await expect(service.requestOtp('+919876543210', OtpPurpose.LOGIN)).resolves.toBeDefined();
        expect(otpSender.sendOtp).toHaveBeenCalledWith(
          '+919876543210', expect.stringMatching(/^\\d{6}$/),
        );
      } finally {
        mathRandom.mockRestore();
      }
    });

    it('creates a challenge and dispatches it when there is no recent request', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      prisma.otpChallenge.create.mockResolvedValue({});

      const result = await service.requestOtp(
        '+919876543210',
        OtpPurpose.LOGIN,
      );

      expect(prisma.otpChallenge.create).toHaveBeenCalledTimes(1);
      expect(otpSender.sendOtp).toHaveBeenCalledWith(
        '+919876543210',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result.expiresInSeconds).toBe(300);
    });

    it('sends OTP_FIXED_CODE when the console provider is active', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      prisma.otpChallenge.create.mockResolvedValue({});
      const fixed = new OtpService(
        prisma as unknown as PrismaService,
        buildConfig({
          OTP_FIXED_CODE: '111111',
          NOTIFICATION_PROVIDER: 'console',
        }),
        otpSender,
      );

      await fixed.requestOtp('+919876543210', OtpPurpose.LOGIN);

      expect(otpSender.sendOtp).toHaveBeenCalledWith(
        '+919876543210',
        '111111',
      );
    });

    it('ignores OTP_FIXED_CODE with a real notification provider', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(null);
      prisma.otpChallenge.create.mockResolvedValue({});
      const real = new OtpService(
        prisma as unknown as PrismaService,
        buildConfig({ OTP_FIXED_CODE: '111111', NOTIFICATION_PROVIDER: 'sms' }),
        otpSender,
      );

      // Random OTPs could be 111111 by chance; 20 draws all equal to it can't.
      for (let i = 0; i < 20; i++) {
        await real.requestOtp('+919876543210', OtpPurpose.LOGIN);
      }
      const codes = otpSender.sendOtp.mock.calls.map((c) => c[1]);
      expect(codes.every((c) => c === '111111')).toBe(false);
    });

    it('rejects an OTP_FIXED_CODE whose length differs from OTP_LENGTH', () => {
      expect(
        () =>
          new OtpService(
            prisma as unknown as PrismaService,
            buildConfig({
              OTP_FIXED_CODE: '1111',
              NOTIFICATION_PROVIDER: 'console',
            }),
            otpSender,
          ),
      ).toThrow('OTP_FIXED_CODE must be 6 digits');
    });

    it('rejects a new request within the cooldown window', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        createdAt: new Date(),
      });

      await expect(
        service.requestOtp('+919876543210', OtpPurpose.LOGIN),
      ).rejects.toMatchObject({ status: 429 });
      expect(prisma.otpChallenge.create).not.toHaveBeenCalled();
    });

    it('allows a new request once the cooldown has elapsed', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 61_000),
      });
      prisma.otpChallenge.create.mockResolvedValue({});

      await expect(
        service.requestOtp('+919876543210', OtpPurpose.LOGIN),
      ).resolves.toBeDefined();
    });
  });

  describe('verifyOtp', () => {
    it('throws if no active challenge exists', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyOtp('+919876543210', '123456', OtpPurpose.LOGIN),
      ).rejects.toThrow('No active OTP found');
    });

    it('throws once max attempts are exhausted', async () => {
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        attemptCount: 5,
        maxAttempts: 5,
        otpHash: 'irrelevant',
      });

      await expect(
        service.verifyOtp('+919876543210', '123456', OtpPurpose.LOGIN),
      ).rejects.toThrow('Too many incorrect attempts');
    });

    it('increments attemptCount and throws on an incorrect OTP', async () => {
      const otpHash = await bcrypt.hash('111111', 10);
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        attemptCount: 0,
        maxAttempts: 5,
        otpHash,
      });

      await expect(
        service.verifyOtp('+919876543210', '000000', OtpPurpose.LOGIN),
      ).rejects.toThrow('Incorrect OTP');

      expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: 'challenge-1' },
        data: { attemptCount: { increment: 1 } },
      });
    });

    it('consumes the challenge on a correct OTP', async () => {
      const otpHash = await bcrypt.hash('111111', 10);
      prisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'challenge-1',
        attemptCount: 0,
        maxAttempts: 5,
        otpHash,
      });

      await service.verifyOtp('+919876543210', '111111', OtpPurpose.LOGIN);

      expect(prisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: 'challenge-1' },
        data: { consumedAt: expect.any(Date) },
      });
    });
  });
});
