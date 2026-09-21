import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_METADATA_KEY } from '@devloggers/backend-core';
import { PermissionsGuard } from './permissions.guard';
import type { PermissionResolverService } from '../permissions/permission-resolver.service';

function contextFor(
  user?: { id: string; tenantId: string; email: string },
  handler: (...args: never[]) => unknown = function handler() {},
) {
  return {
    getHandler: () => handler,
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

function createGuard(permissions: string[], required?: string[]) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  const resolver = {
    resolve: jest.fn().mockResolvedValue(new Set(permissions)),
  } as unknown as PermissionResolverService;
  return new PermissionsGuard(reflector, resolver);
}

describe('PermissionsGuard', () => {
  it('denies when the route has no permission metadata (fail closed)', async () => {
    const guard = createGuard([], undefined);
    await expect(guard.canActivate(contextFor({ id: 'u1', tenantId: 't1', email: 'u@test' }))).rejects.toThrow(
      new ForbiddenException('Missing permission metadata for this route'),
    );
  });

  it('denies when the route metadata is an empty list', async () => {
    const guard = createGuard([], []);
    await expect(guard.canActivate(contextFor({ id: 'u1', tenantId: 't1', email: 'u@test' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies when there is no authenticated user', async () => {
    const guard = createGuard([], [PERMISSION_METADATA_KEY]);
    await expect(guard.canActivate(contextFor(undefined))).rejects.toThrow(
      new ForbiddenException('Authenticated user is required for permission checks'),
    );
  });

  it('denies when the user lacks the required permission', async () => {
    const guard = createGuard(['units.view'], ['units.create']);
    await expect(
      guard.canActivate(contextFor({ id: 'u1', tenantId: 't1', email: 'u@test' })),
    ).rejects.toThrow(new ForbiddenException('Missing permission: units.create'));
  });

  it('allows when every required permission is granted', async () => {
    const guard = createGuard(['units.view', 'units.create'], ['units.create']);
    await expect(
      guard.canActivate(contextFor({ id: 'u1', tenantId: 't1', email: 'u@test' })),
    ).resolves.toBe(true);
  });
});
