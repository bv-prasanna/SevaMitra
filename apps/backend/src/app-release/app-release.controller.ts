import {Body,Controller,Delete,Get,Param,Patch,Post,Query,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {CurrentUser} from '../auth/decorators/current-user.decorator';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';
import {AppReleaseService} from './app-release.service';
import {CreateAppReleaseDto,CurrentAppReleaseQueryDto,UpdateAppReleaseDto} from './app-release.dto';
import {AppPlatform} from './app-release.enums';

@ApiTags('Mobile app releases')
@Controller({path:'app-releases',version:'1'})
export class AppReleasePublicController{
 constructor(private readonly releases:AppReleaseService){}
 @Get('current') current(@Query() q:CurrentAppReleaseQueryDto){return this.releases.current(q.platform??AppPlatform.ANDROID)}
}
@ApiTags('Mobile app release administration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions('app.release.manage')
@Controller({path:'app-releases/admin',version:'1'})
export class AppReleaseAdminController{
 constructor(private readonly releases:AppReleaseService){}
 @Get() list(){return this.releases.list()}
 @Post() create(@CurrentUser() actor:AuthenticatedUser,@Body() dto:CreateAppReleaseDto){return this.releases.create(actor.id,dto)}
 @Patch(':id') update(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser,@Body() dto:UpdateAppReleaseDto){return this.releases.update(id,actor.id,dto)}
 @Delete(':id') retire(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser){return this.releases.retire(id,actor.id)}
}
