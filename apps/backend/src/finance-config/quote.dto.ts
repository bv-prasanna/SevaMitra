import {IsISO8601,IsOptional,IsUUID,Matches} from 'class-validator';
export class QuoteQueryDto {
 @IsUUID('4') offeringId:string;
 @IsUUID('4') townVillageId:string;
 @IsOptional() @IsISO8601({strict:true}) scheduledDate?:string;
 @IsOptional() @Matches(/^([01]\\d|2[0-3]):[0-5]\\d$/) scheduledStartTime?:string;
}
