import {ConflictException,NotFoundException} from '@nestjs/common';
import {OrganizationStatus,ProviderStatus,VerificationStatus} from '@prisma/client';
import {OrganizationService} from './organization.service';
import type {PrismaService} from '../prisma/prisma.service';

describe('OrganizationService',()=>{
 let p:{providerCompany:{create:jest.Mock;findUnique:jest.Mock;findMany:jest.Mock;update:jest.Mock};providerGroup:{findUnique:jest.Mock;create:jest.Mock};providerStaff:{create:jest.Mock};providerProfile:{findUnique:jest.Mock};providerMembership:{findUnique:jest.Mock;create:jest.Mock};user:{findUnique:jest.Mock}};
 let service:OrganizationService;
 beforeEach(()=>{
  p={providerCompany:{create:jest.fn(),findUnique:jest.fn().mockResolvedValue({id:'company-1',status:OrganizationStatus.ACTIVE}),findMany:jest.fn(),update:jest.fn()},providerGroup:{findUnique:jest.fn().mockResolvedValue({id:'group-1',companyId:'company-1'}),create:jest.fn()},providerStaff:{create:jest.fn()},providerProfile:{findUnique:jest.fn().mockResolvedValue({status:ProviderStatus.ACTIVE,verificationStatus:VerificationStatus.VERIFIED})},providerMembership:{findUnique:jest.fn().mockResolvedValue(null),create:jest.fn()},user:{findUnique:jest.fn().mockResolvedValue({id:'user-1'})}};
  service=new OrganizationService(p as unknown as PrismaService);
 });
 it('creates a pending company owned by the authenticated user',async()=>{await service.createCompany('u-1',{name:' Example '});expect(p.providerCompany.create).toHaveBeenCalledWith({data:{ownerUserId:'u-1',name:'Example'}})});
 it('keeps new staff inactive by default',async()=>{await service.addStaff('company-1',{displayName:'Asha'});expect(p.providerStaff.create).toHaveBeenCalledWith({data:expect.objectContaining({companyId:'company-1',displayName:'Asha'})})});
 it('rejects an unknown company',async()=>{p.providerCompany.findUnique.mockResolvedValue(null);await expect(service.createGroup('unknown',{name:'Group'})).rejects.toThrow(NotFoundException)});
 it('rejects linking a member to a pending company',async()=>{p.providerCompany.findUnique.mockResolvedValue({status:OrganizationStatus.PENDING});await expect(service.addMember('company-1',{providerId:'provider-1'})).rejects.toThrow(ConflictException)});
 it('rejects a group belonging to another company',async()=>{p.providerGroup.findUnique.mockResolvedValue({companyId:'different'});await expect(service.addMember('company-1',{providerId:'provider-1',groupId:'group-1'})).rejects.toThrow(NotFoundException)});
 it('rejects inactive providers',async()=>{p.providerProfile.findUnique.mockResolvedValue({status:ProviderStatus.PENDING,verificationStatus:VerificationStatus.UNVERIFIED});await expect(service.addMember('company-1',{providerId:'provider-1'})).rejects.toThrow(ConflictException)});
 it('prevents a provider belonging to multiple companies',async()=>{p.providerMembership.findUnique.mockResolvedValue({id:'existing'});await expect(service.addMember('company-1',{providerId:'provider-1'})).rejects.toThrow(ConflictException)});
 it('enforces active member status on successful linkage',async()=>{await service.addMember('company-1',{providerId:'provider-1',groupId:'group-1'});expect(p.providerMembership.create).toHaveBeenCalledWith({data:{companyId:'company-1',providerId:'provider-1',groupId:'group-1',status:OrganizationStatus.ACTIVE}})});
 it('rejects nonexistent staff user',async()=>{p.user.findUnique.mockResolvedValue(null);await expect(service.addStaff('company-1',{displayName:'Asha',userId:'user-1'})).rejects.toThrow(NotFoundException)});
});
