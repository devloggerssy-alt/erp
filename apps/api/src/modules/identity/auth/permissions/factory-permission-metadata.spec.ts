import { Reflector } from '@nestjs/core';
import { PERMISSION_METADATA_KEY } from '@devloggers/backend-core';
import { UnitsController } from '@/modules/catalog/units/controllers/units.controller';
import { TenantsController } from '@/modules/identity/tenants/tenants.controller';

const reflector = new Reflector();

function requiredFor(controller: Function, method: string): unknown {
  const handler = (controller.prototype as Record<string, unknown>)[method] as (...args: never[]) => unknown;
  return reflector.getAllAndOverride(PERMISSION_METADATA_KEY, [handler, controller]);
}

describe('route permission metadata', () => {
  it('factory CRUD routes carry verb permissions', () => {
    expect(requiredFor(UnitsController, 'list')).toEqual(['units.view']);
    expect(requiredFor(UnitsController, 'show')).toEqual(['units.view']);
    expect(requiredFor(UnitsController, 'create')).toEqual(['units.create']);
    expect(requiredFor(UnitsController, 'update')).toEqual(['units.update']);
    expect(requiredFor(UnitsController, 'delete')).toEqual(['units.delete']);
    expect(requiredFor(UnitsController, 'bulkDelete')).toEqual(['units.delete']);
    expect(requiredFor(UnitsController, 'bulkUpdate')).toEqual(['units.update']);
  });

  it('method-level guarded controllers carry permissions', () => {
    expect(requiredFor(TenantsController, 'getCurrent')).toEqual(['settings.manage']);
    expect(requiredFor(TenantsController, 'updateCurrent')).toEqual(['settings.manage']);
  });
});
