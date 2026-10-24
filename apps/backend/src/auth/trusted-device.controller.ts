import {Controller,Get,Delete,Param,UseGuards,NotFoundException} from '@nestjs/common';
import {ApiBearerAuth,ApiTags,ApiOperation} from '@nestjs/swagger';
import {PrismaService} from '../prisma/prisma.service';
import {CurrentUser} from './decorators/current-user.decorator';
import type {AuthenticatedUser} from './token/jwt-payload.interface';
import {JwtAuthGuard} from './guards/jwt-auth.guard';

/** Device ID alone is never accepted for authentication.
 * A device is created exclusively after successful OTP/password verification,
 * and a stored refresh token is independently required to resume sessions.
 */
@ApiTags('Auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({path:'auth/devices',version:'1'})
export class TrustedDeviceController{
 constructor(private readonly prisma:PrismaService){}
 @Get()
 @ApiOperation({summary:'List my verified mobile sessions, without revealing any secrets'})
 list(@CurrentUser() user:AuthenticatedUser){
  return this.prisma.trustedDevice.findMany({
   where:{userId:user.id},
   select:{id:true,platform:true,label:true,approvedAt:true,lastSeenAt:true,revokedAt:true},
   orderBy:{lastSeenAt:'desc'},take:50,
  });
 }
 @Delete(':id')
 @ApiOperation({summary:'Revoke my device and all of its outstanding refresh sessions'})
 async revoke(@CurrentUser() user:AuthenticatedUser,@Param('id') id:string){
  await this.prisma.$transaction(async(tx)=>{
   const changed=await tx.trustedDevice.updateMany({
    where:{id,userId:user.id,revokedAt:null},
    data:{revokedAt:new Date()},
   });
   if(changed.count!==1)throw new NotFoundException('Active device not found');
   await tx.refreshToken.updateMany({
    where:{userId:user.id,deviceId:id,revokedAt:null},
    data:{revokedAt:new Date()},
   });
  });
  return {revoked:true};
 }
}
