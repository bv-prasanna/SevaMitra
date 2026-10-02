import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IamModule } from '../iam/iam.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AdminNotificationController } from './admin-notification.controller';
import { NOTIFICATION_PROVIDER } from './provider/notification-provider.interface';
import { ConsoleNotificationProvider } from './provider/console-notification.provider';

@Module({
  imports: [AuthModule, IamModule],
  controllers: [NotificationController, AdminNotificationController],
  providers: [
    NotificationService,
    { provide: NOTIFICATION_PROVIDER, useClass: ConsoleNotificationProvider },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
