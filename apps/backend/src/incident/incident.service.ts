import {ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {IncidentStatus} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {ChangeIncidentStatusDto,OpenIncidentDto} from './incident.dto';

const allowed:Partial<Record<IncidentStatus,readonly IncidentStatus[]>>={
 [IncidentStatus.ACKNOWLEDGED]:[IncidentStatus.IN_PROGRESS],
 [IncidentStatus.IN_PROGRESS]:[IncidentStatus.RESOLVED],
 [IncidentStatus.RESOLVED]:[IncidentStatus.IN_PROGRESS,IncidentStatus.CLOSED],
};
@Injectable()
export class IncidentService {
 constructor(private readonly prisma:PrismaService){}
 /** A reporter may only create, view and track their own cases. */
 open(reporterId:string,dto:OpenIncidentDto){
  return this.prisma.incidentCase.create({
   data:{reporterId,category:dto.category,title:dto.title,description:dto.description,
    activities:{create:{actorId:reporterId,action:'OPENED'}}},
  });
 }
 mine(reporterId:string){
  return this.prisma.incidentCase.findMany({
   where:{reporterId},select:{id:true,category:true,title:true,status:true,severity:true,level:true,createdAt:true,updatedAt:true},
   orderBy:{createdAt:'desc'},take:50,
  });
 }
 async mineOne(reporterId:string,id:string){
  const item=await this.prisma.incidentCase.findFirst({
   where:{id,reporterId},include:{activities:{orderBy:{createdAt:'asc'}}},
  });
  if(!item)throw new NotFoundException('Incident not found');
  return item;
 }
 list(status?:IncidentStatus){
  return this.prisma.incidentCase.findMany({
   where:{status},orderBy:{createdAt:'desc'},take:100,
  });
 }
 async detail(id:string){
  const row=await this.prisma.incidentCase.findUnique({
   where:{id},include:{activities:{orderBy:{createdAt:'asc'}}},
  });
  if(!row)throw new NotFoundException('Incident not found');
  return row;
 }
 /** Conditional UPDATE and activity INSERT are atomic: no double-claim. */
 claim(id:string,actorId:string){
  return this.prisma.$transaction(async tx=>{
   const changed=await tx.incidentCase.updateMany({
    where:{id,assignedToId:null,status:IncidentStatus.OPEN},
    data:{assignedToId:actorId,status:IncidentStatus.ACKNOWLEDGED},
   });
   if(changed.count!==1)throw new ConflictException('Incident unavailable or already claimed');
   await tx.incidentCaseActivity.create({data:{incidentId:id,actorId,action:'CLAIMED'}});
   return tx.incidentCase.findUniqueOrThrow({where:{id}});
  });
 }
 /** Only assigned owner may move a case through legal state transitions. */
 changeStatus(id:string,actorId:string,dto:ChangeIncidentStatusDto){
  return this.prisma.$transaction(async tx=>{
   const current=await tx.incidentCase.findUnique({where:{id}});
   if(!current)throw new NotFoundException('Incident not found');
   if(current.assignedToId!==actorId)throw new ForbiddenException('Only assigned owner can change status');
   if(!allowed[current.status]?.includes(dto.status))throw new ConflictException('Invalid incident transition');
   const changed=await tx.incidentCase.updateMany({
    where:{id,status:current.status,assignedToId:actorId},
    data:{status:dto.status,closedAt:dto.status===IncidentStatus.CLOSED?new Date():null},
   });
   if(changed.count!==1)throw new ConflictException('Incident changed concurrently');
   await tx.incidentCaseActivity.create({
    data:{incidentId:id,actorId,action:'STATUS_'+dto.status,note:dto.note},
   });
   return tx.incidentCase.findUniqueOrThrow({where:{id}});
  });
 }
 /** Explicit human escalation until SLA policy and scheduler are approved. */
 escalate(id:string,actorId:string,note:string){
  return this.prisma.$transaction(async tx=>{
   const current=await tx.incidentCase.findUnique({where:{id}});
   if(!current)throw new NotFoundException('Incident not found');
   if(current.status===IncidentStatus.CLOSED||current.level>=3)
    throw new ConflictException('Incident already closed or at maximum escalation');
   const changed=await tx.incidentCase.updateMany({
    where:{id,status:current.status,level:current.level},
    data:{level:current.level+1},
   });
   if(changed.count!==1)throw new ConflictException('Incident changed concurrently');
   await tx.incidentCaseActivity.create({
    data:{incidentId:id,actorId,action:'ESCALATED_L'+(current.level+1),note},
   });
   return tx.incidentCase.findUniqueOrThrow({where:{id}});
  });
 }
}
