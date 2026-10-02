import { NotFoundException } from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { RoleAssignmentService } from './role-assignment.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('RoleAssignmentService', () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    role: { findUnique: jest.Mock };
    userRoleAssignment: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let service: RoleAssignmentService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      role: { findUnique: jest.fn() },
      userRoleAssignment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new RoleAssignmentService(prisma as unknown as PrismaService);
  });

  describe('assign', () => {
    const dto = {
      userId: 'user-1',
      roleId: 'role-1',
      scopeType: ScopeType.PLATFORM,
    };

    it('throws NotFound when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });

      await expect(service.assign(dto, null)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFound when the role does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.assign(dto, null)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('forces scopeId to null for PLATFORM scope regardless of input', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });
      prisma.userRoleAssignment.findFirst.mockResolvedValue(null);
      prisma.userRoleAssignment.create.mockResolvedValue({
        id: 'assignment-1',
        userId: 'user-1',
        roleId: 'role-1',
        role: { name: 'Ops' },
        scopeType: ScopeType.PLATFORM,
        scopeId: null,
        assignedBy: null,
        assignedAt: new Date(),
        revokedAt: null,
      });

      await service.assign({ ...dto, scopeId: 'should-be-ignored' }, null);

      expect(prisma.userRoleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scopeId: null }),
        }),
      );
    });

    it('returns the existing assignment instead of creating a duplicate', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.role.findUnique.mockResolvedValue({ id: 'role-1' });
      const existing = {
        id: 'assignment-1',
        userId: 'user-1',
        roleId: 'role-1',
        role: { name: 'Ops' },
        scopeType: ScopeType.PLATFORM,
        scopeId: null,
        assignedBy: null,
        assignedAt: new Date(),
        revokedAt: null,
      };
      prisma.userRoleAssignment.findFirst.mockResolvedValue(existing);

      const result = await service.assign(dto, null);

      expect(result.id).toBe('assignment-1');
      expect(prisma.userRoleAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('throws NotFound for a missing assignment', async () => {
      prisma.userRoleAssignment.findUnique.mockResolvedValue(null);

      await expect(service.revoke('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('is a no-op for an already-revoked assignment', async () => {
      prisma.userRoleAssignment.findUnique.mockResolvedValue({
        id: 'assignment-1',
        revokedAt: new Date(),
      });

      await service.revoke('assignment-1');

      expect(prisma.userRoleAssignment.update).not.toHaveBeenCalled();
    });

    it('sets revokedAt for an active assignment', async () => {
      prisma.userRoleAssignment.findUnique.mockResolvedValue({
        id: 'assignment-1',
        revokedAt: null,
      });

      await service.revoke('assignment-1');

      expect(prisma.userRoleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
