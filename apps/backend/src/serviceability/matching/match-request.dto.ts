import {ApiProperty} from '@nestjs/swagger';
import {IsEnum,IsISO8601,IsOptional,IsUUID,Matches} from 'class-validator';
export enum MatchStrategy{RANKED='RANKED',ROUND_ROBIN='ROUND_ROBIN',BROADCAST='BROADCAST'}
export class MatchRequestDto{
 @IsUUID() serviceId!:string;
 @IsUUID() townVillageId!:string;
 @ApiProperty({enum:MatchStrategy,default:MatchStrategy.RANKED})
 @IsEnum(MatchStrategy) strategy:MatchStrategy=MatchStrategy.RANKED;
 @IsOptional() @IsISO8601({strict:true}) scheduledDate?:string;
 @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) scheduledStartTime?:string;
 @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) scheduledEndTime?:string;
}
