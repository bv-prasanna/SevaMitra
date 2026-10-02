import { Module } from '@nestjs/common';
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
    { provide: PAYOUT_GATEWAY, useClass: StubPayoutGateway },
  ],
})
export class SettlementModule {}
