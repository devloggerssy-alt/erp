import { assertFiscalPeriodOpen } from './assert-period-open';

describe('assertFiscalPeriodOpen', () => {
    it('passes for an OPEN period', () => {
        expect(() => assertFiscalPeriodOpen('OPEN')).not.toThrow();
    });
    it('throws for a CLOSED period', () => {
        expect(() => assertFiscalPeriodOpen('CLOSED')).toThrow(/closed/i);
    });
    it('throws for a LOCKED period', () => {
        expect(() => assertFiscalPeriodOpen('LOCKED')).toThrow(/locked/i);
    });
    it('throws for a missing period', () => {
        expect(() => assertFiscalPeriodOpen(null)).toThrow(/OPEN/);
    });
});
