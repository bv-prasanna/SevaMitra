import {Body,Controller,Delete,Get,Param,Post,UseGuards,ConflictException} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {IsIn,IsString,Matches} from 'class-validator';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {CurrentUser} from '../auth/decorators/current-user.decorator';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';
import {PrismaService} from '../prisma/prisma.service';

class RegisterDeviceDto{
 @IsString() @Matches(/^(Expo|Exponent)PushToken\[[^\]]{10,200}\]$/)
 token!:string;
 @IsIn(['android','ios']) platform!:'android'|'ios';
}
@ApiTags('Push devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({path:'notifications/me/devices',version:'1'})
export class PushDeviceController{
 constructor(private readonly prisma:PrismaService){}
 @Post() async register(@CurrentUser() user:AuthenticatedUser,@Body() dto:RegisterDeviceDto){
  const existing=await this.prisma.pushDevice.findUnique({where:{expoToken:dto.token}});
  if(existing && existing.userId!==user.id)throw new ConflictException('Push token already bound to another account');
  return this.prisma.pushDevice.upsert({
   where:{expoToken:dto.token},
   update:{userId:user.id,platform:dto.platform,isActive:true},
   create:{userId:user.id,expoToken:dto.token,platform:dto.platform},
  });
 }
 @Get() list(@CurrentUser() user:AuthenticatedUser){
  return this.prisma.pushDevice.findMany({where:{userId:user.id},select:{id:true,platform:true,isActive:true,updatedAt:true}});
 }
 @Delete(':id') async unregister(@CurrentUser() user:AuthenticatedUser,@Param('id') id:string){
  return this.prisma.pushDevice.updateMany({where:{id,userId:user.id},data:{isActive:false}});
 }
}
