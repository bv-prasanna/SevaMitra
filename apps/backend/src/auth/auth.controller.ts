import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginWithPasswordDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './token/jwt-payload.interface';
import { OtpRequestResponseDto } from './dto/responses/otp-request-response.dto';
import { OtpVerifyTokensResponseDto } from './dto/responses/otp-verify-tokens-response.dto';
import { OtpVerifyResetResponseDto } from './dto/responses/otp-verify-reset-response.dto';
import { LoginResponseDto } from './dto/responses/login-response.dto';
import { TokenPairDto } from './dto/responses/token-pair.dto';
import { AuthenticatedUserDto } from './dto/responses/authenticated-user.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Auth')
@ApiExtraModels(OtpVerifyTokensResponseDto, OtpVerifyResetResponseDto)
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request an OTP for login or password reset' })
  @ApiOkResponse({ type: OtpRequestResponseDto })
  @ApiTooManyRequestsResponse({
    description: 'Requested again before the cooldown elapsed',
    type: ErrorResponseDto,
  })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Verify an OTP — logs in (creating the account if new) for purpose=LOGIN, or returns a short-lived reset token for purpose=PASSWORD_RESET',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      oneOf: [
        { $ref: getSchemaPath(OtpVerifyTokensResponseDto) },
        { $ref: getSchemaPath(OtpVerifyResetResponseDto) },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No active OTP, incorrect OTP, or too many attempts',
    type: ErrorResponseDto,
  })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.authService.verifyOtp(dto, req.ip);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email/phone + password' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or inactive account',
    type: ErrorResponseDto,
  })
  login(@Body() dto: LoginWithPasswordDto, @Req() req: Request) {
    return this.authService.loginWithPassword(dto, req.ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  @ApiOkResponse({ type: TokenPairDto })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid, expired, or already revoked',
    type: ErrorResponseDto,
  })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, req.ip,dto.deviceId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiNoContentResponse()
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Set a password for the first time, or change it (currentPassword required if one already exists)',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({
    description: 'Not logged in, or currentPassword is incorrect',
    type: ErrorResponseDto,
  })
  async setPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetPasswordDto,
  ) {
    await this.authService.setPassword(user.id, dto);
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reset password using the token from otp/verify (PASSWORD_RESET)',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({
    description: 'Reset token is invalid or expired',
    type: ErrorResponseDto,
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
  }

  @Post('social/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login/register with a Google ID token' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_IMPLEMENTED,
    description: 'Google sign-in is not yet configured on this environment',
    type: ErrorResponseDto,
  })
  loginWithGoogle(@Body() dto: SocialLoginDto, @Req() req: Request) {
    return this.authService.loginWithGoogle(dto.idToken, req.ip);
  }

  @Post('social/apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login/register with an Apple ID token' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_IMPLEMENTED,
    description: 'Apple sign-in is not yet configured on this environment',
    type: ErrorResponseDto,
  })
  loginWithApple(@Body() dto: SocialLoginDto, @Req() req: Request) {
    return this.authService.loginWithApple(dto.idToken, req.ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated identity' })
  @ApiOkResponse({ type: AuthenticatedUserDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
