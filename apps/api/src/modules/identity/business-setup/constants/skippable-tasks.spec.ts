import { SKIPPABLE_TASK_TYPES, isSkippableTask } from './skippable-tasks';
import { SETUP_TASK_TYPES } from './setup-task-graph';

describe('skippable setup tasks', () => {
    it('never allows skipping RECONCILIATION — it is the completion gate', () => {
        expect(isSkippableTask('RECONCILIATION')).toBe(false);
    });

    it('only lists known task types', () => {
        for (const type of SKIPPABLE_TASK_TYPES) {
            expect(SETUP_TASK_TYPES).toContain(type);
        }
    });
});
