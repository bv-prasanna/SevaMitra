import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { GeographyModule } from '../geography/geography.module';
import { IamModule } from '../iam/iam.module';
import { CoverageProfileController } from './coverage-profile/coverage-profile.controller';
import { CoverageProfileService } from './coverage-profile/coverage-profile.service';
import { CoverageAreaController } from './coverage-area/coverage-area.controller';
import { CoverageAreaAdminController } from './coverage-area/coverage-area-admin.controller';
import { CoverageAreaService } from './coverage-area/coverage-area.service';
import { CheckController } from './check/check.controller';
import { DiscoveryController } from './discovery/discovery.controller';
import { DiscoveryService } from './discovery/discovery.service';
import { CoverageCheckService } from './check/coverage-check.service';

@Module({
  imports: [ProviderModule, GeographyModule, IamModule],
  controllers: [
    CoverageProfileController,
    CoverageAreaController,
    CoverageAreaAdminController,
    CheckController,
    DiscoveryController,
  ],
  providers: [
    CoverageProfileService,
    CoverageAreaService,
    CoverageCheckService,
    DiscoveryService,
  ],
  exports: [CoverageCheckService],
})
export class ServiceabilityModule {}
