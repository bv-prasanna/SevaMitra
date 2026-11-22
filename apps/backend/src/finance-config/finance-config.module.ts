import {FinanceBillingService} from './billing.service';
import {MyBillingController,AdminBillingController} from './billing.controller';
import {Module} from '@nestjs/common';
import {IamModule} from '../iam/iam.module';
import {FinanceRulesController} from './rules.controller';
import {FinanceRulesService} from './rules.service';
import {FinanceQuoteService} from './quote.service';
import {QuoteController} from './quote.controller';
@Module({imports:[IamModule],
 controllers:[FinanceRulesController,QuoteController,MyBillingController,AdminBillingController],
 providers:[FinanceRulesService,FinanceQuoteService,FinanceBillingService],
 exports:[FinanceQuoteService]})
export class FinanceConfigModule{}
