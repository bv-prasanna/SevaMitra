import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'iam:permissions';

/** Apply alongside @UseGuards(JwtAuthGuard, PermissionsGuard). Requires ALL listed permission keys. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
