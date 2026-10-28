import {IncidentStatus} from '@prisma/client';
import {IsIn,IsNotEmpty,IsOptional,IsString,MaxLength} from 'class-validator';
export const INCIDENT_CATEGORIES=['SERVICE_ISSUE','SAFETY','ACCOUNT','PROVIDER_ONBOARDING','OTHER'] as const;
export class OpenIncidentDto {
 @IsIn(INCIDENT_CATEGORIES) category:(typeof INCIDENT_CATEGORIES)[number];
 @IsString() @IsNotEmpty() @MaxLength(160) title:string;
 @IsString() @IsNotEmpty() @MaxLength(2000) description:string;
}
export class ChangeIncidentStatusDto {
 @IsIn([IncidentStatus.IN_PROGRESS,IncidentStatus.RESOLVED,IncidentStatus.CLOSED])
 status:IncidentStatus;
 @IsString() @IsNotEmpty() @MaxLength(1000) note:string;
}
export class EscalateIncidentDto {
 @IsString() @IsNotEmpty() @MaxLength(1000) note:string;
}
export class IncidentListDto {
 @IsOptional() @IsIn(Object.values(IncidentStatus)) status?:IncidentStatus;
}
