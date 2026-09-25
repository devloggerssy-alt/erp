import { Logger } from '@nestjs/common';
import { ALL_PERMISSIONS, DEFAULT_ROLE_DEFINITIONS, DEFAULT_ROLE_PERMISSIONS } from '@devloggers/api-contracts';
import { PermissionSyncService } from './permission-sync.service';

function createPrismaMock() {
  const permission = {
    upsert: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  };
  const rolePermission = { createMany: jest.fn().mockResolvedValue({ count: 0 }) };
  const role = {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };
  const tenant = { findMany: jest.fn().mockResolvedValue([]) };
  return { permission, rolePermission, role, tenant };
}

describe('PermissionSyncService', () => {
  it('upserts the entire catalog', async () => {
    const prisma = createPrismaMock();
    const service = new PermissionSyncService(prisma as never);

    await service.syncCatalog();

    expect(prisma.permission.upsert).toHaveBeenCalledTimes(ALL_PERMISSIONS.length);
    const keys = prisma.permission.upsert.mock.calls.map((call) => call[0].where.key);
    expect(new Set(keys).size).toBe(ALL_PERMISSIONS.length);
  });

  it('grants default permissions to each tenant system role', async () => {
    const prisma = createPrismaMock();
    prisma.permission.findMany.mockResolvedValue(
      ALL_PERMISSIONS.map((key, index) => ({ id: `perm-${index}`, key })),
    );
    prisma.tenant.findMany.mockResolvedValue([{ id: 'tenant-1' }]);
    prisma.role.findMany.mockResolvedValue([
      { id: 'role-owner', name: { en: 'Owner' } },
      { id: 'role-accountant', name: { en: 'Accountant' } },
      { id: 'role-sales', name: { en: 'Sales' } },
      { id: 'role-inventory', name: { en: 'Inventory' } },
      { id: 'role-viewer', name: { en: 'Viewer' } },
      { id: 'role-custom', name: { en: 'My Custom Role' } },
    ]);

    const service = new PermissionSyncService(prisma as never);
    await service.syncDefaultRoleGrants();

    expect(prisma.rolePermission.createMany).toHaveBeenCalledTimes(5);
    const ownerCall = prisma.rolePermission.createMany.mock.calls[0][0];
    expect(ownerCall.data).toHaveLength(DEFAULT_ROLE_PERMISSIONS.Owner.length);
    const viewerCall = prisma.rolePermission.createMany.mock.calls[4][0];
    expect(viewerCall.data).toHaveLength(DEFAULT_ROLE_PERMISSIONS.Viewer.length);
    expect(ownerCall.skipDuplicates).toBe(true);
  });

  it('does not write anything when GENERATE_SPEC is set', async () => {
    const prisma = createPrismaMock();
    const previous = process.env.GENERATE_SPEC;
    process.env.GENERATE_SPEC = '1';
    try {
      const service = new PermissionSyncService(prisma as never);
      await service.onModuleInit();
      expect(prisma.permission.upsert).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.GENERATE_SPEC;
      else process.env.GENERATE_SPEC = previous;
    }
  });

  it('creates missing default system roles', async () => {
    const prisma = createPrismaMock();
    prisma.permission.findMany.mockResolvedValue([{ id: 'perm-1', key: ALL_PERMISSIONS[0] }]);
    prisma.tenant.findMany.mockResolvedValue([{ id: 'tenant-1' }]);
    prisma.role.findMany.mockResolvedValue([]);
    prisma.role.create.mockImplementation(({ data }: { data: { name: { en: string } } }) =>
      Promise.resolve({ id: `role-${data.name.en}`, name: data.name }),
    );

    const service = new PermissionSyncService(prisma as never);
    await service.syncDefaultRoleGrants();

    expect(prisma.role.create).toHaveBeenCalledTimes(Object.keys(DEFAULT_ROLE_DEFINITIONS).length);
  });

  it('skips a default role whose Arabic name is already used by a non-system role, instead of throwing', async () => {
    const prisma = createPrismaMock();
    prisma.permission.findMany.mockResolvedValue([{ id: 'perm-1', key: ALL_PERMISSIONS[0] }]);
    prisma.tenant.findMany.mockResolvedValue([{ id: 'tenant-1' }]);
    // No system roles exist yet for this tenant — but a custom (isSystem: false) role
    // already occupies the "Accountant" role's Arabic name at the DB level.
    prisma.role.findMany.mockResolvedValue([]);
    prisma.role.count.mockImplementation(({ where }: { where: { name: { equals: string } } }) =>
      Promise.resolve(where.name.equals === DEFAULT_ROLE_DEFINITIONS.Accountant.name.ar ? 1 : 0),
    );
    prisma.role.create.mockImplementation(({ data }: { data: { name: { en: string } } }) =>
      Promise.resolve({ id: `role-${data.name.en}`, name: data.name }),
    );
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const service = new PermissionSyncService(prisma as never);
    await expect(service.syncDefaultRoleGrants()).resolves.not.toThrow();

    const createdNames = prisma.role.create.mock.calls.map((call) => call[0].data.name.en);
    expect(createdNames).not.toContain('Accountant');
    expect(createdNames).toHaveLength(Object.keys(DEFAULT_ROLE_DEFINITIONS).length - 1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Accountant'));

    warnSpy.mockRestore();
  });
});
