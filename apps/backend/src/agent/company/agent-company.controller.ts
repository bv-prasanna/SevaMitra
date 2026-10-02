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
import { AgentCompanyService } from './agent-company.service';
import { CreateAgentCompanyDto } from '../dto/create-agent-company.dto';
import { UpdateAgentCompanyDto } from '../dto/update-agent-company.dto';
import { AgentCompanyDto } from '../dto/responses/agent-company.dto';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';

@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'agent-companies', version: '1' })
export class AgentCompanyController {
  constructor(private readonly agentCompanyService: AgentCompanyService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('agent.company.manage')
  @ApiOperation({ summary: 'Create an agent company' })
  @ApiOkResponse({ type: AgentCompanyDto })
  create(@Body() dto: CreateAgentCompanyDto) {
    return this.agentCompanyService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'List agent companies — unrestricted so an agent can browse which one to join',
  })
  @ApiOkResponse({ type: AgentCompanyDto, isArray: true })
  findAll() {
    return this.agentCompanyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent company by id' })
  @ApiOkResponse({ type: AgentCompanyDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('id') id: string) {
    return this.agentCompanyService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('agent.company.manage')
  @ApiOperation({
    summary: 'Update an agent company — isActive is the only deactivation path',
  })
  @ApiOkResponse({ type: AgentCompanyDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateAgentCompanyDto) {
    return this.agentCompanyService.update(id, dto);
  }
}
