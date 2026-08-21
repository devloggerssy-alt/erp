import { BadRequestException, Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { ExpenseRecordedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

@Injectable()
export class ExpenseRecordedPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(intent: ExpenseRecordedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        const cashAccountId = (settings as any).defaultCashAccountId as string | null;
        if (!cashAccountId) {
            throw new BadRequestException(
                'No Cash account configured. Set a default Cash GL account in Financial Settings before posting expenses.',
            );
        }

        const exchangeRate = intent.exchangeRate;
        const currencyId = intent.currencyId;
        const cashboxId = intent.cashboxId;

        const itemLines: JournalLineDraft[] = intent.items.map((item) => ({
            accountId: item.accountId,
            debit: round(item.amount * exchangeRate),
            credit: 0,
            description: item.description,
            sortOrder: item.sortOrder,
            currencyId,
            amount: item.amount,
            exchangeRate,
        }));

        const totalBase = round(intent.totalAmount * exchangeRate);

        return [
            ...itemLines,
            {
                accountId: cashAccountId,
                debit: 0,
                credit: totalBase,
                description: null,
                sortOrder: intent.items.length,
                cashboxId,
                currencyId,
                amount: intent.totalAmount,
                exchangeRate,
            },
        ];
    }
}

@Injectable()
export class ExpenseCancelledPolicy {
    readonly referenceType = ReferenceType.EXPENSE_CANCELLATION;
}
