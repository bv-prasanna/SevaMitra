import {BadRequestException,NotFoundException} from '@nestjs/common';
import {AppReleaseService} from './app-release.service';
import type {PrismaService} from '../prisma/prisma.service';
describe('AppReleaseService',()=>{
 let prisma:any;let tx:any;let service:AppReleaseService;
 const row={id:'release-1',platform:'ANDROID',version:'1.2.0',buildNumber:'42',downloadUrl:'https://downloads.example.com/sevamitra.apk',isPublished:true};
 beforeEach(()=>{
  tx={appRelease:{create:jest.fn().mockResolvedValue(row),updateMany:jest.fn().mockResolvedValue({count:1}),update:jest.fn().mockResolvedValue(row)}};
  prisma={appRelease:{findFirst:jest.fn().mockResolvedValue(row),findMany:jest.fn().mockResolvedValue([row]),findUnique:jest.fn().mockResolvedValue(row),update:jest.fn().mockResolvedValue({...row,isPublished:false})},
   $transaction:jest.fn(async(fn:any)=>fn(tx))};
  service=new AppReleaseService(prisma as PrismaService);
 });
 it('returns only the published Android release and public safe fields',async()=>{
  await service.current();
  expect(prisma.appRelease.findFirst).toHaveBeenCalledWith(expect.objectContaining({
   where:{platform:'ANDROID',isPublished:true},select:expect.objectContaining({downloadUrl:true,sha256:true}),
  }));
 });
 it('unpublishes the previous release atomically before publishing a new one',async()=>{
  await service.create('admin',{platform:'ANDROID',version:'1.3.0',buildNumber:'43',downloadUrl:'https://downloads.example.com/new.apk',isPublished:true});
  expect(tx.appRelease.updateMany).toHaveBeenCalledWith({where:{platform:'ANDROID',isPublished:true},data:{isPublished:false}});
  expect(tx.appRelease.create).toHaveBeenCalledWith({data:expect.objectContaining({createdBy:'admin',updatedBy:'admin',isPublished:true})});
 });
 it('rejects non-HTTPS download links',async()=>{
  await expect(service.create('admin',{platform:'ANDROID',version:'1.3.0',buildNumber:'43',downloadUrl:'http://downloads.example.com/app.apk'})).rejects.toThrow(BadRequestException);
  expect(tx.appRelease.create).not.toHaveBeenCalled();
 });
 it('keeps iOS release publishing disabled until distribution is approved',async()=>{
  await expect(service.create('admin',{platform:'IOS',version:'1.0.0',buildNumber:'1',downloadUrl:'https://downloads.example.com/app.ipa',isPublished:true})).rejects.toThrow('iOS release publishing is on hold');
 });
 it('retires a release without deleting its audit record',async()=>{
  await service.retire('release-1','admin');
  expect(prisma.appRelease.update).toHaveBeenCalledWith({where:{id:'release-1'},data:{isPublished:false,updatedBy:'admin'}});
 });
 it('returns Not Found when an admin edits an unknown release',async()=>{
  prisma.appRelease.findUnique.mockResolvedValue(null);
  await expect(service.update('missing','admin',{isPublished:true})).rejects.toThrow(NotFoundException);
 });
});
