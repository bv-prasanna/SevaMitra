import {Module} from '@nestjs/common';
import {IamModule} from '../iam/iam.module';
import {FinanceRulesController} from './rules.controller';
import {FinanceRulesService} from './rules.service';
import {FinanceQuoteService} from './quote.service';
import {QuoteController} from './quote.controller';
@Module({imports:[IamModule],
 controllers:[FinanceRulesController,QuoteController],
 providers:[FinanceRulesService,FinanceQuoteService],
 exports:[FinanceQuoteService]})
export class FinanceConfigModule{}
