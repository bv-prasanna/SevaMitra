import {Module} from '@nestjs/common';
import {IamModule} from '../iam/iam.module';
import {IncidentService} from './incident.service';
import {IncidentCustomerController,IncidentAdminController} from './incident.controller';
import {IncidentSlaAdminController} from './incident-sla.controller';
import {IncidentCronController} from './incident-cron.controller';
@Module({
 imports:[IamModule],
 controllers:[IncidentCustomerController,IncidentAdminController,IncidentSlaAdminController,IncidentCronController],
 providers:[IncidentService],
})
export class IncidentModule {}
