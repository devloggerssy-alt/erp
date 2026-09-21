import { PermissionResolverService } from './permission-resolver.service';

function createPrismaMock() {
  return { appUser: { findFirst: jest.fn() } };
}

function userWith(permissionKeys: string[]) {
  return {
    userRoles: permissionKeys.map((key) => ({
      role: { rolePermissions: [{ permission: { key } }] },
    })),
  };
}

describe('PermissionResolverService', () => {
  it('unions permission keys across all roles', async () => {
    const prisma = createPrismaMock();
    prisma.appUser.findFirst.mockResolvedValue(userWith(['units.view', 'units.create', 'roles.view']));
    const service = new PermissionResolverService(prisma as never);

    const resolved = await service.resolve('user-1', 'tenant-1');

    expect([...resolved].sort()).toEqual(['roles.view', 'units.create', 'units.view']);
  });

  it('returns an empty set for a missing or inactive user', async () => {
    const prisma = createPrismaMock();
    prisma.appUser.findFirst.mockResolvedValue(null);
    const service = new PermissionResolverService(prisma as never);

    const resolved = await service.resolve('user-1', 'tenant-1');

    expect(resolved.size).toBe(0);
  });

  it('caches within the TTL window', async () => {
    const prisma = createPrismaMock();
    prisma.appUser.findFirst.mockResolvedValue(userWith(['units.view']));
    const service = new PermissionResolverService(prisma as never);

    await service.resolve('user-1', 'tenant-1');
    await service.resolve('user-1', 'tenant-1');

    expect(prisma.appUser.findFirst).toHaveBeenCalledTimes(1);
  });

  it('invalidateUser drops only that user cache entry', async () => {
    const prisma = createPrismaMock();
    prisma.appUser.findFirst.mockResolvedValue(userWith(['units.view']));
    const service = new PermissionResolverService(prisma as never);

    await service.resolve('user-1', 'tenant-1');
    await service.resolve('user-2', 'tenant-1');
    service.invalidateUser('user-1');
    await service.resolve('user-1', 'tenant-1');
    await service.resolve('user-2', 'tenant-1');

    expect(prisma.appUser.findFirst).toHaveBeenCalledTimes(3);
  });

  it('invalidateTenant drops every user in the tenant', async () => {
    const prisma = createPrismaMock();
    prisma.appUser.findFirst.mockResolvedValue(userWith(['units.view']));
    const service = new PermissionResolverService(prisma as never);

    await service.resolve('user-1', 'tenant-1');
    await service.resolve('user-2', 'tenant-2');
    service.invalidateTenant('tenant-1');
    await service.resolve('user-1', 'tenant-1');
    await service.resolve('user-2', 'tenant-2');

    expect(prisma.appUser.findFirst).toHaveBeenCalledTimes(3);
  });
});
