import {Body,Controller,Post,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../../auth/guards/jwt-auth.guard';
import {MatchingService} from './matching.service';
import {MatchRequestDto} from './match-request.dto';
@ApiTags('Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({path:'discovery/matches',version:'1'})
export class MatchingController{
 constructor(private readonly service:MatchingService){}
 @Post()
 match(@Body() dto:MatchRequestDto){return this.service.match(dto)}
}
