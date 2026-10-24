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
import { TownVillageService } from './town-village.service';
import { CreateTownVillageDto } from '../dto/create-town-village.dto';
import { UpdateTownVillageDto } from '../dto/update-town-village.dto';
import { TownVillageDto } from '../dto/responses/town-village.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Geography')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'geography/taluks/:talukId/towns', version: '1' })
export class TownVillageController {
  constructor(private readonly townVillageService: TownVillageService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('geography.manage')
  @ApiOperation({ summary: 'Add a town/village to a taluk' })
  @ApiOkResponse({ type: TownVillageDto })
  @ApiNotFoundResponse({
    description: 'Taluk not found',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(@Param('talukId') talukId: string, @Body() dto: CreateTownVillageDto) {
    return this.townVillageService.create(talukId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List towns/villages for a taluk' })
  @ApiOkResponse({ type: TownVillageDto, isArray: true })
  @ApiNotFoundResponse({
    description: 'Taluk not found',
    type: ErrorResponseDto,
  })
  list(@Param('talukId') talukId: string) {
    return this.townVillageService.list(talukId);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('geography.manage')
  @ApiOperation({
    summary: 'Update a town/village — isActive is the only deactivation path',
  })
  @ApiOkResponse({ type: TownVillageDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  update(
    @Param('talukId') talukId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTownVillageDto,
  ) {
    return this.townVillageService.update(talukId, id, dto);
  }
}
