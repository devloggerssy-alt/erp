import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialSettingsService } from '../../financial-settings/services/financial-settings.service';
import type { JournalLineDraft } from '../contracts/journal-line-draft';
import type { OpeningStockPostedIntent } from '../contracts/posting-intent';

function round(value: number): number {
    return Math.round(value * 10000) / 10000;
}

/**
 * Absorbs inventory.service.ts registerOpeningBalance's settings guard +
 * inventory-journal.ts's buildOpeningBalanceLines. Shares ReferenceType.OPENING_BALANCE
 * with OpeningBalancePolicy — see this task's Q1 note in the plan for why.
 */
@Injectable()
export class OpeningStockPolicy {
    constructor(private readonly financialSettingsService: FinancialSettingsService) {}

    async buildLines(intent: OpeningStockPostedIntent): Promise<JournalLineDraft[]> {
        const settings = await this.financialSettingsService.getOrThrow(intent.tenantId);
        if (!settings.defaultInventoryAccountId || !settings.defaultOpeningEquityAccountId) {
            throw new BadRequestException(
                'No default Inventory / Opening-Equity account configured in Financial Settings.',
            );
        }
        const amt = round(intent.totalValue);
        return [
            { accountId: settings.defaultInventoryAccountId, debit: amt, credit: 0, description: null, sortOrder: 0 },
            { accountId: settings.defaultOpeningEquityAccountId, debit: 0, credit: amt, description: null, sortOrder: 1 },
        ];
    }
}
