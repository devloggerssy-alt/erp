import { ApiProperty } from '@nestjs/swagger';
import { SetupTaskType } from '@devloggers/db-prisma';

export class NextSetupActionDto {
    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType' })
    type: SetupTaskType = SetupTaskType.CURRENCIES;

    @ApiProperty({ enum: ['READY', 'WAITING_FOR_DEPENDENCIES'], enumName: 'NextSetupActionReason' })
    reason: 'READY' | 'WAITING_FOR_DEPENDENCIES' = 'READY';

    @ApiProperty({ enum: SetupTaskType, enumName: 'SetupTaskType', isArray: true })
    blockedBy: SetupTaskType[] = [];
}
