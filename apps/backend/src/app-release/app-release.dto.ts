import {IsBoolean,IsEnum,IsNotEmpty,IsOptional,IsString,IsUrl,Matches,MaxLength} from 'class-validator';
import {PartialType} from '@nestjs/swagger';
import {AppPlatform} from './app-release.enums';
export class CurrentAppReleaseQueryDto{
 @IsOptional() @IsEnum(AppPlatform) platform?:AppPlatform;
}
export class CreateAppReleaseDto{
 @IsEnum(AppPlatform) platform:AppPlatform;
 @IsString() @IsNotEmpty() @Matches(/^\d+\.\d+\.\d+$/) version:string;
 @IsString() @IsNotEmpty() @Matches(/^\d{1,12}$/) buildNumber:string;
 @IsUrl({require_protocol:true,protocols:['https']}) downloadUrl:string;
 @IsOptional() @Matches(/^[a-f0-9]{64}$/i) sha256?:string;
 @IsOptional() @IsString() @MaxLength(3000) releaseNotes?:string;
 @IsOptional() @Matches(/^\d+\.\d+\.\d+$/) minSupportedVersion?:string;
 @IsOptional() @IsBoolean() isPublished?:boolean;
}
export class UpdateAppReleaseDto extends PartialType(CreateAppReleaseDto){}
