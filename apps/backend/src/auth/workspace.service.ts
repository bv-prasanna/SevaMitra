import {Injectable} from '@nestjs/common';
import {ProviderStatus, AgentStatus, CustomerStatus} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {AuthorizationService} from '../iam/authorization/authorization.service';

export type WorkspacePermissions={
 customer:boolean;
 provider:boolean;
 agent:boolean;
 admin:boolean;
 canJoinProvider:boolean;
 canJoinAgent:boolean;
 providerStatus:string|null;
 agentStatus:string|null;
};

/**
 * Server-owned navigation entitlements. Customer registration remains open;
 * provider and agent workspaces appear once a non-deleted profile exists.
 * Administrative workspace is restricted to onboarding reviewers.
 *
 * This is a navigation hint, NOT authorization: each action must independently
 * enforce JWT identity, permission and resource ownership on the server.
 */
@Injectable()
export class WorkspaceService{
 constructor(private readonly prisma:PrismaService,private readonly iam:AuthorizationService){}
 async forUser(userId:string):Promise<WorkspacePermissions>{
  const [provider,agent,customer,keys]=await Promise.all([
   this.prisma.providerProfile.findUnique({where:{userId},select:{status:true,deletedAt:true}}),
   this.prisma.agentProfile.findUnique({where:{userId},select:{status:true,deletedAt:true}}),
   this.prisma.customerProfile.findUnique({where:{userId},select:{status:true,deletedAt:true}}),
   this.iam.getEffectivePermissionKeys(userId),
  ]);
  const providerValid=Boolean(provider&&!provider.deletedAt&&provider.status!==ProviderStatus.DELETED);
  const agentValid=Boolean(agent&&!agent.deletedAt&&agent.status!==AgentStatus.DELETED);
  return {
   customer:!customer||(!customer.deletedAt&&customer.status!==CustomerStatus.DELETED),
   provider:providerValid,agent:agentValid,
   admin:keys.has('*')||keys.has('provider.onboarding.review'),
   canJoinProvider:!providerValid,canJoinAgent:!agentValid,
   providerStatus:providerValid?provider!.status:null,
   agentStatus:agentValid?agent!.status:null,
  };
 }
}
