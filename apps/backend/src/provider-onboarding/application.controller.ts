import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ApplicationDto } from './dto/responses/application.dto';
import { DocumentDto } from './dto/responses/document.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Provider Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'provider-onboarding/applications/me', version: '1' })
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @ApiOperation({
    summary:
      'Submit an onboarding application for the current provider, or resubmit a previously REJECTED one',
  })
  @ApiOkResponse({ type: ApplicationDto })
  @ApiConflictResponse({
    description: 'A non-rejected application already exists',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description:
      'No provider profile yet, or referredByAgentCode is not recognized',
    type: ErrorResponseDto,
  })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationService.submit(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: "Get the current provider's application, with its documents",
  })
  @ApiOkResponse({ type: ApplicationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationService.findOwn(user.id);
  }

  @Post('documents')
  @ApiOperation({
    summary: "Attach a document to the current provider's application",
  })
  @ApiOkResponse({ type: DocumentDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  addDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.applicationService.addOwnDocument(user.id, dto);
  }

  @Get('documents')
  @ApiOperation({
    summary: "List the current provider's application documents",
  })
  @ApiOkResponse({ type: DocumentDto, isArray: true })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  listDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationService.listOwnDocuments(user.id);
  }
}
