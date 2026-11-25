import {Body,Controller,Get,Param,Patch,Post,Query,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {CurrentUser} from '../auth/decorators/current-user.decorator';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';
import {IncidentService} from './incident.service';
import {ChangeIncidentStatusDto,EscalateIncidentDto,IncidentListDto,OpenIncidentDto} from './incident.dto';
import {CreateIncidentSlaHolidayDto,CreateIncidentSlaPolicyDto} from './incident-sla.dto';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({path:'incidents',version:'1'})
export class IncidentCustomerController {
 constructor(private readonly incidents:IncidentService){}
 @Post()
 open(@CurrentUser() actor:AuthenticatedUser,@Body() dto:OpenIncidentDto){return this.incidents.open(actor.id,dto)}
 @Get('mine')
 mine(@CurrentUser() actor:AuthenticatedUser){return this.incidents.mine(actor.id)}
 @Get('mine/:id')
 mineOne(@CurrentUser() actor:AuthenticatedUser,@Param('id') id:string){return this.incidents.mineOne(actor.id,id)}
}
@ApiTags('Incident operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions('incident.manage')
@Controller({path:'incidents/admin',version:'1'})
export class IncidentAdminController {
 constructor(private readonly incidents:IncidentService){}
 @Get()
 list(@Query() q:IncidentListDto){return this.incidents.list(q.status)}
 @Get('sla-policies')
 listSlaPolicies(){return this.incidents.listSlaPolicies()}
 @Post('sla-policies')
 createSlaPolicy(@CurrentUser() actor:AuthenticatedUser,@Body() dto:CreateIncidentSlaPolicyDto){
  return this.incidents.createSlaPolicy(actor.id,dto);
 }
 @Post('sla-policies/:id/approve')
 approveSlaPolicy(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser){
  return this.incidents.approveSlaPolicy(id,actor.id);
 }
 @Get('sla-holidays')
 listSlaHolidays(){return this.incidents.listSlaHolidays()}
 @Post('sla-holidays')
 createSlaHoliday(@CurrentUser() actor:AuthenticatedUser,@Body() dto:CreateIncidentSlaHolidayDto){
  return this.incidents.createSlaHoliday(actor.id,dto);
 }
 @Get(':id')
 detail(@Param('id') id:string){return this.incidents.detail(id)}
 @Patch(':id/claim')
 claim(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser){return this.incidents.claim(id,actor.id)}
 @Patch(':id/status')
 status(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser,@Body() dto:ChangeIncidentStatusDto){
  return this.incidents.changeStatus(id,actor.id,dto);
 }
 @Post(':id/escalate')
 escalate(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser,@Body() dto:EscalateIncidentDto){
  return this.incidents.escalate(id,actor.id,dto.note);
 }
}
