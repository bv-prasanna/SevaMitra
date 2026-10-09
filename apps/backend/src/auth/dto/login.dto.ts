import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsIn, IsOptional, MaxLength } from 'class-validator';

export class LoginWithPasswordDto {
  @ApiProperty({
    example: 'admin@sevamitra.in',
    description: 'Email or E.164 phone number',
  })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'correct-horse-battery-staple' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({required:false,enum:['android','ios']})
  @IsOptional() @IsIn(['android','ios'])
  devicePlatform?:'android'|'ios';

  @ApiProperty({required:false,description:'Displayed on trusted-device management page'})
  @IsOptional() @IsString() @MaxLength(80)
  deviceLabel?:string;

}
