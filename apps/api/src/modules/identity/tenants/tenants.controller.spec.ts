import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantResponseDto } from './dto';

const user = { id: 'user-1', tenantId: 'tenant-1', email: 'a@b.c', permissions: [] };

describe('TenantsController success envelope', () => {
    const tenant = Object.assign(new TenantResponseDto(), {
        id: 'tenant-1',
        name: 'Acme',
        slug: 'acme',
    });
    const service = {
        findCurrent: jest.fn().mockResolvedValue(tenant),
        updateCurrent: jest.fn().mockResolvedValue(tenant),
    };
    const controller = new TenantsController(service as unknown as TenantsService);

    it('returns the current tenant inside the shared envelope', async () => {
        await expect(controller.getCurrent(user)).resolves.toEqual({
            status: 'success',
            message: 'Current tenant',
            data: tenant,
            meta: undefined,
        });
    });

    it('returns the updated tenant inside the shared envelope', async () => {
        await expect(controller.updateCurrent(user, { name: 'Acme' })).resolves.toEqual({
            status: 'success',
            message: 'Tenant updated',
            data: tenant,
            meta: undefined,
        });
    });
});
