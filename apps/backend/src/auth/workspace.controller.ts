import {Controller,Get,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from './guards/jwt-auth.guard';
import {CurrentUser} from './decorators/current-user.decorator';
import type {AuthenticatedUser} from './token/jwt-payload.interface';
import {WorkspaceService} from './workspace.service';

@ApiTags('Auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({path:'auth/workspaces',version:'1'})
export class WorkspaceController{
 constructor(private readonly workspaces:WorkspaceService){}
 @Get()
 @ApiOperation({summary:'Current account allowed navigation workspaces; endpoints still enforce permissions'})
 get(@CurrentUser() user:AuthenticatedUser){
  return this.workspaces.forUser(user.id);
 }
}
