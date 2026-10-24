import {ProviderStatus,VerificationStatus} from '@prisma/client';
import {DiscoveryService} from './discovery.service';
import type {PrismaService} from '../../prisma/prisma.service';
import type {CoverageCheckService} from '../check/coverage-check.service';

describe('DiscoveryService',()=>{
 let prisma:{providerOffering:{findMany:jest.Mock}};
 let coverage:{listServiceableProviderIds:jest.Mock};
 let service:DiscoveryService;
 beforeEach(()=>{
  prisma={providerOffering:{findMany:jest.fn().mockResolvedValue([])}};
  coverage={listServiceableProviderIds:jest.fn().mockResolvedValue(['provider-1'])};
  service=new DiscoveryService(prisma as unknown as PrismaService,coverage as unknown as CoverageCheckService);
 });
 it('returns empty and does not query offerings if there are no serviceable providers',async()=>{
  coverage.listServiceableProviderIds.mockResolvedValue([]);
  await expect(service.findServiceableOfferings('svc','town')).resolves.toEqual([]);
  expect(prisma.providerOffering.findMany).not.toHaveBeenCalled();
 });
 it('filters to active offerings from verified active providers',async()=>{
  await service.findServiceableOfferings('svc','town');
  expect(coverage.listServiceableProviderIds).toHaveBeenCalledWith('town');
  expect(prisma.providerOffering.findMany).toHaveBeenCalledWith(expect.objectContaining({
   where:{
    serviceId:'svc',
    isActive:true,
    providerId:{in:['provider-1']},
    provider:{status:ProviderStatus.ACTIVE,verificationStatus:VerificationStatus.VERIFIED},
   },
  }));
 });
 it('projects only safe public fields and converts decimal amounts',async()=>{
  prisma.providerOffering.findMany.mockResolvedValue([{
   id:'offer-1',serviceId:'svc',providerId:'provider-1',provider:{fullName:'Ravi',businessName:null},
   pricingModel:'FIXED',amount:{toString:()=> '499.50'},visitFee:null,currency:'INR',
   notes:'Price excludes materials',
  }]);
  const results=await service.findServiceableOfferings('svc','town');
  expect(results).toEqual([{
   id:'offer-1',serviceId:'svc',providerId:'provider-1',providerName:'Ravi',
   pricingModel:'FIXED',amount:'499.50',visitFee:null,currency:'INR',notes:'Price excludes materials',
  }]);
  expect(results[0]).not.toHaveProperty('provider');
 });
 it('prefers business name where present',async()=>{
  prisma.providerOffering.findMany.mockResolvedValue([{
   id:'o',serviceId:'s',providerId:'p',provider:{fullName:'Ravi',businessName:'Kumar Electrical'},
   pricingModel:'QUOTE_BASED',amount:null,visitFee:null,currency:'INR',notes:null,
  }]);
  const [result]=await service.findServiceableOfferings('s','t');
  expect(result?.providerName).toBe('Kumar Electrical');
  expect(result?.amount).toBeNull();
 });
});
