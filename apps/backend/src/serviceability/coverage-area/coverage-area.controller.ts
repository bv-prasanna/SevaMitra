import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';
import { CoverageAreaService } from './coverage-area.service';
import { CreateCoverageAreaDto } from '../dto/create-coverage-area.dto';
import { CoverageAreaDto } from '../dto/responses/coverage-area.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Serviceability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'serviceability/coverage-areas/me', version: '1' })
export class CoverageAreaController {
  constructor(private readonly coverageAreaService: CoverageAreaService) {}

  @Post()
  @ApiOperation({
    summary:
      'Propose a town/village for coverage, or re-propose a previously rejected one — starts PENDING',
  })
  @ApiOkResponse({ type: CoverageAreaDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'No provider profile, or townVillageId does not exist',
    type: ErrorResponseDto,
  })
  propose(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCoverageAreaDto,
  ) {
    return this.coverageAreaService.propose(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List the current provider's coverage area proposals",
  })
  @ApiOkResponse({ type: CoverageAreaDto, isArray: true })
  listOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.coverageAreaService.listOwn(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Withdraw a coverage area proposal, regardless of its status',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.coverageAreaService.removeOwn(user.id, id);
  }
}
