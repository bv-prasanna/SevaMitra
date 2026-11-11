import {Body,Controller,Get,Param,Post,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';
import {CurrentUser} from '../auth/decorators/current-user.decorator';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';
import {OrganizationService} from './organization.service';
import {CreateCompanyDto,CreateGroupDto,AddStaffDto,AddMemberDto} from './organization.dto';

@ApiTags('Provider Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions('provider.organization.manage')
@Controller({path:'provider-organizations',version:'1'})
export class OrganizationController{
 constructor(private readonly service:OrganizationService){}
 @Post('companies')
 create(@CurrentUser() user:AuthenticatedUser,@Body() dto:CreateCompanyDto){return this.service.createCompany(user.id,dto)}
 @Get('companies') list(){return this.service.listCompanies()}
 @Get('companies/:id') detail(@Param('id') id:string){return this.service.getCompany(id)}
 @Post('companies/:id/approve') approve(@Param('id') id:string){return this.service.approveCompany(id)}
 @Post('companies/:id/groups') group(@Param('id') id:string,@Body() dto:CreateGroupDto){return this.service.createGroup(id,dto)}
 @Post('companies/:id/staff') staff(@Param('id') id:string,@Body() dto:AddStaffDto){return this.service.addStaff(id,dto)}
 @Post('companies/:id/memberships') link(@Param('id') id:string,@Body() dto:AddMemberDto){return this.service.addMember(id,dto)}
}
