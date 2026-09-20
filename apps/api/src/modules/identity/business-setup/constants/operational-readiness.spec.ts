import { computeOperationalReadiness, OPERATIONAL_READINESS_MODULES, READINESS_MODULE_TASKS } from './operational-readiness';
import type { SetupTask } from '@devloggers/db-prisma';

type ReadinessTask = { type: SetupTask['type']; status: SetupTask['status']; required: boolean };

function task(type: SetupTask['type'], status: SetupTask['status'], required = true): ReadinessTask {
    return { type, status, required };
}

const ALL_TYPES = [...new Set(Object.values(READINESS_MODULE_TASKS).flat())];

function allCompleted(overrides: ReadinessTask[] = []): ReadinessTask[] {
    const overrideByType = new Map(overrides.map((t) => [t.type, t]));
    return ALL_TYPES.map((type) => overrideByType.get(type) ?? task(type, 'COMPLETED'));
}

describe('computeOperationalReadiness', () => {
    it('marks every module ready when all required tasks are completed or skipped', () => {
        const readiness = computeOperationalReadiness(allCompleted([task('OPENING_CASH_BALANCES', 'SKIPPED')]), new Date('2026-09-21T00:00:00.000Z'));
        for (const moduleKey of OPERATIONAL_READINESS_MODULES) {
            expect(readiness.modules[moduleKey]).toEqual({ ready: true, blockers: [] });
        }
        expect(readiness.computedAt).toBe('2026-09-21T00:00:00.000Z');
    });

    it('blocks only the module(s) that own an incomplete task, listing it as a blocker', () => {
        const readiness = computeOperationalReadiness(
            allCompleted([task('OPENING_CASH_BALANCES', 'READY'), task('OPENING_RECEIVABLES', 'BLOCKED')]),
            new Date(),
        );
        expect(readiness.modules.cashOps).toEqual({ ready: false, blockers: ['OPENING_CASH_BALANCES'] });
        expect(readiness.modules.sales).toEqual({ ready: false, blockers: ['OPENING_RECEIVABLES'] });
        expect(readiness.modules.accounting).toEqual({ ready: true, blockers: [] });
        expect(readiness.modules.bankOps).toEqual({ ready: true, blockers: [] });
    });

    it('treats a missing task row as a blocker — never ready by absence', () => {
        const readiness = computeOperationalReadiness([task('CURRENCIES', 'COMPLETED')], new Date());
        expect(readiness.modules.accounting.ready).toBe(false);
        expect(readiness.modules.accounting.blockers).toContain('CHART_OF_ACCOUNTS');
    });

    it('ignores not-required tasks (profile-gated, SKIPPED by the plan service)', () => {
        const tasks = allCompleted([task('OPENING_INVENTORY', 'BLOCKED', false)]);
        expect(computeOperationalReadiness(tasks, new Date()).modules.inventory.ready).toBe(true);
    });
});
