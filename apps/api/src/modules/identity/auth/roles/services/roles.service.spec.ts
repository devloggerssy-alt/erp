import { ForbiddenException } from '@nestjs/common';
import { RolesService } from './roles.service';

function createMocks() {
  const repository = {
    create: jest.fn(),
    findByIdOrFail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    isNameTaken: jest.fn().mockResolvedValue(false),
    replacePermissions: jest.fn().mockResolvedValue(undefined),
  };
  const presenter = { toResponse: jest.fn((entity) => entity) };
  const emitter = { emit: jest.fn() };
  const permissions = { invalidateTenant: jest.fn() };
  return { repository, presenter, emitter, permissions };
}

function createService(mocks: ReturnType<typeof createMocks>) {
  return new RolesService(
    mocks.repository as never,
    mocks.presenter as never,
    mocks.emitter as never,
    mocks.permissions as never,
  );
}

describe('RolesService permissions', () => {
  it('strips permissionKeys from the entity payload and syncs grants on create', async () => {
    const mocks = createMocks();
    mocks.repository.create.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-1' });
    mocks.repository.findByIdOrFail.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-1', rolePermissions: [] });
    const service = createService(mocks);

    await service.create('tenant-1', { name: { ar: 'مخصص', en: 'Custom' }, permissionKeys: ['units.view'] });

    expect(mocks.repository.create).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      name: { ar: 'مخصص', en: 'Custom' },
    });
    expect(mocks.repository.replacePermissions).toHaveBeenCalledWith('role-1', ['units.view']);
    expect(mocks.permissions.invalidateTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('rejects update of a system role', async () => {
    const mocks = createMocks();
    mocks.repository.findByIdOrFail.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-1', isSystem: true });
    const service = createService(mocks);

    await expect(service.update('tenant-1', 'role-1', { name: { ar: 'x' } })).rejects.toThrow(
      new ForbiddenException('System roles cannot be modified'),
    );
  });

  it('rejects delete of a system role', async () => {
    const mocks = createMocks();
    mocks.repository.findByIdOrFail.mockResolvedValue({ id: 'role-1', tenantId: 'tenant-1', isSystem: true });
    const service = createService(mocks);

    await expect(service.delete('tenant-1', 'role-1')).rejects.toThrow(
      new ForbiddenException('System roles cannot be deleted'),
    );
  });
});
