import { Injectable } from '@nestjs/common';
import { ScopeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SUPER_ADMIN_ROLE } from './system-roles';

/**
 * Computes PLATFORM-wide permissions only.
 * The generic PermissionsGuard does not know which resource a request targets;
 * accepting an area/company-scoped assignment here would grant access to
 * other areas. Scoped grants must be verified explicitly by a resource-aware
 * authorization service before such routes are introduced. Fail closed.
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermissionKeys(userId: string): Promise<Set<string>> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, revokedAt: null, scopeType: ScopeType.PLATFORM },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    // Defense in depth: do not trust an unexpectedly broad query result.
    const platformAssignments = assignments.filter(a => a.scopeType === ScopeType.PLATFORM);
    if (
      platformAssignments.some(
        (a) => a.role.isSystem && a.role.name === SUPER_ADMIN_ROLE,
      )
    ) {
      return new Set(['*']);
    }

    const keys = new Set<string>();
    for (const assignment of platformAssignments) {
      for (const rp of assignment.role.rolePermissions) {
        keys.add(rp.permission.key);
      }
    }
    return keys;
  }

  async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const keys = await this.getEffectivePermissionKeys(userId);
    return keys.has('*') || keys.has(permissionKey);
  }
}
