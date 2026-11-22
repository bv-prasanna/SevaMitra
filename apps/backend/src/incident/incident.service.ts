import {ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {IncidentSeverity,IncidentStatus,Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {ChangeIncidentStatusDto,OpenIncidentDto,UpsertIncidentSlaPolicyDto} from './incident.dto';

const allowed:Partial<Record<IncidentStatus,readonly IncidentStatus[]>>={
 [IncidentStatus.ACKNOWLEDGED]:[IncidentStatus.IN_PROGRESS],
 [IncidentStatus.IN_PROGRESS]:[IncidentStatus.RESOLVED],
 [IncidentStatus.RESOLVED]:[IncidentStatus.IN_PROGRESS,IncidentStatus.CLOSED],
};
@Injectable()
export class IncidentService{
 constructor(private readonly prisma:PrismaService){}

 /** P2 is the neutral default; an admin-owned policy supplies actual deadlines. */
 async open(reporterId:string,dto:OpenIncidentDto){
  const policy=await this.prisma.incidentSlaPolicy.findUnique({where:{severity:IncidentSeverity.P2}});
  const now=new Date();
  const active=policy?.isActive?policy:null;
  return this.prisma.incidentCase.create({data:{
   reporterId,category:dto.category,title:dto.title,description:dto.description,
   ...(active?{
    slaPolicyId:active.id,
    acknowledgeDueAt:new Date(now.getTime()+active.acknowledgeMinutes*60_000),
    resolveDueAt:new Date(now.getTime()+active.resolveMinutes*60_000),
   }:{}),
   activities:{create:{actorId:reporterId,action:'OPENED'}},
  }});
 }
 mine(reporterId:string){
  return this.prisma.incidentCase.findMany({
   where:{reporterId},select:{id:true,category:true,title:true,status:true,severity:true,level:true,acknowledgeDueAt:true,resolveDueAt:true,createdAt:true,updatedAt:true},
   orderBy:{createdAt:'desc'},take:50,
  });
 }
 async mineOne(reporterId:string,id:string){
  const item=await this.prisma.incidentCase.findFirst({where:{id,reporterId},include:{activities:{orderBy:{createdAt:'asc'}}}});
  if(!item)throw new NotFoundException('Incident not found');
  return item;
 }
 list(status?:IncidentStatus){
  return this.prisma.incidentCase.findMany({where:{status},include:{slaPolicy:true},orderBy:{createdAt:'desc'},take:100});
 }
 async detail(id:string){
  const row=await this.prisma.incidentCase.findUnique({where:{id},include:{activities:{orderBy:{createdAt:'asc'}},slaPolicy:true}});
  if(!row)throw new NotFoundException('Incident not found');
  return row;
 }

 /** Conditional UPDATE and activity INSERT are atomic: no double-claim. */
 claim(id:string,actorId:string){
  return this.prisma.$transaction(async tx=>{
   const changed=await tx.incidentCase.updateMany({
    where:{id,assignedToId:null,status:IncidentStatus.OPEN},
    data:{assignedToId:actorId,status:IncidentStatus.ACKNOWLEDGED,acknowledgeDueAt:null},
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
   const data:Prisma.IncidentCaseUpdateManyMutationInput={
    status:dto.status,closedAt:dto.status===IncidentStatus.CLOSED?new Date():null,
   };
   if(dto.status===IncidentStatus.RESOLVED||dto.status===IncidentStatus.CLOSED)data.resolveDueAt=null;
   if(dto.status===IncidentStatus.IN_PROGRESS&&current.status===IncidentStatus.RESOLVED&&current.slaPolicyId){
    const policy=await tx.incidentSlaPolicy.findUnique({where:{id:current.slaPolicyId}});
    data.resolveDueAt=policy?.isActive?new Date(Date.now()+policy.resolveMinutes*60_000):null;
   }
   const changed=await tx.incidentCase.updateMany({where:{id,status:current.status,assignedToId:actorId},data});
   if(changed.count!==1)throw new ConflictException('Incident changed concurrently');
   await tx.incidentCaseActivity.create({data:{incidentId:id,actorId,action:'STATUS_'+dto.status,note:dto.note}});
   return tx.incidentCase.findUniqueOrThrow({where:{id}});
  });
 }

 /** Explicit human escalation; configured escalation interval resets the next deadline. */
 escalate(id:string,actorId:string,note:string){
  return this.prisma.$transaction(async tx=>{
   const current=await tx.incidentCase.findUnique({where:{id}});
   if(!current)throw new NotFoundException('Incident not found');
   if(current.status===IncidentStatus.CLOSED||current.level>=3)throw new ConflictException('Incident already closed or at maximum escalation');
   const policy=current.slaPolicyId?await tx.incidentSlaPolicy.findUnique({where:{id:current.slaPolicyId}}):null;
   const next=policy?.isActive?new Date(Date.now()+policy.escalationMinutes*60_000):null;
   const data:Prisma.IncidentCaseUpdateManyMutationInput={level:current.level+1};
   if(current.status===IncidentStatus.OPEN)data.acknowledgeDueAt=current.level+1>=3?null:next;
   else data.resolveDueAt=current.level+1>=3?null:next;
   const changed=await tx.incidentCase.updateMany({where:{id,status:current.status,level:current.level},data});
   if(changed.count!==1)throw new ConflictException('Incident changed concurrently');
   await tx.incidentCaseActivity.create({data:{incidentId:id,actorId,action:'ESCALATED_L'+(current.level+1),note}});
   return tx.incidentCase.findUniqueOrThrow({where:{id}});
  });
 }

 /** Scheduled, compare-and-set escalation. Repeated cron calls are idempotent. */
 async escalateDue(){
  const now=new Date();
  const due=await this.prisma.incidentCase.findMany({
   where:{level:{lt:3},status:{in:[IncidentStatus.OPEN,IncidentStatus.ACKNOWLEDGED,IncidentStatus.IN_PROGRESS]},
    OR:[
     {status:IncidentStatus.OPEN,acknowledgeDueAt:{lte:now}},
     {status:{in:[IncidentStatus.ACKNOWLEDGED,IncidentStatus.IN_PROGRESS]},resolveDueAt:{lte:now}},
    ]},
   include:{slaPolicy:true},orderBy:{createdAt:'asc'},take:100,
  });
  let escalated=0,skippedNoPolicy=0;
  for(const item of due){
   if(!item.slaPolicy?.isActive){skippedNoPolicy++;continue}
   const acknowledgement=item.status===IncidentStatus.OPEN;
   const dueField=acknowledgement?'acknowledgeDueAt':'resolveDueAt';
   const next=item.level+1>=3?null:new Date(now.getTime()+item.slaPolicy.escalationMinutes*60_000);
   const done=await this.prisma.$transaction(async tx=>{
    const changed=await tx.incidentCase.updateMany({
     where:{id:item.id,status:item.status,level:item.level,[dueField]:{lte:now}},
     data:{level:item.level+1,[dueField]:next},
    });
    if(changed.count!==1)return false;
    await tx.incidentCaseActivity.create({data:{
     incidentId:item.id,actorId:null,action:'SLA_ESCALATED_L'+(item.level+1),
     note:item.level+1>=3?'Automatic SLA escalation reached L3; manual intervention required.':'Automatic SLA deadline exceeded; escalation deadline reset from configured policy.',
    }});
    return true;
   });
   if(done)escalated++;
  }
  return {examined:due.length,escalated,skippedNoPolicy};
 }

 listSlaPolicies(){return this.prisma.incidentSlaPolicy.findMany({orderBy:{severity:'asc'}})}
 upsertSlaPolicy(actorId:string,dto:UpsertIncidentSlaPolicyDto){
  return this.prisma.incidentSlaPolicy.upsert({
   where:{severity:dto.severity},
   create:{severity:dto.severity,acknowledgeMinutes:dto.acknowledgeMinutes,resolveMinutes:dto.resolveMinutes,
    escalationMinutes:dto.escalationMinutes,isActive:dto.isActive??true,createdBy:actorId,updatedBy:actorId},
   update:{acknowledgeMinutes:dto.acknowledgeMinutes,resolveMinutes:dto.resolveMinutes,
    escalationMinutes:dto.escalationMinutes,isActive:dto.isActive??true,updatedBy:actorId},
  });
 }
 async disableSlaPolicy(severity:IncidentSeverity,actorId:string){
  const changed=await this.prisma.incidentSlaPolicy.updateMany({where:{severity,isActive:true},data:{isActive:false,updatedBy:actorId}});
  if(changed.count!==1)throw new NotFoundException('Active SLA policy not found');
  return {disabled:true,severity};
 }
}
