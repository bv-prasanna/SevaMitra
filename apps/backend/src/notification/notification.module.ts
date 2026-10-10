import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IamModule } from '../iam/iam.module';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AdminNotificationController } from './admin-notification.controller';
import { NOTIFICATION_PROVIDER } from './provider/notification-provider.interface';
import { ConsoleNotificationProvider } from './provider/console-notification.provider';
import { LiveNotificationProvider } from './provider/live-notification.provider';
import { PushDeviceController } from './push-device.controller';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [AuthModule, IamModule],
  controllers: [NotificationController, AdminNotificationController, PushDeviceController],
  providers: [
    NotificationService,
    {
      provide: NOTIFICATION_PROVIDER,
      inject: [ConfigService,PrismaService],
      useFactory:(config:ConfigService,prisma:PrismaService)=>
        config.get<string>('NOTIFICATION_PROVIDER')==='live'
          ? new LiveNotificationProvider(config,prisma)
          : new ConsoleNotificationProvider(),
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
