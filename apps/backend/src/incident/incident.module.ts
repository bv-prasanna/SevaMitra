import {Module} from '@nestjs/common';
import {IamModule} from '../iam/iam.module';
import {IncidentService} from './incident.service';
import {IncidentCustomerController,IncidentAdminController} from './incident.controller';
import {IncidentSlaCronController} from './incident-sla-cron.controller';
@Module({
 imports:[IamModule],
 controllers:[IncidentCustomerController,IncidentAdminController,IncidentSlaCronController],
 providers:[IncidentService],
})
export class IncidentModule {}
