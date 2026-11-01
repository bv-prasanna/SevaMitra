import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {FinanceGeoScope,FinanceTargetScope,Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {CreateTaxRuleDto,CreatePriceRuleDto,UpdateTaxRuleDto,UpdatePriceRuleDto,RuleScopeDto} from './rules.dto';

type ScopeInput=Pick<RuleScopeDto,'geoScope'|'geoId'|'targetScope'|'targetId'|'validFrom'|'validTo'>;

@Injectable()
export class FinanceRulesService {
 constructor(private readonly prisma:PrismaService){}
 private async validateScope(x:ScopeInput){
  if(x.geoScope===FinanceGeoScope.ALL ? !!x.geoId : !x.geoId)
   throw new BadRequestException('Geography scope ID must be set exactly when a geography level is selected');
  if(x.targetScope===FinanceTargetScope.ALL ? !!x.targetId : !x.targetId)
   throw new BadRequestException('Service/item scope ID must be set exactly when a target level is selected');
  if(x.validFrom&&x.validTo&&new Date(x.validFrom)>=new Date(x.validTo))
   throw new BadRequestException('validTo must be after validFrom');
  const geo=x.geoId;
  if(geo){
   const exists= x.geoScope===FinanceGeoScope.STATE?await this.prisma.state.findUnique({where:{id:geo}}):
    x.geoScope===FinanceGeoScope.DISTRICT?await this.prisma.district.findUnique({where:{id:geo}}):
    x.geoScope===FinanceGeoScope.TALUK?await this.prisma.taluk.findUnique({where:{id:geo}}):
    await this.prisma.townVillage.findUnique({where:{id:geo}});
   if(!exists)throw new BadRequestException('Unknown geography scope ID');
  }
  const id=x.targetId;
  if(id){
   const exists=x.targetScope===FinanceTargetScope.CATEGORY?await this.prisma.serviceCategory.findUnique({where:{id}}):
    x.targetScope===FinanceTargetScope.SERVICE?await this.prisma.service.findUnique({where:{id}}):
    x.targetScope===FinanceTargetScope.VARIANT?await this.prisma.serviceVariant.findUnique({where:{id}}):
    await this.prisma.providerOffering.findUnique({where:{id}});
   if(!exists)throw new BadRequestException('Unknown service/item scope ID');
  }
 }
 private normalized<T extends ScopeInput>(x:T){
  return {...x,geoId:x.geoScope===FinanceGeoScope.ALL?null:x.geoId,
   targetId:x.targetScope===FinanceTargetScope.ALL?null:x.targetId,
   validFrom:x.validFrom?new Date(x.validFrom):null,
   validTo:x.validTo?new Date(x.validTo):null};
 }
 taxes(){return this.prisma.financeTaxRule.findMany({orderBy:[{enabled:'desc'},{priority:'desc'},{createdAt:'desc'}],take:500})}
 prices(){return this.prisma.financePriceRule.findMany({orderBy:[{enabled:'desc'},{priority:'desc'},{createdAt:'desc'}],take:500})}
 async createTax(actorId:string,dto:CreateTaxRuleDto){
  await this.validateScope(dto);
  return this.prisma.financeTaxRule.create({data:{...this.normalized(dto),createdBy:actorId,updatedBy:actorId}});
 }
 async updateTax(id:string,actorId:string,dto:UpdateTaxRuleDto){
  const prev=await this.prisma.financeTaxRule.findUnique({where:{id}});
  if(!prev)throw new NotFoundException('Tax rule not found');
  const merged={...prev,...dto,
   validFrom:dto.validFrom===undefined?prev.validFrom?.toISOString()??null:dto.validFrom,
   validTo:dto.validTo===undefined?prev.validTo?.toISOString()??null:dto.validTo};
  await this.validateScope(merged);
  const {createdAt,updatedAt,createdBy,id:_id,...data}=merged;
  return this.prisma.financeTaxRule.update({where:{id},data:{...this.normalized(data),updatedBy:actorId}});
 }
 async disableTax(id:string,actorId:string){
  const prev=await this.prisma.financeTaxRule.findUnique({where:{id}});
  if(!prev)throw new NotFoundException('Tax rule not found');
  return this.prisma.financeTaxRule.update({where:{id},data:{enabled:false,updatedBy:actorId}});
 }
 async createPrice(actorId:string,dto:CreatePriceRuleDto){
  await this.validateScope(dto);
  this.assertValue(dto.adjustment,dto.value);
  return this.prisma.financePriceRule.create({data:{
   ...this.normalized(dto),value:new Prisma.Decimal(dto.value),createdBy:actorId,updatedBy:actorId,
  }});
 }
 async updatePrice(id:string,actorId:string,dto:UpdatePriceRuleDto){
  const prev=await this.prisma.financePriceRule.findUnique({where:{id}});
  if(!prev)throw new NotFoundException('Pricing rule not found');
  const merged={...prev,...dto,
   validFrom:dto.validFrom===undefined?prev.validFrom?.toISOString()??null:dto.validFrom,
   validTo:dto.validTo===undefined?prev.validTo?.toISOString()??null:dto.validTo};
  await this.validateScope(merged);
  this.assertValue(merged.adjustment,Number(merged.value));
  const {createdAt,updatedAt,createdBy,id:_id,...data}=merged;
  return this.prisma.financePriceRule.update({where:{id},data:{...this.normalized(data),
   value:new Prisma.Decimal(data.value),updatedBy:actorId}});
 }
 async disablePrice(id:string,actorId:string){
  const prev=await this.prisma.financePriceRule.findUnique({where:{id}});
  if(!prev)throw new NotFoundException('Pricing rule not found');
  return this.prisma.financePriceRule.update({where:{id},data:{enabled:false,updatedBy:actorId}});
 }
 private assertValue(mode:string,value:number){
  if(!Number.isFinite(value)||value<0)throw new BadRequestException('Invalid price adjustment');
  if(mode.startsWith('PERCENT_')&&value>100)
   throw new BadRequestException('Percentage adjustment cannot exceed 100%');
 }
}
