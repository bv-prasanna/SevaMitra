import {Controller,Get,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {PrismaService} from '../prisma/prisma.service';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';

/** Aggregate-only, no personal information or financial amounts. */
@ApiTags('Admin Operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('agent.review','provider.onboarding.review')
@Controller({path:'admin/operations',version:'1'})
export class AdminOperationsController {
 constructor(private readonly prisma:PrismaService){}
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
