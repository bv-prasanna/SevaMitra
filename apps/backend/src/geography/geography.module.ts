import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { StateController } from './state/state.controller';
import { StateService } from './state/state.service';
import { DistrictController } from './district/district.controller';
import { DistrictService } from './district/district.service';
import { TalukController } from './taluk/taluk.controller';
import { TalukService } from './taluk/taluk.service';
import { TownVillageController } from './town-village/town-village.controller';
import { TownVillageService } from './town-village/town-village.service';

@Module({
  imports: [IamModule],
  controllers: [
    StateController,
    DistrictController,
    TalukController,
    TownVillageController,
  ],
  providers: [StateService, DistrictService, TalukService, TownVillageService],
  exports: [StateService, DistrictService, TalukService, TownVillageService],
})
export class GeographyModule {}
