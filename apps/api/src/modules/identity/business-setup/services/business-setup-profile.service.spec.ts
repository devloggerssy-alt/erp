import { BusinessSetupProfileService } from './business-setup-profile.service';

describe('BusinessSetupProfileService', () => {
    it('returns the all-enabled default when no profile has been saved', async () => {
        const prisma = { tenant: { findUnique: jest.fn().mockResolvedValue({ businessSetupProfile: null }), update: jest.fn() } };
        const service = new BusinessSetupProfileService(prisma as never);
        expect(await service.getProfile('t1')).toEqual({ inventory: true, sales: true, purchasing: true, accounting: true });
    });

    it('merges a partially-saved profile over the defaults', async () => {
        const prisma = { tenant: { findUnique: jest.fn().mockResolvedValue({ businessSetupProfile: { inventory: false } }), update: jest.fn() } };
        const service = new BusinessSetupProfileService(prisma as never);
        expect(await service.getProfile('t1')).toEqual({ inventory: false, sales: true, purchasing: true, accounting: true });
    });

    it('persists the full profile object via tenant.update', async () => {
        const prisma = { tenant: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) } };
        const service = new BusinessSetupProfileService(prisma as never);
        await service.setProfile('t1', { inventory: false, sales: true, purchasing: false, accounting: true });
        expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { businessSetupProfile: { inventory: false, sales: true, purchasing: false, accounting: true } } });
    });
});
