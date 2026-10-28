import {ApiProperty} from '@nestjs/swagger';
import {IsOptional,IsString,IsUUID,MaxLength,MinLength} from 'class-validator';

export class CreateCompanyDto{
 @ApiProperty({example:'Sri Ganesh Services'})
 @IsString() @MinLength(2) @MaxLength(150)
 name!:string;
}
export class CreateGroupDto{
 @ApiProperty({example:'Bengaluru Electricians'})
 @IsString() @MinLength(2) @MaxLength(150)
 name!:string;
}
export class AddStaffDto{
 @ApiProperty({example:'Manjunath'})
 @IsString() @MinLength(2) @MaxLength(150)
 displayName!:string;
 @IsOptional() @IsUUID() userId?:string;
 @IsOptional() @IsUUID() groupId?:string;
 @IsOptional() @IsString() @MaxLength(120) designation?:string;
}
export class AddMemberDto{
 @IsUUID() providerId!:string;
 @IsOptional() @IsUUID() groupId?:string;
}
