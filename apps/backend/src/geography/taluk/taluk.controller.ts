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
import { TalukService } from './taluk.service';
import { CreateTalukDto } from '../dto/create-taluk.dto';
import { UpdateTalukDto } from '../dto/update-taluk.dto';
import { ListTaluksQueryDto } from '../dto/list-taluks-query.dto';
import { TalukDto } from '../dto/responses/taluk.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Geography')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'geography/taluks', version: '1' })
export class TalukController {
  constructor(private readonly talukService: TalukService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('geography.manage')
  @ApiOperation({ summary: 'Create a taluk within a district' })
  @ApiOkResponse({ type: TalukDto })
  @ApiNotFoundResponse({
    description: 'districtId does not exist',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateTalukDto) {
    return this.talukService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List taluks, optionally filtered by district' })
  @ApiOkResponse({ type: TalukDto, isArray: true })
  findAll(@Query() query: ListTaluksQueryDto) {
    return this.talukService.findAll(query.districtId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a taluk by id' })
  @ApiOkResponse({ type: TalukDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.talukService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('geography.manage')
  @ApiOperation({
    summary:
      'Update a taluk — isActive is the only deactivation path; districtId may be changed to re-parent',
  })
  @ApiOkResponse({ type: TalukDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateTalukDto) {
    return this.talukService.update(id, dto);
  }
}
