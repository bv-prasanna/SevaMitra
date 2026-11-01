import {IsBoolean,IsNotEmpty,IsOptional,IsString,IsUUID,Matches,MaxLength} from 'class-validator';
export class UpsertIssuerDto {
 @IsOptional() @IsUUID('4') providerId?:string;
 @IsString() @IsNotEmpty() @MaxLength(160) legalName:string;
 @IsString() @IsNotEmpty() @MaxLength(500) address:string;
 @Matches(/^\\d{2}$/) stateCode:string;
 @IsOptional() @Matches(/^[0-9A-Z]{15}$/) gstin?:string;
 @IsOptional() @IsString() @MaxLength(12) sacCode?:string;
 @IsOptional() @IsString() @MaxLength(150) authorizedSignatory?:string;
 @IsBoolean() verified:boolean;
}
export class IssueInvoiceDto{
 @Matches(/^\\d{2}$/) placeOfSupplyStateCode:string;
 @IsString() @IsNotEmpty() @MaxLength(100) verificationNote:string;
}
