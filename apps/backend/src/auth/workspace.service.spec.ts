import {AgentStatus,CustomerStatus,ProviderStatus} from '@prisma/client';
import type {PrismaService} from '../prisma/prisma.service';
import type {AuthorizationService} from '../iam/authorization/authorization.service';
import {WorkspaceService} from './workspace.service';
import {WorkspaceController} from './workspace.controller';

describe('Role-aware mobile/web workspace menu',()=>{
 const prisma={
  providerProfile:{findUnique:jest.fn()},agentProfile:{findUnique:jest.fn()},
  customerProfile:{findUnique:jest.fn()},
 };
 const iam={getEffectivePermissionKeys:jest.fn()};
 const service=new WorkspaceService(prisma as unknown as PrismaService,iam as unknown as AuthorizationService);
 const controller=new WorkspaceController(service);
 beforeEach(()=>{
  jest.resetAllMocks();
  prisma.providerProfile.findUnique.mockResolvedValue(null);
  prisma.agentProfile.findUnique.mockResolvedValue(null);
  prisma.customerProfile.findUnique.mockResolvedValue(null);
  iam.getEffectivePermissionKeys.mockResolvedValue(new Set());
 });
 it('shows customer registration but no privileged workspaces to a new account',async()=>{
  const result=await service.forUser('new-user');
  expect(result).toEqual({
   customer:true,provider:false,agent:false,admin:false,
   canJoinProvider:true,canJoinAgent:true,providerStatus:null,agentStatus:null,
  });
 });
 it('shows an onboarding provider, even while verification is pending',async()=>{
  prisma.providerProfile.findUnique.mockResolvedValue({status:ProviderStatus.PENDING,deletedAt:null});
  const result=await service.forUser('user-1');
  expect(result.provider).toBe(true);
  expect(result.providerStatus).toBe(ProviderStatus.PENDING);
  expect(result.canJoinProvider).toBe(false);
  expect(result.admin).toBe(false);
 });
 it('shows agent workspace for a registered agent without giving admin access',async()=>{
  prisma.agentProfile.findUnique.mockResolvedValue({status:AgentStatus.ACTIVE,deletedAt:null});
  const result=await service.forUser('agent-user');
  expect(result.agent).toBe(true);
  expect(result.admin).toBe(false);
 });
 it('recognizes a scoped onboarding-review permission',async()=>{
  iam.getEffectivePermissionKeys.mockResolvedValue(new Set(['provider.onboarding.review']));
  const result=await service.forUser('reviewer');
  expect(result.admin).toBe(true);
  expect(result.provider).toBe(false);
 });
 it('recognizes super-admin wildcard without requiring provider profile',async()=>{
  iam.getEffectivePermissionKeys.mockResolvedValue(new Set(['*']));
  expect((await service.forUser('super-admin')).admin).toBe(true);
 });
 it('does not treat unrelated permissions as onboarding-admin privileges',async()=>{
  iam.getEffectivePermissionKeys.mockResolvedValue(new Set(['iam.permission.view','commission.rule.view']));
  expect((await service.forUser('limited-viewer')).admin).toBe(false);
 });
 it('supports several roles for the same phone/account',async()=>{
  prisma.providerProfile.findUnique.mockResolvedValue({status:ProviderStatus.ACTIVE,deletedAt:null});
  prisma.agentProfile.findUnique.mockResolvedValue({status:AgentStatus.ACTIVE,deletedAt:null});
  prisma.customerProfile.findUnique.mockResolvedValue({status:CustomerStatus.ACTIVE,deletedAt:null});
  iam.getEffectivePermissionKeys.mockResolvedValue(new Set(['provider.onboarding.review']));
  const result=await service.forUser('multi-role');
  expect([result.customer,result.provider,result.agent,result.admin]).toEqual([true,true,true,true]);
 });
 it('never shows deleted provider or agent profiles as active roles',async()=>{
  prisma.providerProfile.findUnique.mockResolvedValue({status:ProviderStatus.DELETED,deletedAt:new Date()});
  prisma.agentProfile.findUnique.mockResolvedValue({status:AgentStatus.DELETED,deletedAt:new Date()});
  const result=await service.forUser('offboarded');
  expect(result.provider).toBe(false);expect(result.agent).toBe(false);
  expect(result.canJoinProvider).toBe(true);expect(result.canJoinAgent).toBe(true);
 });
 it('checks the authenticated ID only; no self-selected user ID is accepted',async()=>{
  const user={id:'logged-in-user',phoneNumber:null,email:null};
  await controller.get(user);
  expect(prisma.providerProfile.findUnique).toHaveBeenCalledWith({
   where:{userId:'logged-in-user'},select:{status:true,deletedAt:true},
  });
  expect(iam.getEffectivePermissionKeys).toHaveBeenCalledWith('logged-in-user');
 });
});
