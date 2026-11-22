import {Module} from '@nestjs/common';
import {IamModule} from '../iam/iam.module';
import {AppReleaseService} from './app-release.service';
import {AppReleaseAdminController,AppReleasePublicController} from './app-release.controller';
@Module({imports:[IamModule],controllers:[AppReleasePublicController,AppReleaseAdminController],providers:[AppReleaseService]})
export class AppReleaseModule{}
