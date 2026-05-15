import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@devloggers/backend-core';
import type { ChartOfAccount } from '@devloggers/db-prisma';
import { ChartOfAccountResponseDto } from '../dto';

@Injectable()
export class AccountPresenter extends CrudPresenter<ChartOfAccount, ChartOfAccountResponseDto> {
    toResponse(entity: ChartOfAccount): ChartOfAccountResponseDto {
        const e = entity as any;
        return {
            id: e.id,
            code: e.code,
            name: e.name,
            type: e.type,
            parentId: e.parentId ?? null,
            parentCode: e.parent?.code ?? null,
            parentName: e.parent?.name ?? null,
            isActive: e.isActive,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
        };
    }
}
