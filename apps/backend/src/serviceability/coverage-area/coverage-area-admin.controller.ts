import {
  Body,
  Controller,
  Get,
  Param,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';
import { PermissionsGuard } from '../../iam/authorization/permissions.guard';
import { RequirePermissions } from '../../iam/authorization/require-permissions.decorator';
import { CoverageAreaService } from './coverage-area.service';
import { ListCoverageAreasQueryDto } from '../dto/list-coverage-areas-query.dto';
import { ReviewCoverageAreaDto } from '../dto/review-coverage-area.dto';
import { CoverageAreaDto } from '../dto/responses/coverage-area.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Serviceability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('serviceability.review')
@Controller({ path: 'serviceability/coverage-areas', version: '1' })
export class CoverageAreaAdminController {
  constructor(private readonly coverageAreaService: CoverageAreaService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all coverage area proposals, optionally filtered by status and/or provider',
  })
  @ApiOkResponse({ type: CoverageAreaDto, isArray: true })
  findAll(@Query() query: ListCoverageAreasQueryDto) {
    return this.coverageAreaService.findAll(query);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Approve or reject a coverage area proposal' })
  @ApiOkResponse({ type: CoverageAreaDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Already decided',
    type: ErrorResponseDto,
  })
  review(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewCoverageAreaDto,
  ) {
    return this.coverageAreaService.review(id, user.id, dto);
  }
}
