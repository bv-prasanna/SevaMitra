import { Module } from '@nestjs/common';
import { ProviderModule } from '../provider/provider.module';
import { AgentModule } from '../agent/agent.module';
import { IamModule } from '../iam/iam.module';
import { ApplicationController } from './application.controller';
import { ApplicationAdminController } from './application-admin.controller';
import { ApplicationService } from './application.service';
import { PrivateDocumentStorage } from './private-document.storage';

@Module({
  imports: [ProviderModule, AgentModule, IamModule],
  controllers: [ApplicationController, ApplicationAdminController],
  providers: [ApplicationService, PrivateDocumentStorage],
})
export class ProviderOnboardingModule {}
