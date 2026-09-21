import { ApiProperty } from '@nestjs/swagger';
import { SetupTaskType } from '@devloggers/db-prisma';

export class ModuleReadinessDto {
    @ApiProperty({ type: 'boolean', example: true })
    ready: boolean = false;

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType', isArray: true })
    blockers: SetupTaskType[] = [];
}

export class OperationalReadinessModulesDto {
    @ApiProperty({ type: () => ModuleReadinessDto })
    accounting: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    cashOps: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    bankOps: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    inventory: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    sales: ModuleReadinessDto = new ModuleReadinessDto();

    @ApiProperty({ type: () => ModuleReadinessDto })
    purchasing: ModuleReadinessDto = new ModuleReadinessDto();
}

export class OperationalReadinessDto {
    @ApiProperty({ type: 'string', example: '2026-09-21T00:00:00.000Z' })
    computedAt: string = '';

    @ApiProperty({ type: () => OperationalReadinessModulesDto })
    modules: OperationalReadinessModulesDto = new OperationalReadinessModulesDto();
}
