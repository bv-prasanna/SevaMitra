import {Controller,Headers,HttpCode,Post,RawBodyRequest,Req,UseGuards} from '@nestjs/common';
import {ApiExcludeController} from '@nestjs/swagger';
import type {Request} from 'express';
import {RazorpayWebhookService} from './razorpay-webhook.service';

@ApiExcludeController()
@Controller({path:'webhooks/razorpay',version:'1'})
export class RazorpayWebhookController{
 constructor(private readonly webhooks:RazorpayWebhookService){}
 @Post()
 @HttpCode(200)
 receive(
  @Req() request:RawBodyRequest<Request>,
  @Headers('x-razorpay-signature') signature?:string,
  @Headers('x-razorpay-event-id') eventId?:string,
 ){
  return this.webhooks.receive(request.rawBody,signature,eventId);
 }
}
