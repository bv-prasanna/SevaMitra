import {BadRequestException,Injectable} from '@nestjs/common';
import {PrismaService} from '../../prisma/prisma.service';
import {CoverageCheckService} from '../check/coverage-check.service';
import {AvailabilityCheckService} from '../../availability/check/availability-check.service';
import {DiscoveryService} from '../discovery/discovery.service';
import {MatchRequestDto,MatchStrategy} from './match-request.dto';

type Offering=Awaited<ReturnType<DiscoveryService['findServiceableOfferings']>>[number];
export type RankedMatch=Offering&{serviceability:'APPROVED_AREA'|'WITHIN_RADIUS';rank:number;available:boolean};

/**
 * Only active/verified, serviceable offerings reach this matcher (via Discovery).
 * Ranked is organic: explicit approved area before radius, then fixed advertised
 * price (no promoted slots). Round robin uses a persisted atomic cursor. BROADCAST
 * returns an eligible shortlist; an invitation/acceptance protocol is a separate
 * workflow and is NOT implied by this endpoint.
 */
@Injectable()
export class MatchingService{
 constructor(private readonly prisma:PrismaService,private readonly discovery:DiscoveryService,private readonly coverage:CoverageCheckService,private readonly availability:AvailabilityCheckService){}
 async match(dto:MatchRequestDto):Promise<{strategy:MatchStrategy,recommendedOfferingId:string|null,matches:RankedMatch[]}>{
  if(Boolean(dto.scheduledDate)!==Boolean(dto.scheduledStartTime)||Boolean(dto.scheduledDate)!==Boolean(dto.scheduledEndTime))
   throw new BadRequestException('Date, start and end must all be supplied together');
  if(dto.scheduledStartTime&&dto.scheduledEndTime&&dto.scheduledStartTime>=dto.scheduledEndTime)
   throw new BadRequestException('Start time must precede end time');
  const strategy=dto.strategy||MatchStrategy.RANKED;
  const offered=await this.discovery.findServiceableOfferings(dto.serviceId,dto.townVillageId);
  const candidates=await Promise.all(offered.map(async o=>{
   const coverage=await this.coverage.isServiceable(o.providerId,dto.townVillageId);
   if(!coverage.serviceable)return null;
   let available=true;
   if(dto.scheduledDate&&dto.scheduledStartTime&&dto.scheduledEndTime){
    const check=await this.availability.getAvailability(o.providerId,dto.scheduledDate);
    available=check.available&&check.windows.some(w=>w.start<=dto.scheduledStartTime!&&dto.scheduledEndTime!<=w.end);
   }
   return available?{...o,serviceability:coverage.reason as RankedMatch['serviceability'],available}:null;
  }));
  const eligible=candidates.filter((o):o is NonNullable<typeof o>=>o!==null);
  eligible.sort((a,b)=>{
   const cov=(x:typeof a)=>x.serviceability==='APPROVED_AREA'?0:1;
   const price=(x:typeof a)=>x.amount===null?Number.POSITIVE_INFINITY:Number(x.amount);
   return cov(a)-cov(b)||price(a)-price(b)||a.providerId.localeCompare(b.providerId)||a.id.localeCompare(b.id);
  });
  let rotated=eligible;
  if(strategy===MatchStrategy.ROUND_ROBIN&&eligible.length){
   const scopeKey=[dto.serviceId,dto.townVillageId,dto.scheduledDate||'any'].join(':');
   const cursor=await this.prisma.matchingCursor.upsert({
    where:{scopeKey},create:{scopeKey,nextIndex:1},update:{nextIndex:{increment:1}},
   });
   const start=(cursor.nextIndex-1)%eligible.length;
   rotated=[...eligible.slice(start),...eligible.slice(0,start)];
  }
  const matches=rotated.map((o,i)=>({...o,rank:i+1}));
  return{strategy,recommendedOfferingId:matches[0]?.id??null,matches};
 }
}
