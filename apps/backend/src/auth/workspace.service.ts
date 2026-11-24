import {Injectable} from '@nestjs/common';
import {ProviderStatus, AgentStatus, CustomerStatus} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {AuthorizationService} from '../iam/authorization/authorization.service';

export type WorkspacePermissions={
 customer:boolean;
 provider:boolean;
 agent:boolean;
 admin:boolean;
 /** For menu display only; every route still enforces its own permissions. */
 adminPermissions:string[];
 canJoinProvider:boolean;
 canJoinAgent:boolean;
 providerStatus:string|null;
 agentStatus:string|null;
};

/**
 * Server-owned navigation entitlements. Customer registration remains open;
 * provider and agent workspaces appear once a non-deleted profile exists.
 * Administrative workspace is visible to any authorized administrative role.
 *
 * This is a navigation hint, NOT authorization: each action must independently
 * enforce JWT identity, permission and resource ownership on the server.
 */
const ADMIN_NAV_PERMISSIONS=new Set([
 'provider.onboarding.review','agent.review','catalogue.manage',
 'provider.organization.manage','iam.role.manage','iam.role.view',
]);

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
  const adminPermissions=keys.has('*')?['*']:[...keys].filter(key=>ADMIN_NAV_PERMISSIONS.has(key)).sort();
  return {
   customer:!customer||(!customer.deletedAt&&customer.status!==CustomerStatus.DELETED),
   provider:providerValid,agent:agentValid,
   admin:adminPermissions.length>0,adminPermissions,
   canJoinProvider:!providerValid,canJoinAgent:!agentValid,
   providerStatus:providerValid?provider!.status:null,
   agentStatus:agentValid?agent!.status:null,
  };
 }
}
