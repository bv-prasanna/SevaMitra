import {plainToInstance} from 'class-transformer';
import {validate} from 'class-validator';
import type {IncidentService} from './incident.service';
import {IncidentCustomerController,IncidentAdminController} from './incident.controller';
import {IncidentStatus} from '@prisma/client';
import {ChangeIncidentStatusDto,EscalateIncidentDto,IncidentListDto,OpenIncidentDto} from './incident.dto';
import {PERMISSIONS_KEY} from '../iam/authorization/require-permissions.decorator';

describe('Incident routes and validation',()=>{
 const incidentId='case-1',user={id:'user-1',phoneNumber:null,email:null};
 let service:{
  open:jest.Mock;mine:jest.Mock;mineOne:jest.Mock;
  list:jest.Mock;detail:jest.Mock;claim:jest.Mock;changeStatus:jest.Mock;escalate:jest.Mock;
 };
 let customer:IncidentCustomerController,admin:IncidentAdminController;
 beforeEach(()=>{
  service={
   open:jest.fn().mockResolvedValue({id:incidentId}),
   mine:jest.fn().mockResolvedValue([]),
   mineOne:jest.fn().mockResolvedValue({id:incidentId}),
   list:jest.fn().mockResolvedValue([]),
   detail:jest.fn().mockResolvedValue({id:incidentId}),
   claim:jest.fn().mockResolvedValue({id:incidentId}),
   changeStatus:jest.fn().mockResolvedValue({id:incidentId}),
   escalate:jest.fn().mockResolvedValue({id:incidentId}),
  };
  customer=new IncidentCustomerController(service as unknown as IncidentService);
  admin=new IncidentAdminController(service as unknown as IncidentService);
 });
 it('writes a report using server-verified reporter identity',async()=>{
  const dto:OpenIncidentDto={category:'SERVICE_ISSUE',title:'Failed visit',description:'Provider did not appear'};
  await customer.open(user,dto);
  expect(service.open).toHaveBeenCalledWith('user-1',dto);
 });
 it('limits customer listing and details by their own user ID',async()=>{
  await customer.mine(user);
  await customer.mineOne(user,incidentId);
  expect(service.mine).toHaveBeenCalledWith('user-1');
  expect(service.mineOne).toHaveBeenCalledWith('user-1','case-1');
 });
 it('requires incident.manage permission on all admin actions',()=>{
  expect(Reflect.getMetadata(PERMISSIONS_KEY,IncidentAdminController)).toEqual(['incident.manage']);
 });
 it('delegates admin listing and detail without revealing others cases to customer route',async()=>{
  await admin.list({status:IncidentStatus.OPEN});
  await admin.detail(incidentId);
  expect(service.list).toHaveBeenCalledWith(IncidentStatus.OPEN);
  expect(service.detail).toHaveBeenCalledWith(incidentId);
 });
 it('takes reviewer identity from the validated JWT when claiming an incident',async()=>{
  await admin.claim(incidentId,user);
  expect(service.claim).toHaveBeenCalledWith('case-1','user-1');
 });
 it('passes state transition and note to the controlled lifecycle',async()=>{
  const dto:ChangeIncidentStatusDto={status:IncidentStatus.IN_PROGRESS,note:'Owner assigned'};
  await admin.status(incidentId,user,dto);
  expect(service.changeStatus).toHaveBeenCalledWith('case-1','user-1',dto);
 });
 it('passes manual escalation note and actor identity',async()=>{
  const dto:EscalateIncidentDto={note:'No acknowledgement after review'};
  await admin.escalate(incidentId,user,dto);
  expect(service.escalate).toHaveBeenCalledWith('case-1','user-1',dto.note);
 });
 it('accepts a legitimate incident and limits the category vocabulary',async()=>{
  const dto=plainToInstance(OpenIncidentDto,{category:'SAFETY',title:'Urgent report',description:'Needs an operations review'});
  expect(await validate(dto)).toHaveLength(0);
  const bad=plainToInstance(OpenIncidentDto,{category:'SUPER_ADMIN',title:'',description:''});
  expect((await validate(bad)).length).toBeGreaterThanOrEqual(3);
 });
 it('rejects excessively long incident details',async()=>{
  const dto=plainToInstance(OpenIncidentDto,{category:'OTHER',title:'x'.repeat(161),description:'x'.repeat(2001)});
  expect((await validate(dto)).length).toBeGreaterThanOrEqual(2);
 });
 it('only permits transition targets and requires an explanatory note',async()=>{
  const valid=plainToInstance(ChangeIncidentStatusDto,{status:'RESOLVED',note:'Customer confirms resolution'});
  expect(await validate(valid)).toHaveLength(0);
  const bad=plainToInstance(ChangeIncidentStatusDto,{status:'OPEN',note:''});
  expect((await validate(bad)).length).toBeGreaterThanOrEqual(2);
 });
 it('requires note to escalate, preventing unaudited stage changes',async()=>{
  const dto=plainToInstance(EscalateIncidentDto,{note:' '});
  expect((await validate(dto)).length).toBeGreaterThanOrEqual(1);
 });
 it('rejects unsupported admin report status filters',async()=>{
  const bad=plainToInstance(IncidentListDto,{status:'UNKNOWN'});
  expect((await validate(bad)).length).toBeGreaterThan(0);
  expect(await validate(plainToInstance(IncidentListDto,{}))).toHaveLength(0);
 });
});
