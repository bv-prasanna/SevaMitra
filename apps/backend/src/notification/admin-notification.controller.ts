import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../iam/authorization/permissions.guard';
import { RequirePermissions } from '../iam/authorization/require-permissions.decorator';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationDto } from './dto/responses/notification.dto';

@ApiTags('Notification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('notification.send')
@Controller({ path: 'notifications', version: '1' })
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @ApiOperation({
    summary:
      'Send an operational or promotional notification to a specific user',
  })
  @ApiOkResponse({ type: NotificationDto })
  send(@Body() dto: SendNotificationDto) {
    return this.notificationService.send(
      dto.userId,
      dto.channel,
      dto.title,
      dto.body,
    );
  }
}
