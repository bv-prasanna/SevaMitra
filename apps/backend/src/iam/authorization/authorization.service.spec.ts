import { ScopeType } from '@prisma/client';
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
          scopeType: ScopeType.PLATFORM,

          role: {
            isSystem: false,
            name: 'Role A',
            rolePermissions: [{ permission: { key: 'iam.role.view' } }],
          },
        },
        {
          scopeType: ScopeType.PLATFORM,

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
        where: { userId: 'user-1', revokedAt: null, scopeType: ScopeType.PLATFORM },
        include: {
          role: {
            include: { rolePermissions: { include: { permission: true } } },
          },
        },
      });
    });


    it.each([ScopeType.GEOGRAPHY, ScopeType.ORGANIZATION, ScopeType.PROVIDER_GROUP, ScopeType.PROVIDER_COMPANY, ScopeType.OPERATIONAL_AREA])(
      'never treats scoped %s permissions as global',
      async scopeType => {
        prisma.userRoleAssignment.findMany.mockResolvedValue([{
          scopeType,
          scopeId: 'other-area',
          role: { name: 'OPERATIONS_MANAGER', isSystem: false,
            rolePermissions: [{ permission: { key: 'provider.onboarding.review' } }] },
        }]);
        await expect(service.getEffectivePermissionKeys('user-1')).resolves.toEqual(new Set());
        await expect(service.hasPermission('user-1', 'provider.onboarding.review')).resolves.toBe(false);
      },
    );

    it('never grants wildcard for a SUPER_ADMIN scoped to one area', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([{
        scopeType: ScopeType.GEOGRAPHY,
        scopeId: 'town-1',
        role: { isSystem: true, name: 'SUPER_ADMIN', rolePermissions: [] },
      }]);
      await expect(service.getEffectivePermissionKeys('user-1')).resolves.toEqual(new Set());
    });

    it('ignores scoped grants but retains a separate global grant', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([
        {scopeType: ScopeType.GEOGRAPHY, role:{name:'Regional',isSystem:false,rolePermissions:[{permission:{key:'iam.role.manage'}}]}},
        {scopeType: ScopeType.PLATFORM, role:{name:'Viewer',isSystem:false,rolePermissions:[{permission:{key:'iam.role.view'}}]}},
      ]);
      await expect(service.getEffectivePermissionKeys('user-1')).resolves.toEqual(new Set(['iam.role.view']));
    });

    it('does not authorize a user with revoked or scoped assignments', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([]);
      await expect(service.hasPermission('user-1','agent.review')).resolves.toBe(false);
      expect(prisma.userRoleAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {userId:'user-1',revokedAt:null,scopeType:ScopeType.PLATFORM},
      }));
    });

    it('returns a wildcard for a SUPER_ADMIN system role assignment', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([
        {
          scopeType: ScopeType.PLATFORM,

          role: { isSystem: true, name: 'SUPER_ADMIN', rolePermissions: [] },
        },
      ]);

      const keys = await service.getEffectivePermissionKeys('user-1');

      expect(keys).toEqual(new Set(['*']));
    });

    it('does not bypass for a non-system role merely named SUPER_ADMIN', async () => {
      prisma.userRoleAssignment.findMany.mockResolvedValue([
        {
          scopeType: ScopeType.PLATFORM,

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
        { scopeType: ScopeType.PLATFORM,
 role: { isSystem: true, name: 'SUPER_ADMIN', rolePermissions: [] } },
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
