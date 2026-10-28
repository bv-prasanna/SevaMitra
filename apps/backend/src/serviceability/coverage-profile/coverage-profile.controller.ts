import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';
import { CoverageProfileService } from './coverage-profile.service';
import { CreateCoverageProfileDto } from '../dto/create-coverage-profile.dto';
import { UpdateCoverageProfileDto } from '../dto/update-coverage-profile.dto';
import { CoverageProfileDto } from '../dto/responses/coverage-profile.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Serviceability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'serviceability/coverage/me', version: '1' })
export class CoverageProfileController {
  constructor(
    private readonly coverageProfileService: CoverageProfileService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      "Set the current provider's radius-based coverage (primary location + travel radius)",
  })
  @ApiOkResponse({ type: CoverageProfileDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'No provider profile, or primaryTownVillageId does not exist',
    type: ErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCoverageProfileDto,
  ) {
    return this.coverageProfileService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get the current provider's coverage profile" })
  @ApiOkResponse({ type: CoverageProfileDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.coverageProfileService.findOwn(user.id);
  }

  @Patch()
  @ApiOperation({ summary: "Update the current provider's coverage profile" })
  @ApiOkResponse({ type: CoverageProfileDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCoverageProfileDto,
  ) {
    return this.coverageProfileService.update(user.id, dto);
  }
}
