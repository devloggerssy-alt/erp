import { OnboardingService } from './onboarding.service';

function buildDeps() {
    const prisma = {
        tenant: {
            findUnique: jest.fn().mockResolvedValue({ onboardingCompletedAt: null }),
            update: jest.fn().mockResolvedValue({}),
        },
    } as any;
    const unitsService = { createDefaults: jest.fn().mockResolvedValue(7) } as any;

    const service = new OnboardingService(
        prisma,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        unitsService,
    );

    return { service, prisma, unitsService };
}

describe('OnboardingService.complete', () => {
    it('bootstraps default units before marking onboarding complete', async () => {
        const { service, prisma, unitsService } = buildDeps();

        await service.complete('tenant-1');

        expect(unitsService.createDefaults).toHaveBeenCalledWith('tenant-1');
        expect(unitsService.createDefaults.mock.invocationCallOrder[0]).toBeLessThan(
            prisma.tenant.update.mock.invocationCallOrder[0],
        );
        expect(prisma.tenant.update).toHaveBeenCalledWith({
            where: { id: 'tenant-1' },
            data: { onboardingCompletedAt: expect.any(Date), onboardingStep: 6 },
        });
    });

    it('leaves onboarding incomplete when the unit bootstrap fails', async () => {
        const { service, prisma, unitsService } = buildDeps();
        unitsService.createDefaults.mockRejectedValue(new Error('unit bootstrap failed'));

        await expect(service.complete('tenant-1')).rejects.toThrow('unit bootstrap failed');
        expect(prisma.tenant.update).not.toHaveBeenCalled();
    });
});
