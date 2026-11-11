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
import { ExceptionService } from './exception.service';
import { CreateExceptionDto } from '../dto/create-exception.dto';
import { UpdateExceptionDto } from '../dto/update-exception.dto';
import { ExceptionDto } from '../dto/responses/exception.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'availability/exceptions/me', version: '1' })
export class ExceptionController {
  constructor(private readonly exceptionService: ExceptionService) {}

  @Post()
  @ApiOperation({
    summary:
      'Add a date-range override (leave, pause, or custom hours) to the current provider',
  })
  @ApiOkResponse({ type: ExceptionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateExceptionDto,
  ) {
    return this.exceptionService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List the current provider's exceptions, newest first",
  })
  @ApiOkResponse({ type: ExceptionDto, isArray: true })
  listOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.exceptionService.listOwn(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exception' })
  @ApiOkResponse({ type: ExceptionDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateExceptionDto,
  ) {
    return this.exceptionService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an exception' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.exceptionService.remove(user.id, id);
  }
}
