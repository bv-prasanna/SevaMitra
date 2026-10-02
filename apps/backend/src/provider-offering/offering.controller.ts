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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/token/jwt-payload.interface';
import { OfferingService } from './offering.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { OfferingDto } from './dto/responses/offering.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Provider Offering')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'provider-offerings/me', version: '1' })
export class OfferingController {
  constructor(private readonly offeringService: OfferingService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create an offering (service + price) for the current provider — provider must be ACTIVE',
  })
  @ApiOkResponse({ type: OfferingDto })
  @ApiConflictResponse({
    description:
      'Provider not yet ACTIVE, or this service/variant is already offered',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No provider profile, or serviceId/variantId does not exist',
    type: ErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOfferingDto,
  ) {
    return this.offeringService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List the current provider's offerings" })
  @ApiOkResponse({ type: OfferingDto, isArray: true })
  listOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.offeringService.listOwn(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current provider's offerings" })
  @ApiOkResponse({ type: OfferingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOwn(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.offeringService.findOwn(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an offering — isActive can delist it without deleting it',
  })
  @ApiOkResponse({ type: OfferingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOfferingDto,
  ) {
    return this.offeringService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an offering' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.offeringService.remove(user.id, id);
  }
}
