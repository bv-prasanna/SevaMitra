import {Body,Controller,Get,Param,Patch,UseGuards} from '@nestjs/common';
import {IsIn} from 'class-validator';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';
import {AgentService} from './agent.service';

class AgentDecisionDto {
 @IsIn(['APPROVE','SUSPEND'])
 decision: 'APPROVE' | 'SUSPEND';
}

@ApiTags('Agent Administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions('agent.review')
@Controller({path:'agents/admin',version:'1'})
export class AgentAdminController {
 constructor(private readonly agents:AgentService){}
 @Get()
 list(){return this.agents.listForReview();}
 @Patch(':id/status')
 decide(@Param('id') id:string,@Body() body:AgentDecisionDto){
  return this.agents.decideStatus(id,body.decision);
 }
}
