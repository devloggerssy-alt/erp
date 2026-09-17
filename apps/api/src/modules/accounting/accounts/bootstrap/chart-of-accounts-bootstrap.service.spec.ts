import { ChartOfAccountsBootstrapService } from './chart-of-accounts-bootstrap.service';
import { CHART_OF_ACCOUNTS_TEMPLATE } from './chart-of-accounts-template';

function build() {
    const created: Array<{ code: string; parentId?: string; isPostable?: boolean; isContra?: boolean }> = [];
    const accountsService = {
        list: jest.fn().mockResolvedValue({ data: [], total: 0 }),
        create: jest.fn().mockImplementation((_tenantId: string, dto: Record<string, unknown>) => {
            const id = `id-${dto.code as string}`;
            created.push({ code: dto.code as string, parentId: dto.parentId as string | undefined, isPostable: dto.isPostable as boolean | undefined, isContra: dto.isContra as boolean | undefined });
            return Promise.resolve({ id, code: dto.code });
        }),
    };
    const service = new ChartOfAccountsBootstrapService(accountsService as never);
    return { service, accountsService, created };
}

describe('ChartOfAccountsBootstrapService', () => {
    it('creates every template account exactly once, wiring parentId from the code map', async () => {
        const { service, created } = build();
        const codeToId = await service.bootstrapDefaultTemplate('tenant-1');

        expect(created).toHaveLength(CHART_OF_ACCOUNTS_TEMPLATE.length);
        expect(Object.keys(codeToId)).toHaveLength(CHART_OF_ACCOUNTS_TEMPLATE.length);
        const child = created.find((c) => c.code === '1110');
        expect(child?.parentId).toBe(codeToId['1100']);
    });

    it('marks parent codes non-postable and leaf codes postable', async () => {
        const { service, created } = build();
        await service.bootstrapDefaultTemplate('tenant-1');

        const parent = created.find((c) => c.code === '1100');
        const leaf = created.find((c) => c.code === '1110');
        expect(parent?.isPostable).toBe(false);
        expect(leaf?.isPostable).toBe(true);
    });

    it('flags code 1220 (Accumulated Depreciation) as contra', async () => {
        const { service, created } = build();
        await service.bootstrapDefaultTemplate('tenant-1');

        expect(created.find((c) => c.code === '1220')?.isContra).toBe(true);
    });

    it('is idempotent — skips codes that already exist and still returns the full map', async () => {
        const { service, accountsService, created } = build();
        accountsService.list.mockResolvedValue({
            data: [{ id: 'existing-1000', code: '1000' }],
            total: 1,
        });

        const codeToId = await service.bootstrapDefaultTemplate('tenant-1');

        expect(created.find((c) => c.code === '1000')).toBeUndefined();
        expect(codeToId['1000']).toBe('existing-1000');
        expect(created).toHaveLength(CHART_OF_ACCOUNTS_TEMPLATE.length - 1);
    });
});
