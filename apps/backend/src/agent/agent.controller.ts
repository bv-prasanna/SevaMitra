import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { AgentService } from './agent.service';
import { CreateAgentProfileDto } from './dto/create-agent-profile.dto';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { AgentProfileDto } from './dto/responses/agent-profile.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'agents/me', version: '1' })
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create the agent profile for the current account — starts PENDING, issues a stable agentCode',
  })
  @ApiOkResponse({ type: AgentProfileDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({
    description: 'agentCompanyId does not exist or is inactive',
    type: ErrorResponseDto,
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAgentProfileDto,
  ) {
    return this.agentService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get the current account's agent profile" })
  @ApiOkResponse({ type: AgentProfileDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.agentService.findByUserId(user.id);
  }

  @Patch()
  @ApiOperation({
    summary:
      "Update the current account's agent profile (status is not settable here; agentCompanyId: null leaves the current company)",
  })
  @ApiOkResponse({ type: AgentProfileDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAgentProfileDto,
  ) {
    return this.agentService.update(user.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Delete the agent profile — anonymizes PII, does not remove the row (BRD §14.4)',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async remove(@CurrentUser() user: AuthenticatedUser) {
    await this.agentService.softDelete(user.id);
  }
}
