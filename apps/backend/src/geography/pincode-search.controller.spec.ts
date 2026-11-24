import {BadRequestException} from '@nestjs/common';
import {PincodeSearchController} from './pincode-search.controller';
import {TownVillageService} from './town-village/town-village.service';
import type {PrismaService} from '../prisma/prisma.service';
import type {TalukService} from './taluk/taluk.service';

describe('Public PIN search security & fast lookup',()=>{
 it('rejects invalid, too short, too long, and injection-like PINs without DB queries',async()=>{
  const findMany=jest.fn();
  const svc=new TownVillageService({townVillage:{findMany}} as unknown as PrismaService,{} as TalukService);
  const ctrl=new PincodeSearchController(svc);
  for(const invalid of ['560','5600727','56007a','560072 OR 1=1','..','']){
   await expect(ctrl.byPincode(invalid)).rejects.toThrow(BadRequestException);
  }
  expect(findMany).not.toHaveBeenCalled();
 });
 it('looks up only active Karnataka places with a small PII-free projection',async()=>{
  const findMany=jest.fn().mockResolvedValue([{id:'town-1',name:'Vijayanagara',pincode:'583201'}]);
  const svc=new TownVillageService({townVillage:{findMany}} as unknown as PrismaService,{} as TalukService);
  const result=await new PincodeSearchController(svc).byPincode('583201');
  expect(result).toEqual([{id:'town-1',name:'Vijayanagara',pincode:'583201'}]);
  expect(findMany).toHaveBeenCalledWith({where:{pincode:'583201',isActive:true,taluk:{isActive:true,district:{isActive:true,state:{name:'Karnataka',isActive:true}}}},select:{id:true,name:true,pincode:true},orderBy:{name:'asc'},take:50});
 });
});
