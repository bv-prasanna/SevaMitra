import {ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {OrganizationStatus,ProviderStatus,VerificationStatus} from '@prisma/client';
import {PrismaService} from '../prisma/prisma.service';
import {CreateCompanyDto,CreateGroupDto,AddStaffDto,AddMemberDto} from './organization.dto';

@Injectable()
export class OrganizationService{
 constructor(private readonly prisma:PrismaService){}
 async createCompany(ownerUserId:string,dto:CreateCompanyDto){
  // Newly created companies are held for review, never automatically verified.
  return this.prisma.providerCompany.create({data:{ownerUserId,name:dto.name.trim()}});
 }
 async listCompanies(){return this.prisma.providerCompany.findMany({orderBy:{createdAt:'desc'},take:100})}
 async getCompany(id:string){
  const company=await this.prisma.providerCompany.findUnique({where:{id},include:{groups:true,staff:true,memberships:true}});
  if(!company)throw new NotFoundException('Provider company not found');
  return company;
 }
 async approveCompany(id:string){
  await this.assertCompany(id);
  return this.prisma.providerCompany.update({where:{id},data:{status:OrganizationStatus.ACTIVE}});
 }
 async createGroup(companyId:string,dto:CreateGroupDto){
  await this.assertCompany(companyId);
  return this.prisma.providerGroup.create({data:{companyId,name:dto.name.trim()}});
 }
 async addStaff(companyId:string,dto:AddStaffDto){
  await this.assertCompany(companyId);
  await this.checkGroup(companyId,dto.groupId);
  if(dto.userId){
   const user=await this.prisma.user.findUnique({where:{id:dto.userId}});
   if(!user)throw new NotFoundException('Staff user not found');
  }
  // Staff must be approved separately and is inactive by default.
  return this.prisma.providerStaff.create({data:{companyId,groupId:dto.groupId,userId:dto.userId,displayName:dto.displayName.trim(),designation:dto.designation}});
 }
 async addMember(companyId:string,dto:AddMemberDto){
  const company=await this.assertCompany(companyId);
  if(company.status!==OrganizationStatus.ACTIVE)throw new ConflictException('Company must be approved before linking providers');
  await this.checkGroup(companyId,dto.groupId);
  const provider=await this.prisma.providerProfile.findUnique({where:{id:dto.providerId}});
  if(!provider||provider.status!==ProviderStatus.ACTIVE||provider.verificationStatus!==VerificationStatus.VERIFIED){
   throw new ConflictException('Only active, verified providers may join a company');
  }
  const existing=await this.prisma.providerMembership.findUnique({where:{providerId:dto.providerId}});
  if(existing)throw new ConflictException('Provider already belongs to a company');
  return this.prisma.providerMembership.create({data:{companyId,providerId:dto.providerId,groupId:dto.groupId,status:OrganizationStatus.ACTIVE}});
 }
 private async assertCompany(id:string){
  const company=await this.prisma.providerCompany.findUnique({where:{id}});
  if(!company)throw new NotFoundException('Provider company not found');
  return company;
 }
 private async checkGroup(companyId:string,groupId?:string){
  if(!groupId)return;
  const group=await this.prisma.providerGroup.findUnique({where:{id:groupId}});
  if(!group||group.companyId!==companyId)throw new NotFoundException('Provider group not found in company');
 }
}
