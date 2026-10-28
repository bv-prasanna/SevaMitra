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
import { StateService } from './state.service';
import { CreateStateDto } from '../dto/create-state.dto';
import { UpdateStateDto } from '../dto/update-state.dto';
import { StateDto } from '../dto/responses/state.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Geography')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'geography/states', version: '1' })
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('geography.manage')
  @ApiOperation({ summary: 'Create a state' })
  @ApiOkResponse({ type: StateDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateStateDto) {
    return this.stateService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all states (active and inactive)' })
  @ApiOkResponse({ type: StateDto, isArray: true })
  findAll() {
    return this.stateService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a state by id' })
  @ApiOkResponse({ type: StateDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.stateService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('geography.manage')
  @ApiOperation({
    summary: 'Update a state — isActive is the only deactivation path',
  })
  @ApiOkResponse({ type: StateDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateStateDto) {
    return this.stateService.update(id, dto);
  }
}
