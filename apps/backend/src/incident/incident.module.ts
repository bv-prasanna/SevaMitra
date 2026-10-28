import {Module} from '@nestjs/common';
import {IamModule} from '../iam/iam.module';
import {IncidentService} from './incident.service';
import {IncidentCustomerController,IncidentAdminController} from './incident.controller';
@Module({
 imports:[IamModule],
 controllers:[IncidentCustomerController,IncidentAdminController],
 providers:[IncidentService],
})
export class IncidentModule {}
