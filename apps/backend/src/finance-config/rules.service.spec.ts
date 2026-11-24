import {BadRequestException,NotFoundException} from '@nestjs/common';
import {FinanceGeoScope as G,FinanceTargetScope as T,FinancePriceAdjustment as P,FinanceTaxComponent as C} from '@prisma/client';
import type {PrismaService} from '../prisma/prisma.service';
import {FinanceRulesService} from './rules.service';
const rule={id:'r-1',name:'Test',geoScope:G.ALL,geoId:null,targetScope:T.ALL,targetId:null,
 validFrom:null,validTo:null,priority:0,enabled:false,createdAt:new Date(),updatedAt:new Date(),createdBy:'a',updatedBy:'a'};
const tax={...rule,component:C.CGST,rateBps:900};
const price={...rule,adjustment:P.PERCENT_UP,value:10,startTime:null,endTime:null,weekdays:[]};
describe('FinanceRulesService',()=>{
 let db:any;let service:FinanceRulesService;
 beforeEach(()=>{
  db={
   financeTaxRule:{findMany:jest.fn().mockResolvedValue([tax]),findUnique:jest.fn().mockResolvedValue(tax),create:jest.fn().mockResolvedValue(tax),update:jest.fn().mockResolvedValue(tax)},
   financePriceRule:{findMany:jest.fn().mockResolvedValue([price]),findUnique:jest.fn().mockResolvedValue(price),create:jest.fn().mockResolvedValue(price),update:jest.fn().mockResolvedValue(price)},
   state:{findUnique:jest.fn().mockResolvedValue({id:'state-1'})},
   district:{findUnique:jest.fn().mockResolvedValue({id:'district-1'})},
   taluk:{findUnique:jest.fn().mockResolvedValue({id:'taluk-1'})},
   townVillage:{findUnique:jest.fn().mockResolvedValue({id:'town-1'})},
   serviceCategory:{findUnique:jest.fn().mockResolvedValue({id:'category-1'})},
   service:{findUnique:jest.fn().mockResolvedValue({id:'service-1'})},
   serviceVariant:{findUnique:jest.fn().mockResolvedValue({id:'variant-1'})},
   providerOffering:{findUnique:jest.fn().mockResolvedValue({id:'offering-1'})},
  };
  service=new FinanceRulesService(db as PrismaService);
 });
 it('lists rules with bounded pagination',async()=>{
  await service.taxes();await service.prices();
  expect(db.financeTaxRule.findMany).toHaveBeenCalledWith(expect.objectContaining({take:500}));
  expect(db.financePriceRule.findMany).toHaveBeenCalledWith(expect.objectContaining({take:500}));
 });
 it('creates a disabled global tax rule with actor audit ID',async()=>{
  await service.createTax('reviewer', {name:'State GST',geoScope:G.ALL,targetScope:T.ALL,component:C.CGST,rateBps:900,enabled:false});
  expect(db.financeTaxRule.create).toHaveBeenCalledWith({data:expect.objectContaining({createdBy:'reviewer',updatedBy:'reviewer',geoId:null,targetId:null,rateBps:900,enabled:false})});
 });
 it('rejects missing geo and target scoped identifiers',async()=>{
  await expect(service.createTax('actor',{name:'City',geoScope:G.TOWN,targetScope:T.ALL,component:C.CGST,rateBps:900})).rejects.toThrow(BadRequestException);
  await expect(service.createTax('actor',{name:'Service',geoScope:G.ALL,targetScope:T.SERVICE,component:C.CGST,rateBps:900})).rejects.toThrow(BadRequestException);
 });
 it('rejects unknown geo or item targets without creating a rule',async()=>{
  db.state.findUnique.mockResolvedValue(null);
  await expect(service.createTax('actor',{name:'Missing',geoScope:G.STATE,geoId:'missing',targetScope:T.ALL,component:C.CGST,rateBps:900})).rejects.toThrow(BadRequestException);
  db.service.findUnique.mockResolvedValue(null);
  await expect(service.createTax('actor',{name:'Missing',geoScope:G.ALL,targetScope:T.SERVICE,targetId:'service-not-found',component:C.CGST,rateBps:900})).rejects.toThrow(BadRequestException);
  expect(db.financeTaxRule.create).not.toHaveBeenCalled();
 });
 it('allows combined town and service scoped tax settings',async()=>{
  await service.createTax('actor',{name:'Town fan',geoScope:G.TOWN,geoId:'town-1',targetScope:T.SERVICE,targetId:'service-1',component:C.SGST,rateBps:900});
  expect(db.townVillage.findUnique).toHaveBeenCalled();
  expect(db.service.findUnique).toHaveBeenCalled();
 });
 it('rejects inverted effective date ranges',async()=>{
  await expect(service.createTax('a',{name:'Expired',geoScope:G.ALL,targetScope:T.ALL,component:C.IGST,rateBps:1800,validFrom:'2026-11-03T00:00:00Z',validTo:'2026-11-01T00:00:00Z'})).rejects.toThrow(BadRequestException);
 });
 it('rejects percentage pricing over 100 percent',async()=>{
  await expect(service.createPrice('a',{name:'Overcharge',geoScope:G.ALL,targetScope:T.ALL,adjustment:P.PERCENT_UP,value:101})).rejects.toThrow(BadRequestException);
 });
 it('rejects inverted or incomplete time windows',async()=>{
  await expect(service.createPrice('a',{name:'Half',geoScope:G.ALL,targetScope:T.ALL,adjustment:P.PERCENT_UP,value:5,startTime:'18:00'})).rejects.toThrow(BadRequestException);
  await expect(service.createPrice('a',{name:'Backwards',geoScope:G.ALL,targetScope:T.ALL,adjustment:P.PERCENT_UP,value:5,startTime:'21:00',endTime:'17:00'})).rejects.toThrow(BadRequestException);
 });
 it('validates weekdays and creates a scheduled region adjustment',async()=>{
  await service.createPrice('ops',{name:'Weekend',geoScope:G.DISTRICT,geoId:'district-1',targetScope:T.CATEGORY,targetId:'category-1',
   adjustment:P.PERCENT_DOWN,value:12.5,startTime:'08:00',endTime:'20:00',weekdays:[0,6]});
  expect(db.financePriceRule.create).toHaveBeenCalledWith({data:expect.objectContaining({createdBy:'ops',weekdays:[0,6],startTime:'08:00'})});
  await expect(service.createPrice('ops',{name:'Duplicate day',geoScope:G.ALL,targetScope:T.ALL,
   adjustment:P.PERCENT_DOWN,value:5,weekdays:[6,6]})).rejects.toThrow(BadRequestException);
 });
 it('performs soft deletion and preserves history',async()=>{
  await service.disableTax('r-1','manager');await service.disablePrice('r-1','manager');
  expect(db.financeTaxRule.update).toHaveBeenCalledWith({where:{id:'r-1'},data:{enabled:false,updatedBy:'manager'}});
  expect(db.financePriceRule.update).toHaveBeenCalledWith({where:{id:'r-1'},data:{enabled:false,updatedBy:'manager'}});
 });
 it('rejects edits to missing tax/pricing rules',async()=>{
  db.financeTaxRule.findUnique.mockResolvedValue(null);
  db.financePriceRule.findUnique.mockResolvedValue(null);
  await expect(service.disableTax('bad','user')).rejects.toThrow(NotFoundException);
  await expect(service.disablePrice('bad','user')).rejects.toThrow(NotFoundException);
  await expect(service.updatePrice('bad','user',{})).rejects.toThrow(NotFoundException);
 });
 it('updates existing rules with actor identity',async()=>{
  await service.updateTax('r-1','manager',{rateBps:750,enabled:true});
  await service.updatePrice('r-1','manager',{value:8,enabled:true});
  expect(db.financeTaxRule.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({rateBps:750,updatedBy:'manager'})}));
  expect(db.financePriceRule.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({updatedBy:'manager'})}));
 });
});
