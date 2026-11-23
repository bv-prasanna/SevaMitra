import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { IamModule } from '../iam/iam.module';
import { FinanceConfigModule } from './finance-config.module';
import { FinanceBillingService } from './billing.service';
import { FinanceRulesService } from './rules.service';
import { FinanceQuoteService } from './quote.service';
import { AdminBillingController, MyBillingController } from './billing.controller';

describe('FinanceConfigModule wiring', () => {
  it('registers the IAM dependency, billing controllers and finance providers', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, FinanceConfigModule)).toContain(IamModule);
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, FinanceConfigModule))
      .toEqual(expect.arrayContaining([AdminBillingController, MyBillingController]));
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, FinanceConfigModule))
      .toEqual(expect.arrayContaining([FinanceBillingService, FinanceRulesService, FinanceQuoteService]));
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, FinanceConfigModule)).toContain(FinanceQuoteService);
  });
});
