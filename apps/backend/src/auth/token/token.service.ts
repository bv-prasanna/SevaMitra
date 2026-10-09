import { randomBytes, createHash } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDurationToSeconds } from '../../common/util/parse-duration';
import type { JwtPayload } from './jwt-payload.interface';

/**
 * @nestjs/jwt types `expiresIn` against `ms`'s branded `StringValue` template
 * type, which a generic env-sourced `string` can never satisfy statically.
 * Our env validation (src/common/config/env.validation.ts) already enforces
 * the "<number><s|m|h|d>" shape at startup, so this cast is safe.
 */
function asExpiresIn(value: string): JwtSignOptions['expiresIn'] {
  return value as unknown as JwtSignOptions['expiresIn'];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  deviceId?: string;
}
export type EnrollmentDevice={platform:'android'|'ios';label?:string};


@Injectable()
export class TokenService {
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.refreshTtlSeconds = parseDurationToSeconds(
      this.config.getOrThrow<string>('JWT_REFRESH_TTL'),
    );
  }

  async issueTokenPair(
    user: User, createdByIp?: string, enroll?: EnrollmentDevice, existingDeviceId?: string,
  ): Promise<TokenPair> {
    // An enrolled device must be backed by completed OTP/password verification.
    const newDevice = enroll ? await this.prisma.trustedDevice.create({
      data:{userId:user.id,platform:enroll.platform,label:enroll.label?.trim().slice(0,80)},
    }) : null;
    const deviceId = newDevice?.id??existingDeviceId;
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user.id, createdByIp,deviceId);
    const accessTtlSeconds = parseDurationToSeconds(
      this.config.getOrThrow<string>('JWT_ACCESS_TTL'),
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtlSeconds,
      ...(deviceId?{deviceId}:{}),
    };
  }

  /** Rotates a refresh token: the old one is revoked, a new pair is issued. */
  async rotateRefreshToken(
    presentedToken: string,
    createdByIp?: string,
    deviceId?: string,
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(presentedToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }
    if (stored.deviceId) {
      // Device ID is a binding check, NOT the credential: a valid rotating
      // refresh token must also be presented.
      if (deviceId !== stored.deviceId) {
        throw new UnauthorizedException('Session belongs to another device');
      }
      const device=await this.prisma.trustedDevice.findUnique({where:{id:stored.deviceId}});
      if(!device||device.revokedAt||device.userId!==stored.userId){
        throw new UnauthorizedException('Device access was revoked');
      }
    }

    const revoked=await this.prisma.refreshToken.updateMany({
      where:{id:stored.id,revokedAt:null},
      data:{revokedAt:new Date()},
    });
    if(revoked.count!==1)throw new UnauthorizedException('Refresh token was already used');

    if (stored.deviceId) {
      await this.prisma.trustedDevice.update({where:{id:stored.deviceId},data:{lastSeenAt:new Date()}});
    }
    return this.issueTokenPair(stored.user, createdByIp,undefined,stored.deviceId??undefined);
  }

  async revokeRefreshToken(presentedToken: string): Promise<void> {
    const tokenHash = this.hashToken(presentedToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Used for forced logout everywhere — account suspension, password reset. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Short-lived, single-purpose token issued after a successful
   * PASSWORD_RESET OTP verification. Signed with a secret distinct from
   * JWT_ACCESS_SECRET so it can never be replayed as a normal access token
   * against JwtStrategy.
   */
  signResetToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, purpose: 'password_reset' },
      {
        secret: this.config.getOrThrow<string>('JWT_RESET_SECRET'),
        expiresIn: asExpiresIn(this.config.getOrThrow<string>('JWT_RESET_TTL')),
      },
    );
  }

  verifyResetToken(token: string): string {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        purpose: string;
      }>(token, {
        secret: this.config.getOrThrow<string>('JWT_RESET_SECRET'),
      });

      if (payload.purpose !== 'password_reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }

  private signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
    };
    return this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: asExpiresIn(this.config.getOrThrow<string>('JWT_ACCESS_TTL')),
    });
  }

  private async issueRefreshToken(
    userId: string,
    createdByIp?: string,
    deviceId?: string,
  ): Promise<string> {
    const plainToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(plainToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt, createdByIp,...(deviceId?{deviceId}:{}) },
    });

    return plainToken;
  }

  /**
   * Refresh tokens are high-entropy random strings (not low-entropy
   * passwords/OTPs), so a fast deterministic hash is appropriate here —
   * unlike passwords/OTPs, which use bcrypt.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
