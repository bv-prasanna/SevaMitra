import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentCompanyController } from './company/agent-company.controller';
import { AgentCompanyService } from './company/agent-company.service';

@Module({
  imports: [IamModule],
  controllers: [AgentController, AgentCompanyController],
  providers: [AgentService, AgentCompanyService],
  exports: [AgentService, AgentCompanyService],
})
export class AgentModule {}
