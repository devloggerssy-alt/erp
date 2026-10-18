import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { ChartOfAccount } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { ChartOfAccountResponseDto } from '../dto';
import type { AccountDetail, AccountListItem } from '../repositories/accounts.repository';

type AccountEntity = ChartOfAccount | AccountListItem | AccountDetail;

@Injectable()
export class AccountPresenter extends CrudPresenter<AccountEntity, ChartOfAccountResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: AccountEntity): ChartOfAccountResponseDto {
        const parent = 'parent' in entity ? entity.parent : undefined;
        const name = toLocalizedString(entity.name) ?? { ar: '' };
        const parentName = toLocalizedString(parent?.name);
        return {
            id: entity.id,
            code: entity.code,
            name: this.locale.resolve(name),
            nameI18n: name,
            type: entity.type,
            parentId: entity.parentId ?? null,
            parentCode: parent?.code ?? null,
            parentName: parentName ? this.locale.resolve(parentName) : null,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
