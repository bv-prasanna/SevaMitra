import { NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { NotificationService } from './notification.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthService } from '../auth/auth.service';

describe('NotificationService', () => {
  let prisma: {
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let authService: { getPublicUserByIdOrThrow: jest.Mock };
  let notificationProvider: {
    sendSms: jest.Mock;
    sendWhatsApp: jest.Mock;
    sendPush: jest.Mock;
    sendEmail: jest.Mock;
  };
  let service: NotificationService;

  const recipient = {
    id: 'user-1',
    phoneNumber: '+919876543210',
    email: 'user@example.com',
  };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({count:1}),
      },
    };
    authService = {
      getPublicUserByIdOrThrow: jest.fn().mockResolvedValue(recipient),
    };
    notificationProvider = {
      sendSms: jest.fn().mockResolvedValue(undefined),
      sendWhatsApp: jest.fn().mockResolvedValue(undefined),
      sendPush: jest.fn().mockResolvedValue(undefined),
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new NotificationService(
      prisma as unknown as PrismaService,
      authService as unknown as AuthService,
      notificationProvider,
    );
  });

  describe('durable notification delivery', () => {
    const pending = {
      id: 'notif-1', userId: 'user-1', channel: NotificationChannel.SMS,
      title: 'Title', body: 'Body', attemptCount: 0,
      status: NotificationStatus.PENDING,
    };

    beforeEach(() => {
      prisma.notification.create.mockResolvedValue(pending);
      prisma.notification.findUnique.mockResolvedValue(pending);
      prisma.notification.update.mockImplementation(async ({data}: {data: Record<string, unknown>}) =>
        ({...pending, ...data}));
    });

    it('persists PENDING first then records SENT after SMS delivery', async () => {
      const response = await service.send('user-1', NotificationChannel.SMS, 'Title', 'Body');
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1', channel: NotificationChannel.SMS,
          status: NotificationStatus.PENDING, nextAttemptAt: expect.any(Date),
        }),
      });
      expect(notificationProvider.sendSms).toHaveBeenCalledWith('+919876543210','Body');
      expect(prisma.notification.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({status: NotificationStatus.SENT,attemptCount:1}),
      }));
      expect(response.status).toBe(NotificationStatus.SENT);
    });

    it('records a retriable failure if push delivery fails', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        ...pending, channel: NotificationChannel.PUSH,
      });
      notificationProvider.sendPush.mockRejectedValue(new Error('gateway unreachable'));
      const response = await service.send('user-1', NotificationChannel.PUSH, 'Title', 'Body');
      expect(response.status).toBe(NotificationStatus.FAILED);
      expect(response.nextAttemptAt).toBeInstanceOf(Date);
      expect(response.attemptCount).toBe(1);
    });

    it('dead-letters a permanently undeliverable SMS with no recipient number', async () => {
      authService.getPublicUserByIdOrThrow.mockResolvedValue({...recipient,phoneNumber:null});
      const response = await service.send('user-1', NotificationChannel.SMS, 'Title', 'Body');
      expect(response.status).toBe(NotificationStatus.DEAD);
      expect(response.nextAttemptAt).toBeNull();
      expect(notificationProvider.sendSms).not.toHaveBeenCalled();
    });

    it('does not call an external provider for in-app delivery', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        ...pending,channel:NotificationChannel.IN_APP,
      });
      const response = await service.send('user-1',NotificationChannel.IN_APP,'Title','Body');
      expect(response.status).toBe(NotificationStatus.SENT);
      expect(notificationProvider.sendSms).not.toHaveBeenCalled();
      expect(notificationProvider.sendWhatsApp).not.toHaveBeenCalled();
      expect(notificationProvider.sendEmail).not.toHaveBeenCalled();
      expect(notificationProvider.sendPush).not.toHaveBeenCalled();
    });

    it('does not duplicate delivery when another worker has the database lease', async () => {
      prisma.notification.updateMany.mockResolvedValue({count:0});
      const response = await service.send('user-1', NotificationChannel.SMS, 'Title', 'Body');
      expect(response.status).toBe(NotificationStatus.PENDING);
      expect(notificationProvider.sendSms).not.toHaveBeenCalled();
    });

    it('retries due delivery attempts after a transient failure', async () => {
      prisma.notification.findMany.mockResolvedValue([pending]);
      const summary = await service.retryDue();
      expect(summary).toEqual({examined:1,sent:1,dead:0});
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where:expect.objectContaining({id:'notif-1'}),
      }));
    });

    it('dead-letters after five failed attempts', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        ...pending,attemptCount:4,channel:NotificationChannel.PUSH,
      });
      notificationProvider.sendPush.mockRejectedValue(new Error('unavailable'));
      const response = await service.send('user-1',NotificationChannel.PUSH,'Title','Body');
      expect(response.status).toBe(NotificationStatus.DEAD);
      expect(response.attemptCount).toBe(5);
    });
  });

  describe('listAsUser', () => {
    it('lists all notifications when unreadOnly is not set', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.listAsUser('user-1', undefined);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: undefined },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters to unread only when requested', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.listAsUser('user-1', true);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('markReadAsUser', () => {
    it('marks an unread notification as read', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        readAt: null,
      });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        readAt: new Date(),
      });

      await service.markReadAsUser('user-1', 'notif-1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { readAt: expect.any(Date) },
      });
    });

    it('is a no-op for an already-read notification', async () => {
      const alreadyRead = {
        id: 'notif-1',
        userId: 'user-1',
        readAt: new Date(),
      };
      prisma.notification.findUnique.mockResolvedValue(alreadyRead);

      const result = await service.markReadAsUser('user-1', 'notif-1');

      expect(prisma.notification.update).not.toHaveBeenCalled();
      expect(result).toBe(alreadyRead);
    });

    it("throws NotFoundException for another user's notification", async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'someone-else',
      });

      await expect(service.markReadAsUser('user-1', 'notif-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the notification does not exist', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markReadAsUser('user-1', 'notif-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
