import { Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { ExpenseRecordedIntent } from '../contracts/posting-intent';

/**
 * Pure — every item's accountId is direct user input (CreateExpenseItemDto),
 * not a resolved GL policy, so there is nothing async to await here. See
 * this file's header comment in the plan for why that's not a violation of
 * "no accountId on intents".
 */
@Injectable()
export class ExpenseRecordedPolicy {
    buildLines(intent: ExpenseRecordedIntent): JournalLineDraft[] {
        const itemLines: JournalLineDraft[] = intent.items.map((item) => ({
            accountId: item.accountId,
            debit: item.amount,
            credit: 0,
            description: item.description,
            sortOrder: item.sortOrder,
        }));
        return [
            ...itemLines,
            {
                accountId: intent.cashboxAccountId,
                debit: 0,
                credit: intent.totalAmount,
                description: null,
                sortOrder: intent.items.length,
            },
        ];
    }
}

/** No line-builder — JournalPostingService.reverse mirrors the original entry. */
@Injectable()
export class ExpenseCancelledPolicy {
    readonly referenceType = ReferenceType.EXPENSE_CANCELLATION;
}
