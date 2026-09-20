import { Injectable } from '@nestjs/common';
import type { SetupTaskType } from '@devloggers/db-prisma';
import { SETUP_TASK_TYPES, SETUP_TASK_DEPENDENCIES, isTaskRequiredForProfile, type BusinessSetupProfileModules } from '../constants/setup-task-graph';
import { INSPECTION_KEY_BY_TASK_TYPE } from '../constants/discovery-completion';
import type { BusinessSetupInspection } from './business-setup-discovery.service';

export interface SetupTaskPlanItem {
    type: SetupTaskType;
    required: boolean;
    dependencies: SetupTaskType[];
    metadata?: Record<string, unknown>;
}

@Injectable()
export class BusinessSetupPlanService {
    generate(profile: BusinessSetupProfileModules, inspection: BusinessSetupInspection): SetupTaskPlanItem[] {
        return SETUP_TASK_TYPES.map((type) => {
            const inspectionKey = INSPECTION_KEY_BY_TASK_TYPE[type];
            return {
                type,
                required: isTaskRequiredForProfile(type, profile),
                dependencies: SETUP_TASK_DEPENDENCIES[type],
                metadata: inspectionKey ? { discovery: inspection[inspectionKey] } : undefined,
            };
        });
    }
}
