import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { OauthProvider, OtpPurpose, User, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestOtpDto, RequestOtpPurpose } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginWithPasswordDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OtpService } from './otp/otp.service';
import { TokenService, TokenPair } from './token/token.service';
import { SocialAuthService } from './social/social-auth.service';

const BCRYPT_ROUNDS = 10;

const API_TO_DB_PURPOSE: Record<RequestOtpPurpose, OtpPurpose> = {
  [RequestOtpPurpose.LOGIN]: OtpPurpose.LOGIN,
  [RequestOtpPurpose.PASSWORD_RESET]: OtpPurpose.PASSWORD_RESET,
};

export interface PublicUser {
  id: string;
  phoneNumber: string | null;
  email: string | null;
  status: UserStatus;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly socialAuthService: SocialAuthService,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<{ expiresInSeconds: number }> {
    const purpose = API_TO_DB_PURPOSE[dto.purpose];

    if (purpose === OtpPurpose.PASSWORD_RESET) {
      const user = await this.prisma.user.findUnique({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (!user) {
        throw new BadRequestException('No account found for this phone number');
      }
    }

    return this.otpService.requestOtp(dto.phoneNumber, purpose);
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    ip?: string,
  ): Promise<
    | { kind: 'tokens'; tokens: TokenPair; user: PublicUser }
    | { kind: 'resetToken'; resetToken: string; expiresIn: string }
  > {
    const purpose = API_TO_DB_PURPOSE[dto.purpose];
    await this.otpService.verifyOtp(dto.phoneNumber, dto.otp, purpose);

    if (purpose === OtpPurpose.LOGIN) {
      const user = await this.findOrCreateUserByPhone(dto.phoneNumber);
      const tokens = await this.tokenService.issueTokenPair(user, ip);
      return { kind: 'tokens', tokens, user: this.toPublicUser(user) };
    }

    // PASSWORD_RESET
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { phoneNumber: dto.phoneNumber },
    });
    const resetToken = this.tokenService.signResetToken(user.id);
    return { kind: 'resetToken', resetToken, expiresIn: '10m' };
  }

  async loginWithPassword(
    dto: LoginWithPasswordDto,
    ip?: string,
  ): Promise<{ tokens: TokenPair; user: PublicUser }> {
    const isEmail = dto.identifier.includes('@');
    const user = await this.prisma.user.findUnique({
      where: isEmail
        ? { email: dto.identifier }
        : { phoneNumber: dto.identifier },
      include: { credential: true },
    });

    if (!user || !user.credential) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(
      dto.password,
      user.credential.passwordHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const tokens = await this.tokenService.issueTokenPair(user, ip);
    return { tokens, user: this.toPublicUser(user) };
  }

  async setPassword(userId: string, dto: SetPasswordDto): Promise<void> {
    const existing = await this.prisma.credential.findUnique({
      where: { userId },
    });

    if (existing) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'currentPassword is required to change an existing password',
        );
      }
      const isMatch = await bcrypt.compare(
        dto.currentPassword,
        existing.passwordHash,
      );
      if (!isMatch) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.credential.upsert({
      where: { userId },
      create: { userId, passwordHash },
      update: { passwordHash },
    });
  }

  /** Public — authenticated only by the short-lived reset token, not a login. */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const userId = this.tokenService.verifyResetToken(dto.resetToken);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    await this.prisma.credential.upsert({
      where: { userId },
      create: { userId, passwordHash },
      update: { passwordHash },
    });

    // Force re-login on every device after a password reset.
    await this.tokenService.revokeAllForUser(userId);
  }

  async refresh(refreshToken: string, ip?: string): Promise<TokenPair> {
    return this.tokenService.rotateRefreshToken(refreshToken, ip);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  async loginWithGoogle(
    idToken: string,
    ip?: string,
  ): Promise<{ tokens: TokenPair; user: PublicUser }> {
    const identity = await this.socialAuthService.verifyGoogleIdToken(idToken);
    const user = await this.findOrCreateUserBySocialIdentity(
      OauthProvider.GOOGLE,
      identity.providerUserId,
      identity.email,
    );
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }
    const tokens = await this.tokenService.issueTokenPair(user, ip);
    return { tokens, user: this.toPublicUser(user) };
  }

  async loginWithApple(
    idToken: string,
    ip?: string,
  ): Promise<{ tokens: TokenPair; user: PublicUser }> {
    const identity = await this.socialAuthService.verifyAppleIdToken(idToken);
    const user = await this.findOrCreateUserBySocialIdentity(
      OauthProvider.APPLE,
      identity.providerUserId,
      identity.email,
    );
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }
    const tokens = await this.tokenService.issueTokenPair(user, ip);
    return { tokens, user: this.toPublicUser(user) };
  }

  private async findOrCreateUserByPhone(phoneNumber: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });
    if (existing) {
      if (existing.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }
      return existing;
    }
    return this.prisma.user.create({
      data: { phoneNumber, status: UserStatus.ACTIVE },
    });
  }

  private async findOrCreateUserBySocialIdentity(
    provider: OauthProvider,
    providerUserId: string,
    email?: string,
  ): Promise<User> {
    const existingIdentity = await this.prisma.oauthIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true },
    });
    if (existingIdentity) {
      return existingIdentity.user;
    }

    const existingUserByEmail = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;

    const user =
      existingUserByEmail ??
      (await this.prisma.user.create({
        data: { email: email ?? undefined, status: UserStatus.ACTIVE },
      }));

    await this.prisma.oauthIdentity.create({
      data: { userId: user.id, provider, providerUserId },
    });

    return user;
  }

  async getPublicUserByIdOrThrow(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublicUser(user);
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      status: user.status,
    };
  }
}
