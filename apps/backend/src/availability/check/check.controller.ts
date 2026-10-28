import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AvailabilityCheckService } from './availability-check.service';
import { CheckQueryDto } from '../dto/check-query.dto';
import { CheckResultDto } from '../dto/responses/check-result.dto';

@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'availability', version: '1' })
export class CheckController {
  constructor(
    private readonly availabilityCheckService: AvailabilityCheckService,
  ) {}

  @Get('check')
  @ApiOperation({
    summary:
      "Get a provider's open windows for a date (weekly hours, minus any exception override)",
  })
  @ApiOkResponse({ type: CheckResultDto })
  check(@Query() query: CheckQueryDto) {
    return this.availabilityCheckService.getAvailability(
      query.providerId,
      query.date,
    );
  }
}
