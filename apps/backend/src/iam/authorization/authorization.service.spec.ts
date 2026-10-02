import { AuthorizationService } from './authorization.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('AuthorizationService', () => {
  let prisma: { userRoleAssignment: { findMany: jest.Mock } };
  let service: AuthorizationService;

  beforeEach(() => {
    prisma = { userRoleAssignment: { findMany: jest.fn() } };
    service = new AuthorizationService(prisma as unknown as PrismaService);
  });

  describe('getEffectivePermissionKeys', () => {
    it('unions permission keys across all active assignments', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([
        {
          role: {
            isSystem: false,
            name: 'Role A',
            rolePermissions: [{ permission: { key: 'iam.role.view' } }],
          },
        },
        {
          role: {
            isSystem: false,
            name: 'Role B',
            rolePermissions: [{ permission: { key: 'iam.assignment.view' } }],
          },
        },
      ]);

      const keys = await service.getEffectivePermissionKeys('user-1');

      expect(keys).toEqual(new Set(['iam.role.view', 'iam.assignment.view']));
      expect(prisma.userRoleAssignment.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        include: {
          role: {
            include: { rolePermissions: { include: { permission: true } } },
          },
        },
      });
    });

    it('returns a wildcard for a SUPER_ADMIN system role assignment', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([
        {
          role: { isSystem: true, name: 'SUPER_ADMIN', rolePermissions: [] },
        },
      ]);

      const keys = await service.getEffectivePermissionKeys('user-1');

      expect(keys).toEqual(new Set(['*']));
    });

    it('does not bypass for a non-system role merely named SUPER_ADMIN', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([
        {
          role: {
            isSystem: false,
            name: 'SUPER_ADMIN',
            rolePermissions: [{ permission: { key: 'iam.role.view' } }],
          },
        },
      ]);

      const keys = await service.getEffectivePermissionKeys('user-1');

      expect(keys).toEqual(new Set(['iam.role.view']));
    });
  });

  describe('hasPermission', () => {
    it('returns true when the wildcard is present', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([
        { role: { isSystem: true, name: 'SUPER_ADMIN', rolePermissions: [] } },
      ]);

      await expect(
        service.hasPermission('user-1', 'anything.at.all'),
      ).resolves.toBe(true);
    });

    it('returns false when the key is not granted', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([]);

      await expect(
        service.hasPermission('user-1', 'iam.role.manage'),
      ).resolves.toBe(false);
    });
  });
});
