import {ConflictException,NotFoundException} from '@nestjs/common';
import {FinanceGeoScope as G,FinanceTargetScope as T,FinanceTaxComponent as C,FinancePriceAdjustment as P,ProviderStatus,VerificationStatus} from '@prisma/client';
import type {PrismaService} from '../prisma/prisma.service';
import {FinanceQuoteService} from './quote.service';
describe('FinanceQuoteService',()=>{
 let db:any;let quote:FinanceQuoteService;
 const date=new Date('2026-10-01T12:00:00Z');
 const offering={id:'offering-1',isActive:true,serviceId:'service-1',variantId:null,providerId:'provider-1',
  pricingModel:'FIXED',amount:100,visitFee:10,currency:'INR',
  provider:{status:ProviderStatus.ACTIVE,verificationStatus:VerificationStatus.VERIFIED,deletedAt:null},
  service:{id:'service-1',categoryId:'category-1',isActive:true}};
 const town={id:'town-1',isActive:true,talukId:'taluk-1',taluk:{districtId:'district-1',district:{stateId:'state-1'}}};
 const q={offeringId:'offering-1',townVillageId:'town-1',scheduledDate:'2026-11-07',scheduledStartTime:'10:00'};
 const pr={id:'pr-1',geoScope:G.ALL,geoId:null,targetScope:T.SERVICE,targetId:'service-1',
  priority:1,createdAt:date,adjustment:P.PERCENT_UP,value:10,weekdays:[],startTime:null,endTime:null};
 const tx={id:'tx-1',geoScope:G.ALL,geoId:null,targetScope:T.ALL,targetId:null,
  priority:1,createdAt:date,component:C.IGST,rateBps:1800};
 beforeEach(()=>{
  db={providerOffering:{findUnique:jest.fn().mockResolvedValue(offering)},
   townVillage:{findUnique:jest.fn().mockResolvedValue(town)},
   financePriceRule:{findMany:jest.fn().mockResolvedValue([])},
   financeTaxRule:{findMany:jest.fn().mockResolvedValue([])}};
  quote=new FinanceQuoteService(db as PrismaService);
 });
 it('returns original provider price without changing GST when no rules enabled',async()=>{
  const r=await quote.quote(q);
  expect(r).toMatchObject({total:'110.00',originalAmount:'100.00',serviceAmount:'100.00',visitFee:'10.00',taxTotal:'0.00',taxes:[]});
  expect(db.financeTaxRule.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({enabled:true})}));
 });
 it('selects item-specific surcharge and computes visible tax',async()=>{
  db.financePriceRule.findMany.mockResolvedValue([pr]);
  db.financeTaxRule.findMany.mockResolvedValue([tx]);
  const r=await quote.quote(q);
  expect(r).toMatchObject({total:'141.60',serviceAmount:'110.00',taxTotal:'21.60',priceRuleId:'pr-1'});
  expect(r.taxes).toHaveLength(1);
 });
 it('does not leak unverified or deactivated providers',async()=>{
  db.providerOffering.findUnique.mockResolvedValue({...offering,provider:{status:ProviderStatus.PENDING,verificationStatus:VerificationStatus.UNVERIFIED,deletedAt:null}});
  await expect(quote.quote(q)).rejects.toThrow(NotFoundException);
 });
 it('returns a genuine quotation-required state, never an invented payable price',async()=>{
  db.providerOffering.findUnique.mockResolvedValue({...offering,amount:null,pricingModel:'QUOTE_BASED'});
  const r=await quote.quote(q);
  expect(r).toMatchObject({total:null,fixed:false,taxes:[]});
 });
 it('rejects missing town or inactive service',async()=>{
  db.townVillage.findUnique.mockResolvedValue(null);
  await expect(quote.quote(q)).rejects.toThrow(NotFoundException);
 });
 it('skips weekend-only peak rule on weekdays',async()=>{
  db.financePriceRule.findMany.mockResolvedValue([{...pr,weekdays:[0],adjustment:P.PERCENT_UP,value:50}]);
  const r=await quote.quote({...q,scheduledDate:'2026-11-02'});
  expect(r.total).toBe('110.00');
 });
 it('applies slot-specific rule only inside configured time window',async()=>{
  db.financePriceRule.findMany.mockResolvedValue([{...pr,startTime:'17:00',endTime:'20:00'}]);
  expect((await quote.quote(q)).total).toBe('110.00');
  expect((await quote.quote({...q,scheduledStartTime:'18:30'})).total).toBe('121.00');
 });
 it('rejects conflicting GST components instead of silently double-taxing',async()=>{
  db.financeTaxRule.findMany.mockResolvedValue([tx,{...tx,id:'tx2',component:C.CGST,rateBps:900},{...tx,id:'tx3',component:C.SGST,rateBps:900}]);
  await expect(quote.quote(q)).rejects.toThrow(ConflictException);
 });
 it('selects one best rule per tax component rather than stacking overlapping configs',async()=>{
  db.financeTaxRule.findMany.mockResolvedValue([tx,{...tx,id:'town',geoScope:G.TOWN,geoId:'town-1',rateBps:500}]);
  const r=await quote.quote(q);
  expect(r.taxTotal).toBe('5.50');
  expect(r.taxes).toHaveLength(1);
  expect(r.taxes[0].ruleId).toBe('town');
 });
});