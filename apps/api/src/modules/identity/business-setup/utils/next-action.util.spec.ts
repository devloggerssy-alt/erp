import { selectNextAction } from './next-action.util';
import type { SetupTaskType, SetupTaskStatus } from '@devloggers/db-prisma';

function task(type: SetupTaskType, status: SetupTaskStatus, dependencies: SetupTaskType[] = [], required = true) {
    return { type, status, dependencies, required };
}

describe('selectNextAction', () => {
    it('returns the first READY required task in canonical order', () => {
        const action = selectNextAction([
            task('CURRENCIES', 'COMPLETED'),
            task('BANK_ACCOUNTS', 'READY'),
            task('CHART_OF_ACCOUNTS', 'READY'),
        ]);
        expect(action).toEqual({ type: 'CHART_OF_ACCOUNTS', reason: 'READY', blockedBy: [] });
    });

    it('returns the first blocked task with its unmet dependencies when nothing is READY', () => {
        const action = selectNextAction([
            task('FINANCIAL_MAPPINGS', 'BLOCKED', ['CHART_OF_ACCOUNTS']),
            task('CASHBOXES', 'BLOCKED', ['CURRENCIES']),
        ]);
        expect(action).toEqual({
            type: 'FINANCIAL_MAPPINGS',
            reason: 'WAITING_FOR_DEPENDENCIES',
            blockedBy: ['CHART_OF_ACCOUNTS'],
        });
    });

    it('reports dependencies that are SKIPPED as satisfied', () => {
        const action = selectNextAction([
            task('CURRENCIES', 'SKIPPED'),
            task('CASHBOXES', 'BLOCKED', ['CURRENCIES']),
        ]);
        expect(action?.blockedBy).toEqual([]);
    });

    it('returns null when every required task is terminal', () => {
        const action = selectNextAction([
            task('CURRENCIES', 'COMPLETED'),
            task('OPENING_INVENTORY', 'SKIPPED'),
            task('WAREHOUSES', 'SKIPPED', [], false),
        ]);
        expect(action).toBeNull();
    });

    it('ignores not-required tasks entirely', () => {
        const action = selectNextAction([task('CURRENCIES', 'COMPLETED'), task('WAREHOUSES', 'READY', [], false)]);
        expect(action).toBeNull();
    });
});
