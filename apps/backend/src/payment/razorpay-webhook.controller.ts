import {
  Controller, Headers, HttpCode, HttpStatus, Post, Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { RazorpayWebhookService } from './razorpay-webhook.service';

@ApiTags('Payment webhooks')
@Controller({ path: 'payments/webhooks', version: '1' })
export class RazorpayWebhookController {
  constructor(private readonly webhookService: RazorpayWebhookService) {}

  @Post('razorpay')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiExcludeEndpoint()
  receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
    @Headers('x-razorpay-event-id') eventId?: string,
  ) {
    return this.webhookService.receive(request.rawBody, signature, eventId);
  }
}
