import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthorizationService } from './authorization.service';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import type { AuthenticatedUser } from '../../auth/token/jwt-payload.interface';

/**
 * Apply after JwtAuthGuard (order matters — this reads req.user, which only
 * JwtAuthGuard populates). Reads the permission keys set by
 * @RequirePermissions() and checks all of them via AuthorizationService.
 * No metadata on the route -> allowed (guard is opt-in per endpoint).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new UnauthorizedException();
    }

    const granted = await this.authorization.getEffectivePermissionKeys(
      user.id,
    );
    const hasAll =
      granted.has('*') || required.every((key) =>
        granted.has(key) ||
        // Keep pre-existing 'manage' grants effective during granular migration.
        // Newly created roles may grant view/add/edit/delete separately.
        (['add','edit','delete'].includes(key.split('.').at(-1) ?? '') &&
          granted.has(key.replace(/\.(add|edit|delete)$/, '.manage'))),
      );

    if (!hasAll) {
      throw new ForbiddenException('Missing required permission');
    }

    return true;
  }
}
