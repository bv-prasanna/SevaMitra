import {Body,Controller,Delete,Get,Param,Patch,Post,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';
import {CurrentUser} from '../auth/decorators/current-user.decorator';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';
import {UpdateGstStateCodeDto} from './rules.dto';
import {FinanceRulesService} from './rules.service';
import {CreatePriceRuleDto,CreateTaxRuleDto,UpdatePriceRuleDto,UpdateTaxRuleDto} from './rules.dto';
@ApiTags('Finance tax and pricing configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,PermissionsGuard)
@Controller({path:'finance/config',version:'1'})
export class FinanceRulesController {
 constructor(private readonly rules:FinanceRulesService){}
 @Patch('states/:id/gst-code') @RequirePermissions('finance.tax.manage')
 stateGstCode(@Param('id') id:string,@Body() dto:UpdateGstStateCodeDto){return this.rules.updateGstStateCode(id,dto.gstStateCode)}
 @Get('taxes') @RequirePermissions('finance.tax.manage')
 taxes(){return this.rules.taxes()}
 @Post('taxes') @RequirePermissions('finance.tax.manage')
 createTax(@CurrentUser() actor:AuthenticatedUser,@Body() dto:CreateTaxRuleDto){return this.rules.createTax(actor.id,dto)}
 @Patch('taxes/:id') @RequirePermissions('finance.tax.manage')
 updateTax(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser,@Body() dto:UpdateTaxRuleDto){return this.rules.updateTax(id,actor.id,dto)}
 @Delete('taxes/:id') @RequirePermissions('finance.tax.manage')
 disableTax(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser){return this.rules.disableTax(id,actor.id)}
 @Get('pricing') @RequirePermissions('finance.pricing.manage')
 prices(){return this.rules.prices()}
 @Post('pricing') @RequirePermissions('finance.pricing.manage')
 createPrice(@CurrentUser() actor:AuthenticatedUser,@Body() dto:CreatePriceRuleDto){return this.rules.createPrice(actor.id,dto)}
 @Patch('pricing/:id') @RequirePermissions('finance.pricing.manage')
 updatePrice(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser,@Body() dto:UpdatePriceRuleDto){return this.rules.updatePrice(id,actor.id,dto)}
 @Delete('pricing/:id') @RequirePermissions('finance.pricing.manage')
 disablePrice(@Param('id') id:string,@CurrentUser() actor:AuthenticatedUser){return this.rules.disablePrice(id,actor.id)}
}
