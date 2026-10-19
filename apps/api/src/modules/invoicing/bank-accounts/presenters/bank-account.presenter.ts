import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { BankAccount } from '@devloggers/db-prisma';
import { toLocalizedString } from '@/common/i18n/localized-string';
import { BankAccountResponseDto } from '../dto';

@Injectable()
export class BankAccountPresenter extends CrudPresenter<BankAccount, BankAccountResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: BankAccount): BankAccountResponseDto {
        const name = toLocalizedString(entity.name) ?? { ar: '' };
        return {
            id: entity.id,
            code: entity.code,
            name: this.locale.resolve(name),
            nameI18n: name,
            currencyId: entity.currencyId,
            accountNumber: entity.accountNumber ?? null,
            bankName: entity.bankName ?? null,
            branchId: entity.branchId ?? null,
            balance: entity.balance as unknown as string,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
