import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { OTP_SENDER } from './otp/otp-sender.interface';
import { ConsoleOtpSender } from './otp/console-otp.sender';
import { TokenService } from './token/token.service';
import { SocialAuthService } from './social/social-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    SocialAuthService,
    JwtStrategy,
    // NOTIFICATION_PROVIDER=console is the only implementation so far — see
    // src/auth/otp/otp-sender.interface.ts for the swap-in seam once the
    // Notification module (MSG91) exists.
    { provide: OTP_SENDER, useClass: ConsoleOtpSender },
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
