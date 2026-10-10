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
   * Persist first, send second. If the process crashes mid-dispatch, the
   * leased row becomes eligible for a retry instead of being silently lost.
   */
  async send(
    userId: string,
    channel: NotificationChannel,
    title: string,
    body: string,
  ): Promise<Notification> {
    await this.authService.getPublicUserByIdOrThrow(userId);
    const pending = await this.prisma.notification.create({
      data: {
        userId, channel, title, body,
        status: NotificationStatus.PENDING,
        nextAttemptAt: new Date(),
      },
    });
    return (await this.attemptDelivery(pending.id)) ?? pending;
  }

  /** Can be invoked by an authorized operations scheduler or cron. */
  async retryDue(limit = 25): Promise<{ examined: number; sent: number; dead: number }> {
    const now = new Date();
    const due = await this.prisma.notification.findMany({
      where: {
        status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED, NotificationStatus.SENDING] },
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      take: Math.max(1, Math.min(limit, 100)),
      orderBy: { nextAttemptAt: 'asc' },
    });
    let sent = 0;
    let dead = 0;
    for (const item of due) {
      const result = await this.attemptDelivery(item.id);
      if (result?.status === NotificationStatus.SENT) sent++;
      if (result?.status === NotificationStatus.DEAD) dead++;
    }
    return { examined: due.length, sent, dead };
  }

  private async attemptDelivery(id: string): Promise<Notification | null> {
    const now = new Date();
    const leased = await this.prisma.notification.updateMany({
      where: {
        id,
        status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED, NotificationStatus.SENDING] },
        nextAttemptAt: { lte: now },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: {
        status: NotificationStatus.SENDING,
        leaseUntil: new Date(now.getTime() + 60_000),
        lastAttemptAt: now,
      },
    });
    if (leased.count !== 1) return null; // another worker owns the lease

    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) return null;
    const attempts = notification.attemptCount + 1;
    try {
      const recipient = await this.authService.getPublicUserByIdOrThrow(notification.userId);
      await this.dispatch(
        notification.channel, recipient, notification.userId,
        notification.title, notification.body,
      );
      return this.prisma.notification.update({
        where: { id },
        data: {
          status: NotificationStatus.SENT,
          attemptCount: attempts, failureReason: null,
          leaseUntil: null, nextAttemptAt: null,
        },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 250) : 'Delivery unavailable';
      const permanent = reason.startsWith('Recipient has no ');
      const exhausted = attempts >= 5 || permanent;
      return this.prisma.notification.update({
        where: { id },
        data: {
          status: exhausted ? NotificationStatus.DEAD : NotificationStatus.FAILED,
          attemptCount: attempts,
          failureReason: reason,
          leaseUntil: null,
          nextAttemptAt: exhausted ? null : new Date(Date.now() + 60_000 * 2 ** (attempts - 1)),
        },
      });
    }
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
