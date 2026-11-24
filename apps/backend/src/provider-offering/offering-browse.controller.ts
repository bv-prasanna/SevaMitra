import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OfferingService } from './offering.service';
import { ListOfferingsQueryDto } from './dto/list-offerings-query.dto';
import { OfferingDto } from './dto/responses/offering.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Provider Offering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'provider-offerings', version: '1' })
export class OfferingBrowseController {
  constructor(private readonly offeringService: OfferingService) {}

  @Get()
  @ApiOperation({
    summary:
      'Browse active offerings, optionally filtered by service and/or provider',
  })
  @ApiOkResponse({ type: OfferingDto, isArray: true })
  findAll(@Query() query: ListOfferingsQueryDto) {
    return this.offeringService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one offering by id' })
  @ApiOkResponse({ type: OfferingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.offeringService.findOneActive(id);
  }
}
