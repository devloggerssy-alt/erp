import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { ChartOfAccount } from '@devloggers/db-prisma';
import type { LocalizedString } from '@devloggers/api-contracts';
import { ChartOfAccountResponseDto } from '../dto';

@Injectable()
export class AccountPresenter extends CrudPresenter<ChartOfAccount, ChartOfAccountResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: ChartOfAccount): ChartOfAccountResponseDto {
        const e = entity as any;
        const name = e.name as LocalizedString;
        const parentName = e.parent?.name as LocalizedString | undefined;
        return {
            id: e.id,
            code: e.code,
            name: this.locale.resolve(name),
            nameI18n: name,
            type: e.type,
            parentId: e.parentId ?? null,
            parentCode: e.parent?.code ?? null,
            parentName: parentName ? this.locale.resolve(parentName) : null,
            isActive: e.isActive,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
        };
    }
}
