import { AuditService } from './audit.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let prisma: { auditLog: { create: jest.Mock; findMany: jest.Mock } };
  let service: AuditService;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new AuditService(prisma as unknown as PrismaService);
  });

  describe('record', () => {
    it('writes the entry as given', async () => {
      const entry = {
        actorUserId: 'user-1',
        httpMethod: 'POST',
        routePath: '/bookings/me',
        entityId: 'booking-1',
        statusCode: 201,
        ipAddress: '127.0.0.1',
      };
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1', ...entry });

      const result = await service.record(entry);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: entry });
      expect(result).toEqual({ id: 'log-1', ...entry });
    });
  });

  describe('list', () => {
    it('lists newest first, capped, with no actor filter', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.list(undefined);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { actorUserId: undefined },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('filters by actorUserId when given', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.list('user-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { actorUserId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });
  });
});
