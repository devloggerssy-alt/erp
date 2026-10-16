import type { LocalizedString } from '@devloggers/api-contracts';
import { PaymentPresenter } from './payment.presenter';

type PaymentEntity = Parameters<PaymentPresenter['toResponse']>[0];

function makePresenter(locale: 'en' | 'ar' = 'en'): PaymentPresenter {
    return new PaymentPresenter({
        resolve: (field: LocalizedString | null | undefined, fallback = '') =>
            field?.[locale] ?? field?.ar ?? fallback,
    } as never);
}

function makePayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
    return {
        id: 'p1',
        tenantId: 't1',
        number: 'PAY-1',
        type: 'RECEIPT',
        date: new Date('2026-02-03T10:00:00.000Z'),
        cashboxId: 'cb1',
        partyId: 'pa1',
        currencyId: 'cur1',
        exchangeRate: 1,
        fiscalPeriodId: 'fp1',
        amount: 100,
        allocatedAmount: 0,
        unallocatedAmount: 100,
        status: 'POSTED',
        notes: null,
        postedAt: null,
        cancelledAt: null,
        createdBy: 'u1',
        createdAt: new Date('2026-02-03T10:00:00.000Z'),
        updatedAt: new Date('2026-02-03T10:00:00.000Z'),
        ...overrides,
    } as unknown as PaymentEntity;
}

describe('PaymentPresenter.toResponse', () => {
    it('resolves LocalizedString cashbox name and currency symbol for the request locale', () => {
        const entity = makePayment({
            cashbox: { code: 'MAIN', name: { en: 'Main Cashbox', ar: 'الصندوق الرئيسي' } },
            party: { name: 'Acme Trading' },
            currency: { code: 'USD', symbol: { en: '$', ar: 'د.أ' } },
        });

        const dto = makePresenter('en').toResponse(entity);

        expect(dto.cashboxName).toBe('Main Cashbox');
        expect(dto.currencySymbol).toBe('$');
        expect(dto.partyName).toBe('Acme Trading');
    });

    it('falls back to Arabic when the requested locale is missing, and nulls empty symbols', () => {
        const entity = makePayment({
            cashbox: { name: { ar: 'الصندوق الرئيسي' } },
            currency: { code: 'SYP', symbol: null },
        });

        const dto = makePresenter('en').toResponse(entity);

        expect(dto.cashboxName).toBe('الصندوق الرئيسي');
        expect(dto.currencySymbol).toBeUndefined();
    });

    it('leaves relational names undefined when relations are not loaded', () => {
        const dto = makePresenter('en').toResponse(makePayment());

        expect(dto.cashboxName).toBeUndefined();
        expect(dto.currencySymbol).toBeUndefined();
        expect(dto.partyName).toBeUndefined();
    });
});
