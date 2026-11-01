import {Controller,Get,Query} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';
import {FinanceQuoteService} from './quote.service';
import {QuoteQueryDto} from './quote.dto';
@ApiTags('Pricing quote')
@Controller({path:'pricing',version:'1'})
export class QuoteController{
 constructor(private readonly quotes:FinanceQuoteService){}
 @Get('quote')
 quote(@Query() q:QuoteQueryDto){return this.quotes.quote(q)}
}
