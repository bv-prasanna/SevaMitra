
import {OrganizationController} from './organization.controller';
import type {OrganizationService} from './organization.service';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';

describe('Provider organization administration API contracts',()=>{
 const api={createCompany:jest.fn(),listCompanies:jest.fn(),getCompany:jest.fn(),approveCompany:jest.fn(),createGroup:jest.fn(),addStaff:jest.fn(),addMember:jest.fn()};
 const controller=new OrganizationController(api as unknown as OrganizationService);
 const admin={id:'admin-user',phoneNumber:null,email:null} as AuthenticatedUser;
 beforeEach(()=>jest.resetAllMocks());
 it('sets company owner from the authenticated actor, never a submitted owner ID',async()=>{
  const dto={name:'Our Services',ownerUserId:'attacker-2'} as Parameters<OrganizationController['create']>[1];
  await controller.create(admin,dto);
  expect(api.createCompany).toHaveBeenCalledWith('admin-user',dto);
 });
 it('lists organizations only through admin service',async()=>{
  await controller.list();expect(api.listCompanies).toHaveBeenCalledTimes(1);
 });
 it('provides company detail under the selected identifier',async()=>{
  await controller.detail('company-1');expect(api.getCompany).toHaveBeenCalledWith('company-1');
 });
 it('approves a company with a deliberate admin action',async()=>{
  await controller.approve('company-1');expect(api.approveCompany).toHaveBeenCalledWith('company-1');
 });
 it('creates a group only inside the selected company',async()=>{
  const dto={name:'Bangalore Team'};await controller.group('company-1',dto);
  expect(api.createGroup).toHaveBeenCalledWith('company-1',dto);
 });
 it('adds staff by company context',async()=>{
  const dto={displayName:'Manjunath'};await controller.staff('company-1',dto);
  expect(api.addStaff).toHaveBeenCalledWith('company-1',dto);
 });
 it('adds provider membership only by selected company context',async()=>{
  const dto={providerId:'provider-1'};await controller.link('company-1',dto);
  expect(api.addMember).toHaveBeenCalledWith('company-1',dto);
 });
});
