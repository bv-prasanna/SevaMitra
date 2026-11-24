import {Module} from '@nestjs/common';
import {IamModule} from '../iam/iam.module';
import {OrganizationService} from './organization.service';
import {OrganizationController} from './organization.controller';
@Module({imports:[IamModule],controllers:[OrganizationController],providers:[OrganizationService],exports:[OrganizationService]})
export class OrganizationModule{}
