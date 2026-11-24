import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import type { AuthorizationService } from './authorization.service';

function buildContext(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let authorization: { getEffectivePermissionKeys: jest.Mock };
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    authorization = { getEffectivePermissionKeys: jest.fn() };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      authorization as unknown as AuthorizationService,
    );
  });

  it('allows the request when no permissions are required on the route', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(
      true,
    );
    expect(authorization.getEffectivePermissionKeys).not.toHaveBeenCalled();
  });

  it('throws Unauthorized when permissions are required but there is no user', async () => {
    reflector.getAllAndOverride.mockReturnValue(['iam.role.view']);

    await expect(guard.canActivate(buildContext(undefined))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows the request when the user holds every required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      'iam.role.view',
      'iam.role.manage',
    ]);
    authorization.getEffectivePermissionKeys.mockResolvedValue(
      new Set(['iam.role.view', 'iam.role.manage']),
    );

    await expect(
      guard.canActivate(buildContext({ id: 'user-1' })),
    ).resolves.toBe(true);
  });

  it('allows the request when the wildcard is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(['iam.role.manage']);
    authorization.getEffectivePermissionKeys.mockResolvedValue(new Set(['*']));

    await expect(
      guard.canActivate(buildContext({ id: 'user-1' })),
    ).resolves.toBe(true);
  });

  it('throws Forbidden when a required permission is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue(['iam.role.manage']);
    authorization.getEffectivePermissionKeys.mockResolvedValue(
      new Set(['iam.role.view']),
    );

    await expect(
      guard.canActivate(buildContext({ id: 'user-1' })),
    ).rejects.toThrow(ForbiddenException);
  });
  it.each(['add','edit','delete'])('permits a fine-grained role.%s key independently',async(action)=>{
    reflector.getAllAndOverride.mockReturnValue(['iam.role.'+action]);
    authorization.getEffectivePermissionKeys.mockResolvedValue(new Set(['iam.role.'+action]));
    await expect(guard.canActivate(buildContext({id:'admin-1'}))).resolves.toBe(true);
  });
  it('lets existing manage-role grants continue to authorize add/edit/delete',async()=>{
    reflector.getAllAndOverride.mockReturnValue(['iam.role.delete']);
    authorization.getEffectivePermissionKeys.mockResolvedValue(new Set(['iam.role.manage']));
    await expect(guard.canActivate(buildContext({id:'admin-1'}))).resolves.toBe(true);
  });
  it('never lets role view permission modify role permissions',async()=>{
    reflector.getAllAndOverride.mockReturnValue(['iam.role.edit']);
    authorization.getEffectivePermissionKeys.mockResolvedValue(new Set(['iam.role.view']));
    await expect(guard.canActivate(buildContext({id:'viewer'}))).rejects.toThrow(ForbiddenException);
  });

});
