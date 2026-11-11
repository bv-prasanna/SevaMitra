import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/token/jwt-payload.interface';
import { ProviderService } from './provider.service';
import { CreateProviderProfileDto } from './dto/create-provider-profile.dto';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { ProviderProfileDto } from './dto/responses/provider-profile.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Provider')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'providers/me', version: '1' })
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create the provider profile for the current account — starts PENDING/UNVERIFIED',
  })
  @ApiOkResponse({ type: ProviderProfileDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProviderProfileDto,
  ) {
    return this.providerService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get the current account's provider profile" })
  @ApiOkResponse({ type: ProviderProfileDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.providerService.findByUserId(user.id);
  }

  @Patch()
  @ApiOperation({
    summary:
      "Update the current account's provider profile (status/verificationStatus are not settable here)",
  })
  @ApiOkResponse({ type: ProviderProfileDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProviderProfileDto,
  ) {
    return this.providerService.update(user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete the provider profile — anonymizes PII, does not remove the row (BRD §14.4)',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove(@CurrentUser() user: AuthenticatedUser) {
    await this.providerService.softDelete(user.id);
  }
}
