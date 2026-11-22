import {Body,Controller,Delete,Get,Param,Put,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {IncidentSeverity} from '@prisma/client';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {CurrentUser} from '../auth/decorators/current-user.decorator';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';
import {IncidentService} from './incident.service';
import {UpsertIncidentSlaPolicyDto} from './incident.dto';
@ApiTags('Incident SLA policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions('incident.sla.manage')
@Controller({path:'incidents/admin/sla',version:'1'})
export class IncidentSlaAdminController{
 constructor(private readonly incidents:IncidentService){}
 @Get() list(){return this.incidents.listSlaPolicies()}
 @Put() upsert(@CurrentUser() actor:AuthenticatedUser,@Body() dto:UpsertIncidentSlaPolicyDto){return this.incidents.upsertSlaPolicy(actor.id,dto)}
 @Delete(':severity') disable(@Param('severity') severity:IncidentSeverity,@CurrentUser() actor:AuthenticatedUser){return this.incidents.disableSlaPolicy(severity,actor.id)}
}
