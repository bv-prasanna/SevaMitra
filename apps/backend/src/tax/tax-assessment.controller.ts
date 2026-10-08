import {Body,Controller,Get,Param,Post,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {PermissionsGuard} from '../iam/authorization/permissions.guard';
import {RequirePermissions} from '../iam/authorization/require-permissions.decorator';
import {CurrentUser} from '../auth/decorators/current-user.decorator';
import type {AuthenticatedUser} from '../auth/token/jwt-payload.interface';
import {TaxAssessmentService} from './tax-assessment.service';
import {ReviewTaxDto} from './review-tax.dto';
@ApiTags('Tax Review')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard,PermissionsGuard)
@RequirePermissions('tax.assessment.manage')
@Controller({path:'finance/tax',version:'1'})
export class TaxAssessmentController{
 constructor(private readonly service:TaxAssessmentService){}
 @Get('bookings/:bookingId') find(@Param('bookingId') bookingId:string){return this.service.findOne(bookingId)}
 @Post('bookings/:bookingId/review')
 review(@CurrentUser() user:AuthenticatedUser,@Param('bookingId') id:string,@Body() dto:ReviewTaxDto){
  return this.service.review(id,user.id,dto);
 }
}
