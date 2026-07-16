import { BadRequestException } from '@nestjs/common';
import {
    assertAccountFitsSlot,
    SLOT_EXPECTATIONS,
    type AccountSlotName,
    type AccountSlotCheck,
} from './assert-account-fits-slot';

const baseAccount: AccountSlotCheck = {
    id: 'a1',
    code: '1110',
    type: 'ASSET',
    isPostable: true,
    isContra: false,
    deletedAt: null,
    isActive: true,
};

describe('assertAccountFitsSlot', () => {
    it('passes when type, postable, active, non-deleted all match', () => {
        expect(() => assertAccountFitsSlot(baseAccount, 'ASSET', 'defaultReceivable')).not.toThrow();
    });

    it('throws when type mismatches slot expectation', () => {
        expect(() =>
            assertAccountFitsSlot({ ...baseAccount, type: 'LIABILITY' }, 'ASSET', 'defaultReceivable'),
        ).toThrow(BadRequestException);
    });

    it('throws when not postable', () => {
        expect(() =>
            assertAccountFitsSlot({ ...baseAccount, isPostable: false }, 'ASSET', 'defaultReceivable'),
        ).toThrow(BadRequestException);
    });

    it('throws when soft-deleted', () => {
        expect(() =>
            assertAccountFitsSlot({ ...baseAccount, deletedAt: new Date() }, 'ASSET', 'defaultReceivable'),
        ).toThrow(BadRequestException);
    });

    it('throws when inactive', () => {
        expect(() =>
            assertAccountFitsSlot({ ...baseAccount, isActive: false }, 'ASSET', 'defaultReceivable'),
        ).toThrow(BadRequestException);
    });

    it('throws when account is null (not configured)', () => {
        expect(() => assertAccountFitsSlot(null, 'ASSET', 'defaultReceivable')).toThrow(BadRequestException);
    });
});

describe('SLOT_EXPECTATIONS table', () => {
    it('maps every slot name to an expected type', () => {
        expect(SLOT_EXPECTATIONS.defaultSales).toBe('REVENUE');
        expect(SLOT_EXPECTATIONS.defaultPurchase).toBe('EXPENSE');
        expect(SLOT_EXPECTATIONS.defaultTax).toBe('LIABILITY');
        expect(SLOT_EXPECTATIONS.defaultReceivable).toBe('ASSET');
        expect(SLOT_EXPECTATIONS.defaultPayable).toBe('LIABILITY');
        expect(SLOT_EXPECTATIONS.defaultInventory).toBe('ASSET');
        expect(SLOT_EXPECTATIONS.defaultCogs).toBe('EXPENSE');
        expect(SLOT_EXPECTATIONS.defaultInventoryAdjustment).toBe('EXPENSE');
        expect(SLOT_EXPECTATIONS.defaultOpeningEquity).toBe('EQUITY');
    });

    it('covers all nine slot names', () => {
        const names = Object.keys(SLOT_EXPECTATIONS) as AccountSlotName[];
        expect(names).toHaveLength(9);
    });
});