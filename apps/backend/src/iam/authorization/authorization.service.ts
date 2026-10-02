import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SUPER_ADMIN_ROLE } from './system-roles';

/**
 * Computes a user's effective permission set from their active (non-revoked)
 * UserRoleAssignments and answers hasPermission() checks for PermissionsGuard.
 *
 * Scope note (known gap, see docs/modules/IAM_IMPLEMENTATION.md §8): this
 * checks "does the user hold this permission through *any* active
 * assignment", not "...within the specific resource's scope" — no module
 * with real scoped resources (Geography, Provider Organization, ...) exists
 * yet to check a scope *against*. PLATFORM-scoped assignments already grant
 * everywhere; scope-aware guard-time checks (e.g. "only within this
 * taluk") are added when a real scoped resource exists to compare against.
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermissionKeys(userId: string): Promise<Set<string>> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, revokedAt: null },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    });

    if (
      assignments.some(
        (a) => a.role.isSystem && a.role.name === SUPER_ADMIN_ROLE,
      )
    ) {
      return new Set(['*']);
    }

    const keys = new Set<string>();
    for (const assignment of assignments) {
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
