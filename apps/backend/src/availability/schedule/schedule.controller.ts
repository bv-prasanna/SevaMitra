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
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { ScheduleDto } from '../dto/responses/schedule.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'availability/schedule/me', version: '1' })
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @ApiOperation({
    summary: "Set the current provider's booking capacity limits",
  })
  @ApiOkResponse({ type: ScheduleDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.scheduleService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get the current provider's capacity schedule" })
  @ApiOkResponse({ type: ScheduleDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.scheduleService.findOwn(user.id);
  }

  @Patch()
  @ApiOperation({ summary: "Update the current provider's capacity schedule" })
  @ApiOkResponse({ type: ScheduleDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(user.id, dto);
  }
}
