import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {FinanceGeoScope,FinanceTargetScope,FinancePriceAdjustment,Prisma,ProviderStatus,VerificationStatus} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {calculateAmounts,matchingRules,rupees,RuleContext} from './pricing-calculator';
import {QuoteQueryDto} from './quote.dto';
@Injectable()
export class FinanceQuoteService{
 constructor(private readonly prisma:PrismaService){}
 async quote(q:QuoteQueryDto){
  const [offering,town]=await Promise.all([
   this.prisma.providerOffering.findUnique({where:{id:q.offeringId},
    include:{service:{select:{id:true,categoryId:true,isActive:true}},provider:{select:{status:true,verificationStatus:true,deletedAt:true}}}}),
   this.prisma.townVillage.findUnique({where:{id:q.townVillageId},include:{taluk:{include:{district:{include:{state:true}}}}}}),
  ]);
  if(!offering||!offering.isActive||!offering.service.isActive||
   offering.provider.status!==ProviderStatus.ACTIVE||offering.provider.verificationStatus!==VerificationStatus.VERIFIED||
   offering.provider.deletedAt)
   throw new NotFoundException('Active verified offering not found');
  if(!town||!town.isActive)throw new NotFoundException('Service location not found');
  const ctx:RuleContext={
   geo:{STATE:town.taluk.district.stateId,DISTRICT:town.taluk.districtId,TALUK:town.talukId,TOWN:town.id},
   target:{CATEGORY:offering.service.categoryId,SERVICE:offering.serviceId,VARIANT:offering.variantId,OFFERING:offering.id},
  };
  const now=new Date();
  const effective={enabled:true,AND:[
   {OR:[{validFrom:null},{validFrom:{lte:now}}]},
   {OR:[{validTo:null},{validTo:{gt:now}}]},
  ]};
  const [priceRules,taxRules]=await Promise.all([
   this.prisma.financePriceRule.findMany({where:effective,orderBy:{createdAt:'asc'},take:1000}),
   this.prisma.financeTaxRule.findMany({where:effective,orderBy:{createdAt:'asc'},take:1000}),
  ]);
  const scheduleDay=q.scheduledDate?new Date(q.scheduledDate+'T12:00:00Z').getUTCDay():null;
  const matches=matchingRules(priceRules,ctx).filter(x=>
   (!x.weekdays.length||(scheduleDay!==null&&x.weekdays.includes(scheduleDay)))&&
   (!x.startTime||!!q.scheduledStartTime&&q.scheduledStartTime>=x.startTime&&q.scheduledStartTime<x.endTime!));
  // No clock-based rule is silently applied without an actual service slot.
  const price=matches[0]??null;
  const taxes=matchingRules(taxRules,ctx).filter((r,i,a)=>a.findIndex(x=>x.component===r.component)===i);
  if(taxes.length>0){
   const issuer=await this.prisma.billingIssuer.findFirst({where:{providerId:offering.providerId,verified:true}});
   const pos=town.taluk.district.state.gstStateCode;
   if(!issuer?.gstin||!pos)
    throw new BadRequestException('Finance must verify supplier GSTIN and destination GST state code before enabling tax rules');
   const comps=new Set(taxes.map(x=>x.component));
   const sameState=issuer.stateCode===pos;
   if(sameState&&comps.has('IGST') || !sameState&&(comps.has('CGST')||comps.has('SGST')))
    throw new BadRequestException('GST component configuration conflicts with supplier/place-of-supply states');
  }
  if(offering.amount===null){
   return {offeringId:offering.id,townVillageId:town.id,currency:offering.currency,
    fixed:false,pricingModel:offering.pricingModel,disclosure:'A provider quote is required; no payable amount is confirmed.',
    ruleId:price?.id??null,taxes:[],total:null};
  }
  if(offering.currency!=='INR')throw new BadRequestException('Only INR pricing is configured');
  const cents=(v:Prisma.Decimal|string|number|null)=>Math.round(Number(v??0)*100);
  const amounts=calculateAmounts({baseCents:cents(offering.amount),visitCents:cents(offering.visitFee),
   pricing:price?{id:price.id,adjustment:price.adjustment,value:Number(price.value)}:null,
   taxes:taxes.map(x=>({id:x.id,component:x.component,rateBps:x.rateBps}))});
  return {offeringId:offering.id,townVillageId:town.id,currency:offering.currency,
   fixed:offering.pricingModel==='FIXED',pricingModel:offering.pricingModel,
   originalAmount:rupees(amounts.baseCents),adjustment:rupees(amounts.adjustmentCents),
   serviceAmount:rupees(amounts.serviceCents),visitFee:rupees(amounts.visitCents),
   taxableAmount:rupees(amounts.taxableCents),taxTotal:rupees(amounts.taxCents),
   total:rupees(amounts.totalCents),priceRuleId:amounts.priceRuleId,
   taxes:amounts.taxLines.map(t=>({...t,amount:rupees(t.amountCents)})),
   disclosure:'Indicative, tax-exclusive provider pricing. Final tax liability and invoice need finance verification.',
   calculatedAt:now.toISOString()};
 }
}
