import { getAccountBalanceDelta } from './account-normal-side';

describe('getAccountBalanceDelta', () => {
    it('treats ASSET/EXPENSE as debit-normal', () => {
        expect(getAccountBalanceDelta('ASSET', false, 300, 100)).toBe(200);
        expect(getAccountBalanceDelta('EXPENSE', false, 50, 0)).toBe(50);
    });

    it('treats Liability/EQUITY/REVENUE as credit-normal', () => {
        expect(getAccountBalanceDelta('LIABILITY', false, 0, 500)).toBe(500);
        expect(getAccountBalanceDelta('REVENUE', false, 100, 0)).toBe(-100);
        expect(getAccountBalanceDelta('EQUITY', false, 0, 1000)).toBe(1000);
    });

    it('inverts the normal side when isContra=true', () => {
        expect(getAccountBalanceDelta('ASSET', true, 0, 400)).toBe(400);
        expect(getAccountBalanceDelta('ASSET', true, 200, 0)).toBe(-200);
        expect(getAccountBalanceDelta('REVENUE', true, 100, 0)).toBe(100);
        expect(getAccountBalanceDelta('REVENUE', true, 0, 100)).toBe(-100);
    });

    it('zero debit/credit yields zero delta', () => {
        expect(getAccountBalanceDelta('ASSET', false, 0, 0)).toBe(0);
        expect(getAccountBalanceDelta('ASSET', true, 0, 0)).toBe(0);
    });
});