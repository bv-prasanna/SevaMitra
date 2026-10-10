import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';
import { WorkingHoursService } from './working-hours.service';
import { CreateWorkingHoursDto } from '../dto/create-working-hours.dto';
import { UpdateWorkingHoursDto } from '../dto/update-working-hours.dto';
import { WorkingHoursDto } from '../dto/responses/working-hours.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'availability/working-hours/me', version: '1' })
export class WorkingHoursController {
  constructor(private readonly workingHoursService: WorkingHoursService) {}

  @Post()
  @ApiOperation({
    summary:
      'Add a recurring weekly working-hours window (a day may have several, e.g. a split shift)',
  })
  @ApiOkResponse({ type: WorkingHoursDto })
  @ApiBadRequestResponse({
    description: 'startTime must be before endTime',
    type: ErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkingHoursDto,
  ) {
    return this.workingHoursService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List the current provider's working-hours windows",
  })
  @ApiOkResponse({ type: WorkingHoursDto, isArray: true })
  listOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.workingHoursService.listOwn(user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a working-hours window — isActive can pause it without deleting it',
  })
  @ApiOkResponse({ type: WorkingHoursDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkingHoursDto,
  ) {
    return this.workingHoursService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a working-hours window' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.workingHoursService.remove(user.id, id);
  }
}
