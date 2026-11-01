import {FinanceGeoScope,FinanceTargetScope,FinancePriceAdjustment,FinanceTaxComponent} from '@prisma/client';
import {IsBoolean,IsEnum,IsInt,IsNumber,IsOptional,IsString,Max,MaxLength,Min,IsISO8601,Matches,IsArray} from 'class-validator';
import {PartialType} from '@nestjs/swagger';

export class RuleScopeDto {
 @IsString() @MaxLength(120) name:string;
 @IsEnum(FinanceGeoScope) geoScope:FinanceGeoScope;
 @IsOptional() @IsString() geoId?:string|null;
 @IsEnum(FinanceTargetScope) targetScope:FinanceTargetScope;
 @IsOptional() @IsString() targetId?:string|null;
 @IsOptional() @IsInt() @Min(-100) @Max(100) priority?:number;
 @IsOptional() @IsBoolean() enabled?:boolean;
 @IsOptional() @IsISO8601() validFrom?:string|null;
 @IsOptional() @IsISO8601() validTo?:string|null;
}
export class CreateTaxRuleDto extends RuleScopeDto{
 @IsEnum(FinanceTaxComponent) component:FinanceTaxComponent;
 @IsInt() @Min(0) @Max(10000) rateBps:number;
}
export class UpdateTaxRuleDto extends PartialType(CreateTaxRuleDto){}
export class CreatePriceRuleDto extends RuleScopeDto{
 @IsEnum(FinancePriceAdjustment) adjustment:FinancePriceAdjustment;
 @IsOptional() @Matches(/^([01]\\d|2[0-3]):[0-5]\\d$/) startTime?:string|null;
 @IsOptional() @Matches(/^([01]\\d|2[0-3]):[0-5]\\d$/) endTime?:string|null;
 @IsOptional() @IsArray() @IsInt({each:true}) @Min(0,{each:true}) @Max(6,{each:true}) weekdays?:number[];
 @IsNumber({maxDecimalPlaces:2}) @Min(0) @Max(1000000) value:number;
}
export class UpdatePriceRuleDto extends PartialType(CreatePriceRuleDto){}

export class UpdateGstStateCodeDto{
 @Matches(/^\\d{2}$/) gstStateCode:string;
}
