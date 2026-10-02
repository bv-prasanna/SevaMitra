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
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../iam/authorization/permissions.guard';
import { RequirePermissions } from '../../iam/authorization/require-permissions.decorator';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryDto } from '../dto/responses/category.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Catalogue')
@Controller({ path: 'catalogue/categories', version: '1' })
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogue.manage')
  @ApiOperation({ summary: 'Create a service category' })
  @ApiOkResponse({ type: CategoryDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List all categories, active and inactive (public — anonymous marketplace browsing)',
  })
  @ApiOkResponse({ type: CategoryDto, isArray: true })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a category by id (public — anonymous marketplace browsing)',
  })
  @ApiOkResponse({ type: CategoryDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('catalogue.manage')
  @ApiOperation({
    summary: 'Update a category — isActive is the only deactivation path',
  })
  @ApiOkResponse({ type: CategoryDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }
}
