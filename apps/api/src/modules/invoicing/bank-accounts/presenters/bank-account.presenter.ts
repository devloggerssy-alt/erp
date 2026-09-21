import { Injectable } from '@nestjs/common';
import { CrudPresenter, LocaleResolverService } from '@devloggers/backend-core';
import type { BankAccount } from '@devloggers/db-prisma';
import type { LocalizedString } from '@devloggers/api-contracts';
import { BankAccountResponseDto } from '../dto';

@Injectable()
export class BankAccountPresenter extends CrudPresenter<BankAccount, BankAccountResponseDto> {
    constructor(private readonly locale: LocaleResolverService) {
        super();
    }

    toResponse(entity: BankAccount): BankAccountResponseDto {
        const name = entity.name as unknown as LocalizedString;
        return {
            id: entity.id,
            code: entity.code,
            name: this.locale.resolve(name),
            nameI18n: name as any,
            currencyId: entity.currencyId,
            accountNumber: entity.accountNumber ?? null,
            bankName: entity.bankName ?? null,
            balance: entity.balance as unknown as string,
            isActive: entity.isActive,
            createdAt: entity.createdAt.toISOString(),
            updatedAt: entity.updatedAt.toISOString(),
        };
    }
}
