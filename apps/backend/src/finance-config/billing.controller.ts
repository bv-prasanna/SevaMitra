import {StreamableFile,Controller,Get,Post,Param,Body,UseGuards,Res} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import type {Response} from 'express';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {CurrentUser} from '../auth/decorators/current-user.decorator';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';
import {FinanceBillingService} from './billing.service';
import {UpsertIssuerDto,IssueInvoiceDto} from './billing.dto';
@ApiBearerAuth()
@ApiTags('My billing and invoices')
@UseGuards(JwtAuthGuard)
@Controller({path:'billing/me',version:'1'})
export class MyBillingController{
 constructor(private readonly billing:FinanceBillingService){}
 @Get() list(@CurrentUser() user:AuthenticatedUser){return this.billing.listMine(user.id)}
 @Post('bookings/:bookingId/proforma')
 create(@Param('bookingId') bookingId:string,@CurrentUser() user:AuthenticatedUser){return this.billing.proforma(user.id,bookingId)}
 @Get(':id') get(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.billing.getMine(user.id,id)}
 @Get(':id/download')
 async download(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser,@Res({passthrough:true}) res:Response){
  const file=await this.billing.downloadMine(user.id,id);
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition','attachment; filename="sevamitra-invoice.pdf"');
  res.setHeader('Cache-Control','private, no-store');
  return new StreamableFile(file,{type:'application/pdf'});
 }
}
@ApiBearerAuth()
@ApiTags('Billing administration')
@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions('finance.billing.manage')
@Controller({path:'billing/admin',version:'1'})
export class AdminBillingController{
 constructor(private readonly billing:FinanceBillingService){}
 @Get('issuers') issuers(){return this.billing.issuers()}
 @Post('issuers')
 issuer(@CurrentUser() actor:AuthenticatedUser,@Body() dto:UpsertIssuerDto){return this.billing.upsertIssuer(actor.id,dto)}
 @Get('invoices') invoices(){return this.billing.listAll()}
 @Post('invoices/:id/issue')
 issue(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser,@Body() dto:IssueInvoiceDto){
  return this.billing.issue(id,actor.id,dto);
 }
}
