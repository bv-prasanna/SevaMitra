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
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../iam/authorization/permissions.guard';
import { RequirePermissions } from '../../iam/authorization/require-permissions.decorator';
import { DistrictService } from './district.service';
import { CreateDistrictDto } from '../dto/create-district.dto';
import { UpdateDistrictDto } from '../dto/update-district.dto';
import { ListDistrictsQueryDto } from '../dto/list-districts-query.dto';
import { DistrictDto } from '../dto/responses/district.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Geography')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'geography/districts', version: '1' })
export class DistrictController {
  constructor(private readonly districtService: DistrictService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('geography.manage')
  @ApiOperation({ summary: 'Create a district within a state' })
  @ApiOkResponse({ type: DistrictDto })
  @ApiNotFoundResponse({
    description: 'stateId does not exist',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateDistrictDto) {
    return this.districtService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List districts, optionally filtered by state' })
  @ApiOkResponse({ type: DistrictDto, isArray: true })
  findAll(@Query() query: ListDistrictsQueryDto) {
    return this.districtService.findAll(query.stateId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a district by id' })
  @ApiOkResponse({ type: DistrictDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.districtService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('geography.manage')
  @ApiOperation({
    summary:
      'Update a district — isActive is the only deactivation path; stateId may be changed to re-parent',
  })
  @ApiOkResponse({ type: DistrictDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateDistrictDto) {
    return this.districtService.update(id, dto);
  }
}
