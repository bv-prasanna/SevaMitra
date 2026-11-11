import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RoleService } from './role.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('RoleService', () => {
  let prisma: {
    role: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    permission: { findMany: jest.Mock };
    rolePermission: { deleteMany: jest.Mock; createMany: jest.Mock };
    userRoleAssignment: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: RoleService;

  beforeEach(() => {
    prisma = {
      role: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      permission: { findMany: jest.fn() },
      rolePermission: { deleteMany: jest.fn(), createMany: jest.fn() },
      userRoleAssignment: { count: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    service = new RoleService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a role with the resolved permission ids', async () => {
      prisma.permission.findMany.mockResolvedValue([
        { id: 'perm-1', key: 'iam.role.view' },
      ]);
      prisma.role.create.mockResolvedValue({
        id: 'role-1',
        name: 'Ops',
        description: null,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [{ permission: { key: 'iam.role.view' } }],
      });

      const result = await service.create({
        name: 'Ops',
        permissionKeys: ['iam.role.view'],
      });

      expect(prisma.role.create).toHaveBeenCalledWith({
        data: {
          name: 'Ops',
          description: undefined,
          rolePermissions: { create: [{ permissionId: 'perm-1' }] },
        },
        include: {
          rolePermissions: { include: { permission: true } },
        },
      });
      expect(result.permissionKeys).toEqual(['iam.role.view']);
    });

    it('rejects unknown permission keys', async () => {
      prisma.permission.findMany.mockResolvedValue([]);

      await expect(
        service.create({ name: 'Ops', permissionKeys: ['does.not.exist'] }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.role.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFound for a missing role', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'New name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects modifying a system role', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        isSystem: true,
      });

      await expect(
        service.update('role-1', { name: 'New name' }),
      ).rejects.toThrow(ConflictException);
    });

    it('replaces the permission bundle when permissionKeys is provided', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        isSystem: false,
      });
      prisma.permission.findMany.mockResolvedValue([
        { id: 'perm-2', key: 'iam.assignment.view' },
      ]);
      prisma.role.update.mockResolvedValue({
        id: 'role-1',
        name: 'Ops',
        description: null,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [{ permission: { key: 'iam.assignment.view' } }],
      });

      await service.update('role-1', {
        permissionKeys: ['iam.assignment.view'],
      });

      expect(prisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { roleId: 'role-1' },
      });
      expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
        data: [{ roleId: 'role-1', permissionId: 'perm-2' }],
      });
    });
  });

  describe('remove', () => {
    it('throws NotFound for a missing role', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects deleting a system role', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        isSystem: true,
      });

      await expect(service.remove('role-1')).rejects.toThrow(ConflictException);
    });

    it('rejects deleting a role with active assignments', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        isSystem: false,
      });
      prisma.userRoleAssignment.count.mockResolvedValue(1);

      await expect(service.remove('role-1')).rejects.toThrow(ConflictException);
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });

    it('deletes a role with no active assignments', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        isSystem: false,
      });
      prisma.userRoleAssignment.count.mockResolvedValue(0);

      await service.remove('role-1');

      expect(prisma.role.delete).toHaveBeenCalledWith({
        where: { id: 'role-1' },
      });
    });
  });
});
