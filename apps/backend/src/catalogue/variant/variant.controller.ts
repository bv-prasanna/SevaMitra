import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../iam/authorization/permissions.guard';
import { RequirePermissions } from '../../iam/authorization/require-permissions.decorator';
import { VariantService } from './variant.service';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';
import { VariantDto } from '../dto/responses/variant.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Catalogue')
@Controller({ path: 'catalogue/services/:serviceId/variants', version: '1' })
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogue.manage')
  @ApiOperation({ summary: 'Add a variant to a service' })
  @ApiOkResponse({ type: VariantDto })
  @ApiNotFoundResponse({
    description: 'Service not found',
    type: ErrorResponseDto,
  })
  create(@Param('serviceId') serviceId: string, @Body() dto: CreateVariantDto) {
    return this.variantService.create(serviceId, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List variants for a service (public — anonymous marketplace browsing)',
  })
  @ApiOkResponse({ type: VariantDto, isArray: true })
  @ApiNotFoundResponse({
    description: 'Service not found',
    type: ErrorResponseDto,
  })
  list(@Param('serviceId') serviceId: string) {
    return this.variantService.list(serviceId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogue.manage')
  @ApiOperation({
    summary: 'Update a variant — isActive is the only deactivation path',
  })
  @ApiOkResponse({ type: VariantDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @Param('serviceId') serviceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.variantService.update(serviceId, id, dto);
  }
}
