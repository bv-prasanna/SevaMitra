import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/token/jwt-payload.interface';
import { PermissionsGuard } from '../iam/authorization/permissions.guard';
import { RequirePermissions } from '../iam/authorization/require-permissions.decorator';
import { ApplicationService } from './application.service';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { ApplicationDto } from './dto/responses/application.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Provider Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('provider.onboarding.review')
@Controller({ path: 'provider-onboarding/applications', version: '1' })
export class ApplicationAdminController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @ApiOperation({
    summary: 'List all onboarding applications, optionally filtered by status',
  })
  @ApiOkResponse({ type: ApplicationDto, isArray: true })
  findAll(@Query() query: ListApplicationsQueryDto) {
    return this.applicationService.findAll(query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one application, with its documents' })
  @ApiOkResponse({ type: ApplicationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.applicationService.findByIdOrThrow(id);
  }

  @Patch(':id/claim')
  @ApiOperation({
    summary:
      'Move a SUBMITTED application to UNDER_REVIEW, assigning yourself as reviewer',
  })
  @ApiOkResponse({ type: ApplicationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Not currently SUBMITTED',
    type: ErrorResponseDto,
  })
  claim(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.applicationService.claim(id, user.id);
  }

  @Post(':id/review')
  @ApiOperation({
    summary:
      'Approve or reject an application — approval activates the provider (status=ACTIVE, verificationStatus=VERIFIED)',
  })
  @ApiOkResponse({ type: ApplicationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Already decided (APPROVED or REJECTED)',
    type: ErrorResponseDto,
  })
  review(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewApplicationDto,
  ) {
    return this.applicationService.review(id, user.id, dto);
  }
}
