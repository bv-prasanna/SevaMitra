import {ConflictException,BadRequestException} from '@nestjs/common';
import {FinanceGeoScope as G,FinanceTargetScope as T,FinancePriceAdjustment as P,FinanceTaxComponent as C} from '@prisma/client';
import {calculateAmounts,matchingRules,rupees} from './pricing-calculator';
const ctx={geo:{STATE:'KA',DISTRICT:'BENGALURU',TALUK:'SOUTH',TOWN:'560040'},
 target:{CATEGORY:'electric',SERVICE:'fan',VARIANT:'wall',OFFERING:'prov-1'}};
const rule=(id:string,geoScope=G.ALL,geoId:string|null=null,targetScope=T=T.ALL,targetId:string|null=null,priority=0)=>({id,geoScope,geoId,targetScope,targetId,priority,createdAt:new Date('2026-10-01')});
describe('transparent finance rule engine',()=>{
 it('matches geographic + item dimensions together, ignoring other areas',()=>{
  const items=[
   rule('global'),rule('city',G.TOWN,'560040'),rule('wrong-city',G.TOWN,'560072'),
   rule('fan',G.TOWN,'560040',T.SERVICE,'fan'),
   rule('other-service',G.TOWN,'560040',T.SERVICE,'washing'),
  ];
  expect(matchingRules(items,ctx).map(x=>x.id)).toEqual(['fan','city','global']);
 });
 it('prefers individual offering over broader service/category, then locality and priority',()=>{
  const items=[rule('category',G.ALL,null,T.CATEGORY,'electric',99),
   rule('offering',G.ALL,null,T.OFFERING,'prov-1'),
   rule('service',G.TOWN,'560040',T.SERVICE,'fan',-99)];
  expect(matchingRules(items,ctx)[0].id).toBe('offering');
 });
 it('uses deterministic IDs when all rule dimensions and priorities tie',()=>{
  const items=[rule('z'),rule('a')];
  expect(matchingRules(items,ctx).map(x=>x.id)).toEqual(['a','z']);
 });
 it('calculates rupee increase + CGST and SGST using integer paise',()=>{
  const r=calculateAmounts({baseCents:10000,visitCents:1000,
   pricing:{id:'pr',adjustment:P.PERCENT_UP,value:10},
   taxes:[{id:'gst-c',component:C.CGST,rateBps:900},{id:'gst-s',component:C.SGST,rateBps:900}]});
  expect(r).toMatchObject({serviceCents:11000,taxableCents:12000,taxCents:2160,totalCents:14160,adjustmentCents:1000,priceRuleId:'pr'});
  expect(rupees(r.totalCents)).toBe('141.60');
 });
 it('never produces a negative amount from a discount',()=>{
  expect(calculateAmounts({baseCents:500,visitCents:0,pricing:{id:'d',adjustment:P.AMOUNT_DOWN,value:999},taxes:[]}).totalCents).toBe(0);
 });
 it('supports percentage discount and fixed addition without compounding rules',()=>{
  expect(calculateAmounts({baseCents:10000,visitCents:0,pricing:{id:'a',adjustment:P.PERCENT_DOWN,value:20},taxes:[]}).totalCents).toBe(8000);
  expect(calculateAmounts({baseCents:10000,visitCents:0,pricing:{id:'b',adjustment:P.AMOUNT_UP,value:125.50},taxes:[]}).totalCents).toBe(22550);
 });
 it('does not mix interstate and intrastate GST components',()=>{
  expect(()=>calculateAmounts({baseCents:10000,visitCents:0,taxes:[
   {id:'a',component:C.CGST,rateBps:900},{id:'b',component:C.SGST,rateBps:900},{id:'c',component:C.IGST,rateBps:1800}]})).toThrow(ConflictException);
 });
 it('rejects unpaired CGST/SGST configuration',()=>{
  expect(()=>calculateAmounts({baseCents:10000,visitCents:0,taxes:[{id:'c',component:C.CGST,rateBps:900}]})).toThrow(ConflictException);
 });
 it('rejects noninteger, negative, or illegal percentage values',()=>{
  expect(()=>calculateAmounts({baseCents:-1,visitCents:0,taxes:[]})).toThrow(BadRequestException);
  expect(()=>calculateAmounts({baseCents:10000,visitCents:0,pricing:{id:'x',adjustment:P.PERCENT_UP,value:110},taxes:[]})).toThrow(BadRequestException);
  expect(()=>calculateAmounts({baseCents:10000,visitCents:0,taxes:[{id:'x',component:C.IGST,rateBps:Infinity}]})).toThrow(BadRequestException);
 });
 it('applies no tax when no approved rule is enabled',()=>{
  expect(calculateAmounts({baseCents:12345,visitCents:555,taxes:[]})).toMatchObject({taxCents:0,totalCents:12900});
 });
});
