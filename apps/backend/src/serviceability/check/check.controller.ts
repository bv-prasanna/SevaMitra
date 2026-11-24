import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CoverageCheckService } from './coverage-check.service';
import { CheckQueryDto } from '../dto/check-query.dto';
import { ListServiceableProvidersQueryDto } from '../dto/list-serviceable-providers-query.dto';
import { CheckResultDto } from '../dto/responses/check-result.dto';

@ApiTags('Serviceability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'serviceability', version: '1' })
export class CheckController {
  constructor(private readonly coverageCheckService: CoverageCheckService) {}

  @Get('check')
  @ApiOperation({
    summary:
      'Check whether a specific provider can serve a specific town/village',
  })
  @ApiOkResponse({ type: CheckResultDto })
  check(@Query() query: CheckQueryDto) {
    return this.coverageCheckService.isServiceable(
      query.providerId,
      query.townVillageId,
    );
  }

  @Get('providers')
  @ApiOperation({
    summary:
      'List ids of every provider serviceable at a town/village (approved area or within radius)',
  })
  @ApiOkResponse({ type: [String] })
  listProviders(@Query() query: ListServiceableProvidersQueryDto) {
    return this.coverageCheckService.listServiceableProviderIds(
      query.townVillageId,
    );
  }
}
