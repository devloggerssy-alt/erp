import { PartyPresenter } from './party.presenter';
import type { Party } from '@devloggers/db-prisma';

function makeParty(overrides: Partial<Party> = {}): Party {
    return {
        id: 'party-1',
        tenantId: 'tenant-1',
        code: 'SUP-1',
        name: 'شركة النور',
        type: 'SUPPLIER',
        phone: null,
        email: null,
        address: null,
        isActive: true,
        receivableAccountId: 'cce03705-f7b6-4da6-959a-630d4870a492',
        payableAccountId: 'd914a93c-0cda-4075-8be5-a356b5e51d2d',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        ...overrides,
    } as unknown as Party;
}

describe('PartyPresenter.toResponse', () => {
    const presenter = new PartyPresenter();

    it('carries the receivable and payable account overrides the edit form reads', () => {
        const response = presenter.toResponse(makeParty());

        expect(response.receivableAccountId).toBe('cce03705-f7b6-4da6-959a-630d4870a492');
        expect(response.payableAccountId).toBe('d914a93c-0cda-4075-8be5-a356b5e51d2d');
    });

    it('serializes a missing override as null so the form falls back to the tenant default', () => {
        const response = presenter.toResponse(
            makeParty({ receivableAccountId: null, payableAccountId: null }),
        );

        expect(response.receivableAccountId).toBeNull();
        expect(response.payableAccountId).toBeNull();
    });
});
