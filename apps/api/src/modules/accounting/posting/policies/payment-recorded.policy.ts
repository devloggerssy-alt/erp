import { BadRequestException, Injectable } from '@nestjs/common';
import { ReferenceType } from '@devloggers/db-prisma';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { PrismaTransactionClient } from '../contracts/prisma-tx';
import type { PaymentRecordedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

@Injectable()
export class PaymentRecordedPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(tx: PrismaTransactionClient, intent: PaymentRecordedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        const cashAccountId = (settings as any).defaultCashAccountId as string | null;
        if (!cashAccountId) {
            throw new BadRequestException(
                'No Cash account configured. Set a default Cash GL account in Financial Settings before posting payments.',
            );
        }

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
        const cashboxId = intent.cashboxId;
        const currencyId = intent.currencyId;
        const exchangeRate = intent.exchangeRate;
        const amount = intent.amount;

        return [
            {
                accountId: isReceipt ? cashAccountId : counterpartAccountId,
                debit: amountBase,
                credit: 0,
                description: null,
                sortOrder: 0,
                partyId: isReceipt ? null : intent.partyId,
                cashboxId: isReceipt ? cashboxId : null,
                currencyId,
                amount,
                exchangeRate,
            },
            {
                accountId: isReceipt ? counterpartAccountId : cashAccountId,
                debit: 0,
                credit: amountBase,
                description: null,
                sortOrder: 1,
                partyId: isReceipt ? intent.partyId : null,
                cashboxId: isReceipt ? null : cashboxId,
                currencyId,
                amount,
                exchangeRate,
            },
        ];
    }
}

@Injectable()
export class PaymentCancelledPolicy {
    readonly referenceType = ReferenceType.PAYMENT_CANCELLATION;
}
