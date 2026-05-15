import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { FiscalPeriod } from '@devloggers/db-prisma';
import { FiscalPeriodResponseDto } from '../dto';

@Injectable()
export class FiscalPeriodPresenter extends CrudPresenter<FiscalPeriod, FiscalPeriodResponseDto> {
    toResponse(entity: FiscalPeriod): FiscalPeriodResponseDto {
        return {
            id: entity.id,
            name: entity.name,
            startDate: entity.startDate.toISOString(),
            endDate: entity.endDate.toISOString(),
            status: entity.status,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
