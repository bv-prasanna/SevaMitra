import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { OtpChannel, OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OTP_SENDER } from './otp-sender.interface';
import type { OtpSender } from './otp-sender.interface';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class OtpService {
  private readonly otpLength: number;
  private readonly otpTtlSeconds: number;
  private readonly maxAttempts: number;
  private readonly cooldownSeconds: number;
  private readonly fixedCode?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(OTP_SENDER) private readonly otpSender: OtpSender,
  ) {
    this.otpLength = this.config.getOrThrow<number>('OTP_LENGTH');
    this.otpTtlSeconds = this.config.getOrThrow<number>('OTP_TTL_SECONDS');
    this.maxAttempts = this.config.getOrThrow<number>('OTP_MAX_ATTEMPTS');
    this.cooldownSeconds = this.config.getOrThrow<number>(
      'OTP_REQUEST_COOLDOWN_SECONDS',
    );

    // A fixed OTP is a local-testing convenience. It is only honoured while
    // OTPs go to the console stub — once a real SMS provider is configured
    // it is ignored, so it can never weaken real logins.
    const fixedCode = this.config.get<string>('OTP_FIXED_CODE');
    if (fixedCode) {
      if (fixedCode.length !== this.otpLength) {
        throw new Error(
          `OTP_FIXED_CODE must be ${this.otpLength} digits (OTP_LENGTH)`,
        );
      }
      if (this.config.get<string>('NOTIFICATION_PROVIDER') === 'console') {
        this.fixedCode = fixedCode;
      }
    }
  }

  async requestOtp(
    phoneNumber: string,
    purpose: OtpPurpose,
    channel: OtpChannel = OtpChannel.SMS,
    userId?: string,
  ): Promise<{ expiresInSeconds: number }> {
    const lastChallenge = await this.prisma.otpChallenge.findFirst({
      where: { phoneNumber, purpose },
      orderBy: { createdAt: 'desc' },
    });

    if (lastChallenge) {
      const secondsSinceLast =
        (Date.now() - lastChallenge.createdAt.getTime()) / 1000;
      if (secondsSinceLast < this.cooldownSeconds) {
        throw new HttpException(
          'Please wait before requesting another OTP',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + this.otpTtlSeconds * 1000);

    await this.prisma.otpChallenge.create({
      data: {
        phoneNumber,
        purpose,
        channel,
        otpHash,
        expiresAt,
        maxAttempts: this.maxAttempts,
        userId,
      },
    });

    await this.otpSender.sendOtp(phoneNumber, otp);

    return { expiresInSeconds: this.otpTtlSeconds };
  }

  async verifyOtp(
    phoneNumber: string,
    otp: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phoneNumber,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException('No active OTP found — request a new one');
    }

    if (challenge.attemptCount >= challenge.maxAttempts) {
      throw new BadRequestException(
        'Too many incorrect attempts — request a new OTP',
      );
    }

    const isMatch = await bcrypt.compare(otp, challenge.otpHash);

    if (!isMatch) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attemptCount: { increment: 1 } },
      });
      throw new BadRequestException('Incorrect OTP');
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
  }

  private generateOtp(): string {
    if (this.fixedCode) return this.fixedCode;
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }
}
