import type { SetupTaskType } from '@devloggers/db-prisma';
import { SETUP_TASK_TYPES } from '../constants/setup-task-graph';

export interface NextSetupAction {
    type: SetupTaskType;
    reason: 'READY' | 'WAITING_FOR_DEPENDENCIES';
    blockedBy: SetupTaskType[];
}

interface ActionableTask {
    type: SetupTaskType;
    status: string;
    required: boolean;
    dependencies: SetupTaskType[];
}

/**
 * Picks the next required task in the canonical `SETUP_TASK_TYPES` order. When
 * none is READY yet, returns the first blocked task plus the dependencies that
 * are not terminal, which the hub renders as the "waiting on" explanation.
 */
export function selectNextAction(tasks: ActionableTask[]): NextSetupAction | null {
    const byType = new Map(tasks.map((task) => [task.type, task]));

    const open = SETUP_TASK_TYPES
        .map((type) => byType.get(type))
        .filter((task): task is ActionableTask => Boolean(task?.required))
        .filter((task) => task.status !== 'COMPLETED' && task.status !== 'SKIPPED');

    if (open.length === 0) return null;

    const ready = open.find((task) => task.status === 'READY');
    if (ready) return { type: ready.type, reason: 'READY', blockedBy: [] };

    const first = open[0];
    if (!first) return null;

    const blockedBy = first.dependencies.filter((dependency) => {
        const dependencyTask = byType.get(dependency);
        return !dependencyTask || (dependencyTask.status !== 'COMPLETED' && dependencyTask.status !== 'SKIPPED');
    });
    return { type: first.type, reason: 'WAITING_FOR_DEPENDENCIES', blockedBy };
}
