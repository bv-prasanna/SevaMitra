import {FinanceGeoScope,FinanceTargetScope,FinancePriceAdjustment,FinanceTaxComponent} from '@prisma/client';
import {BadRequestException,ConflictException} from '@nestjs/common';

export type RuleContext={
 geo:{STATE:string;DISTRICT:string;TALUK:string;TOWN:string};
 target:{CATEGORY:string;SERVICE:string;VARIANT:string|null;OFFERING:string};
};
export type RuleKey={
 id:string;geoScope:FinanceGeoScope;geoId:string|null;targetScope:FinanceTargetScope;targetId:string|null;
 priority:number;createdAt:Date;
};
const geoRank:Record<FinanceGeoScope,number>={ALL:0,STATE:1,DISTRICT:2,TALUK:3,TOWN:4};
const targetRank:Record<FinanceTargetScope,number>={ALL:0,CATEGORY:1,SERVICE:2,VARIANT:3,OFFERING:4};
export function matchingRules<T extends RuleKey>(rules:T[],ctx:RuleContext):T[]{
 return rules.filter(r=>
  (r.geoScope===FinanceGeoScope.ALL||r.geoId===ctx.geo[r.geoScope])&&
  (r.targetScope===FinanceTargetScope.ALL||r.targetId===ctx.target[r.targetScope])
 ).sort((a,b)=>targetRank[b.targetScope]-targetRank[a.targetScope]||
  geoRank[b.geoScope]-geoRank[a.geoScope]||
  b.priority-a.priority||
  a.createdAt.getTime()-b.createdAt.getTime()||
  a.id.localeCompare(b.id));
}
export type PriceTax={component:FinanceTaxComponent;rateBps:number;amountCents:number;ruleId:string};
export function calculateAmounts(args:{
 baseCents:number;visitCents:number;
 pricing?:{id:string;adjustment:FinancePriceAdjustment;value:number}|null;
 taxes:readonly {id:string;component:FinanceTaxComponent;rateBps:number}[];
}){
 const {baseCents,visitCents,pricing}=args;
 if(!Number.isSafeInteger(baseCents)||baseCents<0||!Number.isSafeInteger(visitCents)||visitCents<0)
  throw new BadRequestException('Invalid offering amount');
 let diff=0;
 if(pricing){
  if(!Number.isFinite(pricing.value)||pricing.value<0)throw new BadRequestException('Invalid pricing rule');
  const percent=pricing.adjustment===FinancePriceAdjustment.PERCENT_UP||pricing.adjustment===FinancePriceAdjustment.PERCENT_DOWN;
  if(percent&&pricing.value>100)throw new BadRequestException('Percentage exceeds 100');
  const delta=percent?Math.round(baseCents*pricing.value/100):Math.round(pricing.value*100);
  diff=[FinancePriceAdjustment.PERCENT_DOWN,FinancePriceAdjustment.AMOUNT_DOWN].includes(pricing.adjustment)?-delta:delta;
  diff=Math.max(-baseCents,diff);
 }
 const serviceCents=baseCents+diff;
 const taxableCents=serviceCents+visitCents;
 const components=new Set(args.taxes.map(x=>x.component));
 if(components.has(FinanceTaxComponent.IGST)&&(components.has(FinanceTaxComponent.CGST)||components.has(FinanceTaxComponent.SGST)))
  throw new ConflictException('Conflicting GST configuration: IGST and CGST/SGST cannot be applied together');
 if(components.has(FinanceTaxComponent.CGST)!==components.has(FinanceTaxComponent.SGST))
  throw new ConflictException('CGST and SGST must be configured as a pair');
 const taxLines=args.taxes.map(x=>{
  if(!Number.isInteger(x.rateBps)||x.rateBps<0||x.rateBps>10000)
   throw new BadRequestException('Invalid configured tax rate');
  return {component:x.component,rateBps:x.rateBps,amountCents:Math.round(taxableCents*x.rateBps/10000),ruleId:x.id};
 });
 const taxCents=taxLines.reduce((a,x)=>a+x.amountCents,0);
 return {baseCents,adjustmentCents:diff,serviceCents,visitCents,taxableCents,taxCents,
  totalCents:taxableCents+taxCents,priceRuleId:pricing?.id??null,taxLines};
}
export function rupees(cents:number){return (cents/100).toFixed(2)}
