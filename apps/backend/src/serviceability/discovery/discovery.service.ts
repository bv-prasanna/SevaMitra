import {Injectable} from '@nestjs/common';
import {ProviderStatus, VerificationStatus} from '@prisma/client';
import {PrismaService} from '../../prisma/prisma.service';
import {CoverageCheckService} from '../check/coverage-check.service';

@Injectable()
export class DiscoveryService {
 constructor(private readonly prisma:PrismaService,private readonly coverage:CoverageCheckService){}

 async findServiceableOfferings(serviceId:string,townVillageId:string){
  const ids=await this.coverage.listServiceableProviderIds(townVillageId);
  if(ids.length===0)return [];
  const offerings=await this.prisma.providerOffering.findMany({
   where:{
    serviceId,
    isActive:true,
    providerId:{in:ids},
    provider:{status:ProviderStatus.ACTIVE,verificationStatus:VerificationStatus.VERIFIED},
   },
   include:{provider:{select:{id:true,fullName:true,businessName:true}}},
   take:100,
   orderBy:{createdAt:'desc'},
  });
  return offerings.map(o=>({
   id:o.id,
   serviceId:o.serviceId,
   providerId:o.providerId,
   providerName:o.provider.businessName||o.provider.fullName,
   pricingModel:o.pricingModel,
   amount:o.amount===null?null:o.amount.toString(),
   visitFee:o.visitFee===null?null:o.visitFee.toString(),
   currency:o.currency,
   notes:o.notes,
  }));
 }
}
