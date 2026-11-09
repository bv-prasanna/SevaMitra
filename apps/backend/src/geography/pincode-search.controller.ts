import {BadRequestException, Controller, Get, Param} from '@nestjs/common';
import {ApiOkResponse, ApiOperation, ApiTags} from '@nestjs/swagger';
import {TownVillageService} from './town-village/town-village.service';

/**
 * Public catalogue-only geography lookup. No profile, account, KYC, or contact fields.
 * Returns only active pilot-relevant locations; booking and provider details still require JWT.
 */
@ApiTags('Geography')
@Controller({path:'geography',version:'1'})
export class PincodeSearchController {
 constructor(private readonly towns:TownVillageService){}
 @Get('pincodes/:pincode/towns')
 @ApiOperation({summary:'Find active Karnataka service areas by six-digit PIN'})
 @ApiOkResponse({description:'Array of public town/village identifiers and names'})
 async byPincode(@Param('pincode') pincode:string){
  if(!/^\d{6}$/.test(pincode))throw new BadRequestException('Enter a valid six-digit PIN code.');
  return this.towns.findActiveByPincode(pincode);
 }
}
