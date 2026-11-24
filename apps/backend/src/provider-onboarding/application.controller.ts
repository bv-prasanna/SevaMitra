import { Body, Controller, Get, Post, UseGuards, GoneException, UploadedFile, UseInterceptors, ParseEnumPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OnboardingDocumentType } from '@prisma/client';
import { PrivateDocumentStorage, type UploadedDocument } from './private-document.storage';
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
  constructor(private readonly applicationService: ApplicationService, private readonly storage:PrivateDocumentStorage) {}

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
    throw new GoneException('External document URLs are no longer accepted. Use /documents/upload instead.');
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5*1024*1024,files:1}}))
  @ApiOperation({summary:'Upload a private PDF/JPEG/PNG (max 5MB) to the authenticated provider application'})
  async uploadDocument(
    @CurrentUser() user:AuthenticatedUser,
    @Body('type',new ParseEnumPipe(OnboardingDocumentType)) type:OnboardingDocumentType,
    @UploadedFile() file:UploadedDocument,
  ){
    const application=await this.applicationService.findOwn(user.id);
    const fileUrl=await this.storage.upload(application.id,file);
    return this.applicationService.addOwnDocument(user.id,{type,fileUrl});
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
