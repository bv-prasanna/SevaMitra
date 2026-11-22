import {ConflictException,Injectable,NotFoundException,BadRequestException} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {AppPlatform} from './app-release.enums';
import {CreateAppReleaseDto,UpdateAppReleaseDto} from './app-release.dto';
@Injectable()
export class AppReleaseService{
 constructor(private readonly prisma:PrismaService){}
 private validateUrl(value:string){
  try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw new Error('invalid')}
  catch{throw new BadRequestException('App download URL must be a public HTTPS link')}
 }
 current(platform:AppPlatform=AppPlatform.ANDROID){
  return this.prisma.appRelease.findFirst({
   where:{platform,isPublished:true},
   select:{id:true,platform:true,version:true,buildNumber:true,downloadUrl:true,sha256:true,
    releaseNotes:true,minSupportedVersion:true,publishedAt:true},
   orderBy:[{publishedAt:'desc'},{createdAt:'desc'}],
  });
 }
 list(){
  return this.prisma.appRelease.findMany({orderBy:[{platform:'asc'},{createdAt:'desc'}],take:100});
 }
 async create(actorId:string,dto:CreateAppReleaseDto){
  if(dto.platform===AppPlatform.IOS&&dto.isPublished)throw new BadRequestException('iOS release publishing is on hold');
  this.validateUrl(dto.downloadUrl);
  try{
   return await this.prisma.$transaction(async tx=>{
    if(dto.isPublished)await tx.appRelease.updateMany({where:{platform:dto.platform,isPublished:true},data:{isPublished:false}});
    return tx.appRelease.create({data:{
     platform:dto.platform,version:dto.version,buildNumber:dto.buildNumber,downloadUrl:dto.downloadUrl,
     sha256:dto.sha256??null,releaseNotes:dto.releaseNotes??null,minSupportedVersion:dto.minSupportedVersion??null,
     isPublished:dto.isPublished??false,publishedAt:dto.isPublished?new Date():null,createdBy:actorId,updatedBy:actorId,
    }});
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  }catch(error){if((error as {code?:string})?.code==='P2002')throw new ConflictException('This platform/version/build already exists');throw error}
 }
 async update(id:string,actorId:string,dto:UpdateAppReleaseDto){
  const current=await this.prisma.appRelease.findUnique({where:{id}});
  if(!current)throw new NotFoundException('App release not found');
  if(dto.platform===AppPlatform.IOS&&(dto.isPublished===true||current.isPublished))throw new BadRequestException('iOS release publishing is on hold');
  if(dto.downloadUrl)this.validateUrl(dto.downloadUrl);
  return this.prisma.$transaction(async tx=>{
   if(dto.isPublished===true)await tx.appRelease.updateMany({where:{platform:dto.platform??current.platform,isPublished:true,id:{not:id}},data:{isPublished:false}});
   return tx.appRelease.update({where:{id},data:{
    ...(dto.platform!==undefined?{platform:dto.platform}:{}),
    ...(dto.version!==undefined?{version:dto.version}:{}),
    ...(dto.buildNumber!==undefined?{buildNumber:dto.buildNumber}:{}),
    ...(dto.downloadUrl!==undefined?{downloadUrl:dto.downloadUrl}:{}),
    ...(dto.sha256!==undefined?{sha256:dto.sha256||null}:{}),
    ...(dto.releaseNotes!==undefined?{releaseNotes:dto.releaseNotes||null}:{}),
    ...(dto.minSupportedVersion!==undefined?{minSupportedVersion:dto.minSupportedVersion||null}:{}),
    ...(dto.isPublished!==undefined?{isPublished:dto.isPublished,publishedAt:dto.isPublished?new Date():current.publishedAt}:{}),
    updatedBy:actorId,
   }});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }
 async retire(id:string,actorId:string){
  const current=await this.prisma.appRelease.findUnique({where:{id}});
  if(!current)throw new NotFoundException('App release not found');
  return this.prisma.appRelease.update({where:{id},data:{isPublished:false,updatedBy:actorId}});
 }
}
