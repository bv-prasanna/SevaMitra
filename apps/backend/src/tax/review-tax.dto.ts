import {ApiProperty} from '@nestjs/swagger';
import {TaxReviewStatus} from '@prisma/client';
import {IsEnum,IsNumber,IsOptional,IsString,MaxLength,Min} from 'class-validator';

/** Manual finance approval only. Do not infer statutory rates from service category. */
export class ReviewTaxDto{
 @ApiProperty({enum:TaxReviewStatus})
 @IsEnum(TaxReviewStatus) reviewStatus!:TaxReviewStatus;
 @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) taxableBase?:number;
 @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) gstAmount?:number;
 @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) tcsAmount?:number;
 @IsOptional() @IsNumber({maxDecimalPlaces:2}) @Min(0) tdsAmount?:number;
 @IsString() @MaxLength(2000) basisNote!:string;
}
