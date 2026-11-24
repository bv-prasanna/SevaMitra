import {BadRequestException} from '@nestjs/common';
import {MatchingService} from './matching.service';
import {MatchStrategy} from './match-request.dto';
import type {PrismaService} from '../../prisma/prisma.service';
import type {DiscoveryService} from '../discovery/discovery.service';
import type {CoverageCheckService} from '../check/coverage-check.service';
import type {AvailabilityCheckService} from '../../availability/check/availability-check.service';

describe('MatchingService',()=>{
 let prisma:{matchingCursor:{upsert:jest.Mock}};
 let discovery:{findServiceableOfferings:jest.Mock};
 let coverage:{isServiceable:jest.Mock};
 let availability:{getAvailability:jest.Mock};
 let service:MatchingService;
 const base={serviceId:'service',townVillageId:'town',strategy:MatchStrategy.RANKED};
 const o=(id:string,providerId:string,amount:string|null)=>({id,providerId,serviceId:'service',providerName:providerId,pricingModel:'FIXED',amount,visitFee:null,currency:'INR',notes:null});
 beforeEach(()=>{
  prisma={matchingCursor:{upsert:jest.fn().mockResolvedValue({nextIndex:1})}};
  discovery={findServiceableOfferings:jest.fn().mockResolvedValue([o('o2','provider-b','500'),o('o1','provider-a','400')])};
  coverage={isServiceable:jest.fn().mockResolvedValue({serviceable:true,reason:'APPROVED_AREA'})};
  availability={getAvailability:jest.fn().mockResolvedValue({available:true,windows:[{start:'08:00',end:'18:00'}]})};
  service=new MatchingService(prisma as unknown as PrismaService,discovery as unknown as DiscoveryService,coverage as unknown as CoverageCheckService,availability as unknown as AvailabilityCheckService);
 });
 it('sorts organically by price when coverage is equal',async()=>{const r=await service.match(base);expect(r.matches.map(x=>x.id)).toEqual(['o1','o2']);expect(r.recommendedOfferingId).toBe('o1')});
 it('prefers explicitly approved areas to merely within-radius providers',async()=>{coverage.isServiceable.mockImplementation((id:string)=>({serviceable:true,reason:id==='provider-b'?'APPROVED_AREA':'WITHIN_RADIUS'}));const r=await service.match(base);expect(r.matches[0]?.id).toBe('o2')});
 it('skips offerings that fail an independent coverage check',async()=>{coverage.isServiceable.mockImplementation((id:string)=>({serviceable:id!=='provider-a',reason:'APPROVED_AREA'}));const r=await service.match(base);expect(r.matches.map(x=>x.id)).toEqual(['o2'])});
 it('skips unavailable providers at requested time',async()=>{availability.getAvailability.mockImplementation((id:string)=>({available:true,windows:id==='provider-a'?[{start:'15:00',end:'18:00'}]:[{start:'08:00',end:'18:00'}]}));const r=await service.match({...base,scheduledDate:'2026-10-20',scheduledStartTime:'09:00',scheduledEndTime:'10:00'});expect(r.matches.map(x=>x.id)).toEqual(['o2'])});
 it('rejects a partial date/time input',async()=>{await expect(service.match({...base,scheduledDate:'2026-10-20'})).rejects.toThrow(BadRequestException)});
 it('rejects inverted clock windows',async()=>{await expect(service.match({...base,scheduledDate:'2026-10-20',scheduledStartTime:'12:00',scheduledEndTime:'10:00'})).rejects.toThrow(BadRequestException)});
 it('round robin rotates using persisted atomic cursor',async()=>{prisma.matchingCursor.upsert.mockResolvedValue({nextIndex:2});const r=await service.match({...base,strategy:MatchStrategy.ROUND_ROBIN});expect(r.matches.map(x=>x.id)).toEqual(['o2','o1']);expect(prisma.matchingCursor.upsert).toHaveBeenCalledWith(expect.objectContaining({update:{nextIndex:{increment:1}}}))});
 it('broadcast strategy returns all eligible matches without moving cursor',async()=>{const r=await service.match({...base,strategy:MatchStrategy.BROADCAST});expect(r.matches).toHaveLength(2);expect(prisma.matchingCursor.upsert).not.toHaveBeenCalled()});
 it('returns empty when nothing can serve the location',async()=>{discovery.findServiceableOfferings.mockResolvedValue([]);const r=await service.match(base);expect(r.recommendedOfferingId).toBeNull();expect(r.matches).toEqual([])});
 it('places unpriced/quote-based offerings after fixed advertised prices',async()=>{discovery.findServiceableOfferings.mockResolvedValue([o('q','provider-c',null),o('fixed','provider-a','999')]);const r=await service.match(base);expect(r.matches[0]?.id).toBe('fixed')});
});
