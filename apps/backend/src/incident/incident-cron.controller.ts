import {Controller,Headers,HttpCode,Post,ServiceUnavailableException,UnauthorizedException} from '@nestjs/common';
import {ApiExcludeController} from '@nestjs/swagger';
import {ConfigService} from '@nestjs/config';
import {IncidentService} from './incident.service';
import {validIncidentCronSignature} from './incident-cron-signature';
@ApiExcludeController()
@Controller({path:'internal/incidents',version:'1'})
export class IncidentCronController{
 constructor(private readonly config:ConfigService,private readonly incidents:IncidentService){}
 @Post('escalate-due')
 @HttpCode(200)
 run(@Headers('x-sevamitra-cron-timestamp') timestamp?:string,@Headers('x-sevamitra-cron-signature') signature?:string){
  const secret=this.config.get<string>('INCIDENT_CRON_SECRET');
  if(!secret||secret.length<32)throw new ServiceUnavailableException('Incident SLA scheduler is not configured');
  if(!validIncidentCronSignature(secret,timestamp,signature))throw new UnauthorizedException('Invalid incident scheduler authorization');
  return this.incidents.escalateDue();
 }
}
