import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { NOTIFICATION_PROVIDER } from './provider/notification-provider.interface';
import type { NotificationProvider } from './provider/notification-provider.interface';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    @Inject(NOTIFICATION_PROVIDER)
    private readonly notificationProvider: NotificationProvider,
  ) {}

  /**
   * Exported for other modules (Booking, Payment, ...) to call once they
   * choose to wire in a notification on a state change — not yet done from
   * any of them, see docs/modules/NOTIFICATION_IMPLEMENTATION.md §6.
   */
  async send(
    userId: string,
    channel: NotificationChannel,
    title: string,
    body: string,
  ): Promise<Notification> {
    const recipient = await this.authService.getPublicUserByIdOrThrow(userId);

    let status: NotificationStatus = NotificationStatus.SENT;
    let failureReason: string | null = null;

    try {
      await this.dispatch(channel, recipient, userId, title, body);
    } catch (err) {
      status = NotificationStatus.FAILED;
      failureReason =
        err instanceof Error ? err.message : 'Unknown delivery failure';
    }

    return this.prisma.notification.create({
      data: { userId, channel, title, body, status, failureReason },
    });
  }

  async listAsUser(
    userId: string,
    unreadOnly?: boolean,
  ): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId, readAt: unreadOnly ? null : undefined },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markReadAsUser(userId: string, id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.readAt) {
      return notification;
    }
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  private dispatch(
    channel: NotificationChannel,
    recipient: { phoneNumber: string | null; email: string | null },
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    switch (channel) {
      case NotificationChannel.IN_APP:
        return Promise.resolve();
      case NotificationChannel.SMS:
        return this.notificationProvider.sendSms(
          this.requirePhone(recipient),
          body,
        );
      case NotificationChannel.WHATSAPP:
        return this.notificationProvider.sendWhatsApp(
          this.requirePhone(recipient),
          body,
        );
      case NotificationChannel.PUSH:
        return this.notificationProvider.sendPush(userId, title, body);
      case NotificationChannel.EMAIL:
        return this.notificationProvider.sendEmail(
          this.requireEmail(recipient),
          title,
          body,
        );
    }
  }

  private requirePhone(recipient: { phoneNumber: string | null }): string {
    if (!recipient.phoneNumber) {
      throw new Error('Recipient has no phone number on file');
    }
    return recipient.phoneNumber;
  }

  private requireEmail(recipient: { email: string | null }): string {
    if (!recipient.email) {
      throw new Error('Recipient has no email address on file');
    }
    return recipient.email;
  }
}
