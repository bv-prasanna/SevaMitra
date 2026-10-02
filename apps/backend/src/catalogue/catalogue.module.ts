import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { CategoryController } from './category/category.controller';
import { CategoryService } from './category/category.service';
import { ServiceController } from './service/service.controller';
import { ServiceService } from './service/service.service';
import { VariantController } from './variant/variant.controller';
import { VariantService } from './variant/variant.service';

@Module({
  imports: [IamModule],
  controllers: [CategoryController, ServiceController, VariantController],
  providers: [CategoryService, ServiceService, VariantService],
  // VariantService is exported for Provider Offering to validate a
  // variantId belongs to a given serviceId — no consumer needed this
  // before that module existed.
  exports: [CategoryService, ServiceService, VariantService],
})
export class CatalogueModule {}
