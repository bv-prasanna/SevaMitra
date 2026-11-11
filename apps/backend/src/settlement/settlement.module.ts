import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IamModule } from '../iam/iam.module';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { ProviderModule } from '../provider/provider.module';
import { GeographyModule } from '../geography/geography.module';
import { SettlementConfigService } from './config/settlement-config.service';
import { SettlementConfigController } from './config/settlement-config.controller';
import { SettlementService } from './run/settlement.service';
import { SettlementController } from './run/settlement.controller';
import { ProviderSettlementController } from './run/provider/provider-settlement.controller';
import { PAYOUT_GATEWAY } from './gateway/payout-gateway.interface';
import { StubPayoutGateway } from './gateway/stub-payout.gateway';
import { DisabledPayoutGateway } from './gateway/disabled-payout.gateway';

@Module({
  imports: [IamModule, CatalogueModule, ProviderModule, GeographyModule],
  controllers: [
    // SettlementConfigController (/settlement/config) and
    // ProviderSettlementController (/settlement/provider/me) must be
    // registered before SettlementController, whose GET /settlement/:id
    // would otherwise swallow "config" and "provider" as an :id.
    SettlementConfigController,
    ProviderSettlementController,
    SettlementController,
  ],
  providers: [
    SettlementConfigService,
    SettlementService,
    {
      provide: PAYOUT_GATEWAY, inject:[ConfigService],
      useFactory:(cfg:ConfigService)=>{
        const env=cfg.get<string>('NODE_ENV')||'';
        const provider=cfg.get<string>('PAYOUT_PROVIDER');
        return !['staging','production'].includes(env)&&
          (provider==='stub'||(!provider&&['development','test'].includes(env)))
            ? new StubPayoutGateway():new DisabledPayoutGateway();
      },
    },
  ],
})
export class SettlementModule {}
