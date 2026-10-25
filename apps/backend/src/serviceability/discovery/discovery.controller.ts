import {Controller,Get,Query,UseGuards,BadRequestException} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../../auth/guards/jwt-auth.guard';
import {DiscoveryService} from './discovery.service';
import {DiscoverOfferingsDto} from './dto/discover-offerings.dto';

@ApiTags('Discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({path:'discovery',version:'1'})
export class DiscoveryController{
 constructor(private readonly service:DiscoveryService){}
 @Get('available-services')
 async availableServices(@Query('townVillageId') townVillageId:string){
  if(!townVillageId||!/^[0-9a-f-]{36}$/i.test(townVillageId))throw new BadRequestException('Valid townVillageId required');
  return this.service.findAvailableServices(townVillageId);
 }
 @Get('offerings')
 @ApiOperation({summary:'List active verified provider offerings serviceable at a town/village'})
 find(@Query() query:DiscoverOfferingsDto){
  return this.service.findServiceableOfferings(query.serviceId,query.townVillageId);
 }
}
