import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { CatalogueModule } from '../catalogue/catalogue.module';
import { OfferingController } from './offering.controller';
import { OfferingBrowseController } from './offering-browse.controller';
import { OfferingService } from './offering.service';

@Module({
  imports: [ProviderModule, CatalogueModule],
  // OfferingController's literal "/me" path must be registered before
  // OfferingBrowseController's "/:id" — otherwise a request to
  // "/provider-offerings/me" could be routed as if "me" were an :id.
  controllers: [OfferingController, OfferingBrowseController],
  providers: [OfferingService],
  exports: [OfferingService],
})
export class ProviderOfferingModule {}
