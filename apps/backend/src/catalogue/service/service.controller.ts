import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { ServiceService } from './service.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { ListServicesQueryDto } from '../dto/list-services-query.dto';
import { ServiceDto } from '../dto/responses/service.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Catalogue')
@Controller({ path: 'catalogue/services', version: '1' })
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogue.manage')
  @ApiOperation({ summary: 'Create a service within a category' })
  @ApiOkResponse({ type: ServiceDto })
  @ApiNotFoundResponse({
    description: 'categoryId does not exist',
    type: ErrorResponseDto,
  })
  create(@Body() dto: CreateServiceDto) {
    return this.serviceService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List services, optionally filtered by category (public — anonymous marketplace browsing)',
  })
  @ApiOkResponse({ type: ServiceDto, isArray: true })
  findAll(@Query() query: ListServicesQueryDto) {
    return this.serviceService.findAll(query.categoryId);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get a service by id, with its variants (public — anonymous marketplace browsing)',
  })
  @ApiOkResponse({ type: ServiceDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.serviceService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogue.manage')
  @ApiOperation({
    summary:
      'Update a service — isActive is the only deactivation path; categoryId may be changed to re-categorize',
  })
  @ApiOkResponse({ type: ServiceDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.serviceService.update(id, dto);
  }
}
