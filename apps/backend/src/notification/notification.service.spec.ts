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

  describe('send', () => {
    it('dispatches SMS via the provider and records SENT', async () => {
      prisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        status: NotificationStatus.SENT,
      });

      await service.send('user-1', NotificationChannel.SMS, 'Title', 'Body');

      expect(notificationProvider.sendSms).toHaveBeenCalledWith(
        '+919876543210',
        'Body',
      );
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          channel: NotificationChannel.SMS,
          status: NotificationStatus.SENT,
          failureReason: null,
        }),
      });
    });

    it('dispatches EMAIL via the provider using the subject/body pairing', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.send(
        'user-1',
        NotificationChannel.EMAIL,
        'Subject',
        'Body',
      );

      expect(notificationProvider.sendEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Subject',
        'Body',
      );
    });

    it('never calls the gateway for IN_APP', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      await service.send('user-1', NotificationChannel.IN_APP, 'Title', 'Body');

      expect(notificationProvider.sendSms).not.toHaveBeenCalled();
      expect(notificationProvider.sendWhatsApp).not.toHaveBeenCalled();
      expect(notificationProvider.sendPush).not.toHaveBeenCalled();
      expect(notificationProvider.sendEmail).not.toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: NotificationStatus.SENT }),
      });
    });

    it('records FAILED with a reason when the recipient has no phone number for SMS', async () => {
      authService.getPublicUserByIdOrThrow.mockResolvedValue({
        ...recipient,
        phoneNumber: null,
      });
      prisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        status: NotificationStatus.FAILED,
      });

      await service.send('user-1', NotificationChannel.SMS, 'Title', 'Body');

      expect(notificationProvider.sendSms).not.toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
          failureReason: 'Recipient has no phone number on file',
        }),
      });
    });

    it('records FAILED when the provider itself throws', async () => {
      notificationProvider.sendPush.mockRejectedValue(
        new Error('gateway unreachable'),
      );
      prisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        status: NotificationStatus.FAILED,
      });

      await service.send('user-1', NotificationChannel.PUSH, 'Title', 'Body');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
          failureReason: 'gateway unreachable',
        }),
      });
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
