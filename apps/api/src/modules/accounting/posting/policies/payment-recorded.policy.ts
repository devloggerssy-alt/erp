import { BadRequestException, Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';
import type { PaymentRecordedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/** Absorbs payments.service.ts's account resolution + payment-journal.ts's line math. */
@Injectable()
export class PaymentRecordedPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(tx: PrismaTransactionClient, intent: PaymentRecordedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        const isReceipt = intent.type === 'RECEIPT';

        const party = intent.partyId
            ? await tx.party.findFirst({
                  where: { id: intent.partyId, tenantId: intent.tenantId },
                  select: { receivableAccountId: true, payableAccountId: true },
              })
            : null;

        const counterpartAccountId = isReceipt
            ? (party?.receivableAccountId ?? settings.defaultReceivableAccountId)
            : (party?.payableAccountId ?? settings.defaultPayableAccountId);

        if (!counterpartAccountId) {
            throw new BadRequestException(
                isReceipt
                    ? 'No Accounts Receivable account configured. Set a default in Financial Settings or on the party.'
                    : 'No Accounts Payable account configured. Set a default in Financial Settings or on the party.',
            );
        }

        const amountBase = round(intent.amount * intent.exchangeRate);

        return [
            {
                accountId: isReceipt ? intent.cashboxAccountId : counterpartAccountId,
                debit: amountBase,
                credit: 0,
                description: null,
                sortOrder: 0,
                partyId: isReceipt ? null : intent.partyId,
            },
            {
                accountId: isReceipt ? counterpartAccountId : intent.cashboxAccountId,
                debit: 0,
                credit: amountBase,
                description: null,
                sortOrder: 1,
                partyId: isReceipt ? intent.partyId : null,
            },
        ];
    }
}

/** No line-builder — JournalPostingService.reverse mirrors the original entry. */
@Injectable()
export class PaymentCancelledPolicy {
    readonly referenceType = ReferenceType.PAYMENT_CANCELLATION;
}
