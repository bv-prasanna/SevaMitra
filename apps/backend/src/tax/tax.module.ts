import {Module} from '@nestjs/common';
import {IamModule} from '../iam/iam.module';
import {TaxAssessmentService} from './tax-assessment.service';
import {TaxAssessmentController} from './tax-assessment.controller';
@Module({imports:[IamModule],controllers:[TaxAssessmentController],providers:[TaxAssessmentService]})
export class TaxAssessmentModule{}
