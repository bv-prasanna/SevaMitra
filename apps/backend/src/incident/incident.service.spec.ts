import {ConflictException,ForbiddenException,NotFoundException} from '@nestjs/common';
import {IncidentStatus} from '@prisma/client';
import type {PrismaService} from '../prisma/prisma.service';
import {IncidentService} from './incident.service';

describe('IncidentService',()=>{
 let prisma:{
  incidentCase:{create:jest.Mock,findMany:jest.Mock,findFirst:jest.Mock,findUnique:jest.Mock,findUniqueOrThrow:jest.Mock,updateMany:jest.Mock};
  incidentCaseActivity:{create:jest.Mock};
  $transaction:jest.Mock;
 };
 let service:IncidentService;
 const current={id:'case-1',reporterId:'reporter-1',assignedToId:'reviewer-1',status:IncidentStatus.ACKNOWLEDGED,level:1};
 beforeEach(()=>{
  prisma={
   incidentCase:{
    create:jest.fn().mockResolvedValue({id:'case-1'}),
    findMany:jest.fn().mockResolvedValue([]),
    findFirst:jest.fn().mockResolvedValue(null),
    findUnique:jest.fn().mockResolvedValue(current),
    findUniqueOrThrow:jest.fn().mockResolvedValue(current),
    updateMany:jest.fn().mockResolvedValue({count:1}),
   },
   incidentCaseActivity:{create:jest.fn().mockResolvedValue({id:'activity-1'})},
   $transaction:jest.fn(),
  };
  prisma.$transaction.mockImplementation(async(fn:(tx:typeof prisma)=>Promise<unknown>)=>fn(prisma));
  service=new IncidentService(prisma as unknown as PrismaService);
 });
 it('creates a case and an OPENED audit activity in the same database write',async()=>{
  await service.open('reporter-1',{category:'SERVICE_ISSUE',title:'Missed appointment',description:'The provider did not arrive'});
  expect(prisma.incidentCase.create).toHaveBeenCalledWith({data:{
   reporterId:'reporter-1',category:'SERVICE_ISSUE',title:'Missed appointment',description:'The provider did not arrive',
   activities:{create:{actorId:'reporter-1',action:'OPENED'}},
  }});
 });
 it('only lists cases belonging to the authenticated reporter',async()=>{
  await service.mine('reporter-1');
  expect(prisma.incidentCase.findMany).toHaveBeenCalledWith(expect.objectContaining({
   where:{reporterId:'reporter-1'},take:50,
  }));
 });
 it('hides other reporters cases as Not Found',async()=>{
  prisma.incidentCase.findFirst.mockResolvedValue(null);
  await expect(service.mineOne('outsider','case-1')).rejects.toThrow(NotFoundException);
  expect(prisma.incidentCase.findFirst).toHaveBeenCalledWith(expect.objectContaining({
   where:{id:'case-1',reporterId:'outsider'},
  }));
 });
 it('lists only requested status for operational reviewer',async()=>{
  await service.list(IncidentStatus.OPEN);
  expect(prisma.incidentCase.findMany).toHaveBeenCalledWith(expect.objectContaining({
   where:{status:IncidentStatus.OPEN},take:100,
  }));
 });
 it('denies lookup for absent case',async()=>{
  prisma.incidentCase.findUnique.mockResolvedValue(null);
  await expect(service.detail('missing')).rejects.toThrow(NotFoundException);
 });
 it('claims incident exactly once and records activity atomically',async()=>{
  await service.claim('case-1','reviewer-2');
  expect(prisma.incidentCase.updateMany).toHaveBeenCalledWith({
   where:{id:'case-1',assignedToId:null,status:IncidentStatus.OPEN},
   data:{assignedToId:'reviewer-2',status:IncidentStatus.ACKNOWLEDGED},
  });
  expect(prisma.incidentCaseActivity.create).toHaveBeenCalledWith({
   data:{incidentId:'case-1',actorId:'reviewer-2',action:'CLAIMED'},
  });
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
 });
 it('prevents concurrent double claim without creating an activity',async()=>{
  prisma.incidentCase.updateMany.mockResolvedValue({count:0});
  await expect(service.claim('case-1','reviewer-2')).rejects.toThrow(ConflictException);
  expect(prisma.incidentCaseActivity.create).not.toHaveBeenCalled();
 });
 it('denies non-owner changing status',async()=>{
  await expect(service.changeStatus('case-1','outsider',{status:IncidentStatus.IN_PROGRESS,note:'Working'})).rejects.toThrow(ForbiddenException);
  expect(prisma.incidentCase.updateMany).not.toHaveBeenCalled();
 });
 it('rejects an out-of-order transition',async()=>{
  await expect(service.changeStatus('case-1','reviewer-1',{status:IncidentStatus.CLOSED,note:'No'})).rejects.toThrow(ConflictException);
  expect(prisma.incidentCaseActivity.create).not.toHaveBeenCalled();
 });
 it('moves acknowledged to in progress and emits an activity',async()=>{
  await service.changeStatus('case-1','reviewer-1',{status:IncidentStatus.IN_PROGRESS,note:'I contacted provider'});
  expect(prisma.incidentCase.updateMany).toHaveBeenCalledWith({
   where:{id:'case-1',status:IncidentStatus.ACKNOWLEDGED,assignedToId:'reviewer-1'},
   data:{status:IncidentStatus.IN_PROGRESS,closedAt:null},
  });
  expect(prisma.incidentCaseActivity.create).toHaveBeenCalledWith({
   data:{incidentId:'case-1',actorId:'reviewer-1',action:'STATUS_IN_PROGRESS',note:'I contacted provider'},
  });
 });
 it('closes only a resolved incident',async()=>{
  prisma.incidentCase.findUnique.mockResolvedValue({...current,status:IncidentStatus.RESOLVED});
  await service.changeStatus('case-1','reviewer-1',{status:IncidentStatus.CLOSED,note:'Confirmed'});
  const arg=prisma.incidentCase.updateMany.mock.calls[0][0];
  expect(arg.data.status).toBe(IncidentStatus.CLOSED);
  expect(arg.data.closedAt).toBeInstanceOf(Date);
 });
 it('detects a conflicting update without emitting an activity',async()=>{
  prisma.incidentCase.updateMany.mockResolvedValue({count:0});
  await expect(service.changeStatus('case-1','reviewer-1',{status:IncidentStatus.IN_PROGRESS,note:'Working'})).rejects.toThrow(ConflictException);
  expect(prisma.incidentCaseActivity.create).not.toHaveBeenCalled();
 });
 it('permits explicit, audited L1 to L2 escalation',async()=>{
  await service.escalate('case-1','reviewer-2','No response from assigned owner');
  expect(prisma.incidentCase.updateMany).toHaveBeenCalledWith({
   where:{id:'case-1',status:IncidentStatus.ACKNOWLEDGED,level:1},
   data:{level:2},
  });
  expect(prisma.incidentCaseActivity.create).toHaveBeenCalledWith({
   data:{incidentId:'case-1',actorId:'reviewer-2',action:'ESCALATED_L2',note:'No response from assigned owner'},
  });
 });
 it.each([IncidentStatus.CLOSED,IncidentStatus.OPEN])('does not escalate invalid closed or L3 case %s',async status=>{
  prisma.incidentCase.findUnique.mockResolvedValue({...current,status,level:status===IncidentStatus.OPEN?3:1});
  await expect(service.escalate('case-1','reviewer-2','Review')).rejects.toThrow(ConflictException);
 });
 it('does not create an escalation activity if another reviewer already changed the level',async()=>{
  prisma.incidentCase.updateMany.mockResolvedValue({count:0});
  await expect(service.escalate('case-1','reviewer-2','Review')).rejects.toThrow(ConflictException);
  expect(prisma.incidentCaseActivity.create).not.toHaveBeenCalled();
 });
});
