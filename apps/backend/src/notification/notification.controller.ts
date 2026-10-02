import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/token/jwt-payload.interface';
import { NotificationService } from './notification.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationDto } from './dto/responses/notification.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Notification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'notifications/me', version: '1' })
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications addressed to the current user' })
  @ApiOkResponse({ type: NotificationDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationService.listAsUser(user.id, query.unreadOnly);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark one of your own notifications as read (idempotent)',
  })
  @ApiOkResponse({ type: NotificationDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationService.markReadAsUser(user.id, id);
  }
}
