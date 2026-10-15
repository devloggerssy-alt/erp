import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from '../services/onboarding.service';

const user = { id: 'user-1', tenantId: 'tenant-1', email: 'a@b.c', permissions: [] };

describe('OnboardingController success envelope', () => {
    const service = {
        stepCompany: jest.fn(),
        stepChartOfAccounts: jest.fn(),
        complete: jest.fn(),
    };
    const controller = new OnboardingController(service as unknown as OnboardingService);

    it('wraps a no-payload step in the shared envelope', async () => {
        service.stepCompany.mockResolvedValue(undefined);

        await expect(controller.stepCompany(user, { name: 'Acme', locale: 'en', timezone: 'UTC', dateFormat: 'YYYY-MM-DD', numberFormat: '1,234.56' })).resolves.toEqual({
            status: 'success',
            message: 'Company step saved',
            data: { accepted: true },
            meta: undefined,
        });
    });

    it('wraps the chart-of-accounts map in the shared envelope', async () => {
        service.stepChartOfAccounts.mockResolvedValue({ '1000': 'acct-1' });

        await expect(controller.stepChartOfAccounts(user)).resolves.toEqual({
            status: 'success',
            message: 'Chart of accounts bootstrapped',
            data: { codeToId: { '1000': 'acct-1' } },
            meta: undefined,
        });
    });

    it('wraps completion in the shared envelope', async () => {
        service.complete.mockResolvedValue(undefined);

        await expect(controller.complete(user)).resolves.toEqual({
            status: 'success',
            message: 'Onboarding completed',
            data: { accepted: true },
            meta: undefined,
        });
    });
});
