import {Controller,Get,Query,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {IsIn,IsOptional} from 'class-validator';
import {PrismaService} from '../prisma/prisma.service';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';

class ReportQuery {
 @IsOptional() @IsIn(['7','30','90']) days?:'7'|'30'|'90';
}
/** Aggregate-only, no personal information or financial amounts. */
@ApiTags('Admin Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('agent.review','provider.onboarding.review')
@Controller({path:'admin/operations',version:'1'})
export class AdminOperationsController {
 constructor(private readonly prisma:PrismaService){}
 @Get('reports')
 async reports(@Query() q:ReportQuery){
  const days=Number(q.days??'30');
  const start=new Date();start.setUTCHours(0,0,0,0);start.setUTCDate(start.getUTCDate()-(days-1));
  const [bookingRows,agentRows,providerRows,bookingStatuses,agentStatuses,providerStatuses]=await Promise.all([
   this.prisma.booking.findMany({where:{createdAt:{gte:start}},select:{createdAt:true},take:10000}),
   this.prisma.agentProfile.findMany({where:{createdAt:{gte:start}},select:{createdAt:true},take:10000}),
   this.prisma.providerProfile.findMany({where:{createdAt:{gte:start}},select:{createdAt:true},take:10000}),
   this.prisma.booking.groupBy({by:['status'],_count:{_all:true}}),
   this.prisma.agentProfile.groupBy({by:['status'],_count:{_all:true}}),
   this.prisma.onboardingApplication.groupBy({by:['status'],_count:{_all:true}}),
  ]);
  const buckets=Array.from({length:days},(_,i)=>{
   const date=new Date(start);date.setUTCDate(start.getUTCDate()+i);
   return {date:date.toISOString().slice(0,10),bookings:0,agents:0,providers:0};
  });
  const index=new Map(buckets.map(b=>[b.date,b]));
  for(const [rows,key] of [[bookingRows,'bookings'],[agentRows,'agents'],[providerRows,'providers']] as const){
   for(const item of rows){const bucket=index.get(item.createdAt.toISOString().slice(0,10));if(bucket)bucket[key]++}
  }
  return {days,series:buckets,bookingStatuses:bookingStatuses.map(x=>({name:x.status,value:x._count._all})),agentStatuses:agentStatuses.map(x=>({name:x.status,value:x._count._all})),providerStatuses:providerStatuses.map(x=>({name:x.status,value:x._count._all})),limited:bookingRows.length===10000||agentRows.length===10000||providerRows.length===10000,generatedAt:new Date().toISOString()};
 }
 @Get('summary')
 async summary(){
  const [agentsPending,agentsActive,providersPending,providersApproved,bookingsTotal,bookingsRequested,bookingsCompleted,serviceCategories,servicesActive]=await Promise.all([
   this.prisma.agentProfile.count({where:{status:'PENDING'}}),
   this.prisma.agentProfile.count({where:{status:'ACTIVE'}}),
   this.prisma.onboardingApplication.count({where:{status:'SUBMITTED'}}),
   this.prisma.onboardingApplication.count({where:{status:'APPROVED'}}),
   this.prisma.booking.count(),
   this.prisma.booking.count({where:{status:'REQUESTED'}}),
   this.prisma.booking.count({where:{status:'COMPLETED'}}),
   this.prisma.serviceCategory.count({where:{isActive:true}}),
   this.prisma.service.count({where:{isActive:true}}),
  ]);
  return {agentsPending,agentsActive,providersPending,providersApproved,bookingsTotal,bookingsRequested,bookingsCompleted,serviceCategories,servicesActive,generatedAt:new Date().toISOString()};
 }
}
